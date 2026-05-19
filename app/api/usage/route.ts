import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { stripe } from "@/lib/stripe";
import { getAuthenticatedUserId } from "@/lib/services/auth.service";

import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();

    // 1. Fetch all API keys for the user
    const { data: keys, error: keysError } = await supabaseAdmin
      .from("api_keys")
      .select("id, name, key_type, usage_count, monthly_limit, is_active, alert_threshold, alert_channels, alert_phone, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (keysError) throw new Error(keysError.message);

    // 1b. Fetch real-time usage from Redis
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const pipeline = redis.pipeline();
    (keys || []).forEach(k => {
      pipeline.get(`usage:key:${k.id}:${currentMonth}`);
    });
    const keyUsageCounts = await pipeline.exec<number[]>();
    const userUsage = await redis.get<number>(`usage:user:${userId}:${currentMonth}`) || 0;

    // 2. Fetch usage logs from Redis (Hot Analytics)
    const logKey = `logs:user:${userId}:${currentMonth}`;
    const rawLogs = await redis.lrange(logKey, 0, 99);
    const logs = rawLogs.map((l: any) => typeof l === 'string' ? JSON.parse(l) : l);

    // Calculate Global Performance Metrics
    const totalLogs = logs.length;
    const successfulLogs = logs.filter((l: any) => l.status === "success").length;
    const totalLatency = logs.reduce((acc: number, l: any) => acc + (l.latencyMs || 0), 0);
    
    const avgLatency = totalLogs > 0 ? Math.round(totalLatency / totalLogs) : 0;
    const successRate = totalLogs > 0 ? (successfulLogs / totalLogs) * 100 : 0;

    // 3. Process data for trends and top repos
    const now = new Date();
    const dates = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      return d.toISOString().split("T")[0];
    }).reverse();

    const processedKeys = (keys || []).map((key, index) => {
      const keyLogs = (logs || []).filter((l: any) => l.keyId === key.id);
      const actualUsage = keyUsageCounts[index] || 0;
      
      // Daily trend
      const trendMap = keyLogs.reduce((acc: Record<string, number>, log: any) => {
        const date = log.usedAt.split("T")[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      const dailyTrend = dates.map(date => ({
        date,
        count: trendMap[date] || 0
      }));

      // Top repos for this key
      const repoMap = keyLogs.reduce((acc: Record<string, number>, log: any) => {
        if (log.repoUrl) {
          acc[log.repoUrl] = (acc[log.repoUrl] || 0) + 1;
        }
        return acc;
      }, {});

      const topRepos = Object.entries(repoMap)
        .map(([repo_url, count]) => ({ repo_url, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        ...key,
        usage_count: actualUsage,
        pct: key.monthly_limit ? Math.min((actualUsage / key.monthly_limit) * 100, 100) : 0,
        dailyTrend,
        topRepos
      };
    });

    // 4. Global aggregates
    const totalUsage = userUsage;
    
    const globalRepoMap = (logs || []).reduce((acc: Record<string, number>, log) => {
      if (log.repo_url) {
        acc[log.repo_url] = (acc[log.repo_url] || 0) + 1;
      }
      return acc;
    }, {});

    const globalTopRepos = Object.entries(globalRepoMap)
      .map(([repo_url, count]) => ({ repo_url, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 5. Fetch profile and calculate dates
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email;
    let resetDate = null;
    let nextInvoiceDate = null;
    let profileData: { plan: string | null; billing_next_date: string | null; stripe_customer_id: string | null } | null = null;

    if (userEmail) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("plan, billing_next_date, stripe_customer_id")
        .eq("email", userEmail)
        .single();
      
      profileData = profile;
      if (profileData?.billing_next_date) {
        nextInvoiceDate = profileData.billing_next_date || null;
        try {
          if (profileData.billing_next_date) {
            const nextBilling = new Date(profileData.billing_next_date);
            const now = new Date();
            
            if (nextBilling.getTime() - now.getTime() > 32 * 24 * 60 * 60 * 1000) {
              const resetDay = nextBilling.getDate();
              let nextReset = new Date(now.getFullYear(), now.getMonth(), resetDay);
              if (nextReset <= now) {
                nextReset = new Date(now.getFullYear(), now.getMonth() + 1, resetDay);
              }
              resetDate = nextReset.toISOString();
            } else {
              resetDate = profileData.billing_next_date;
            }
          }
        } catch (_err) {
          // Date calculation failed, fallback handled by null resetDate
        }
      }
    }

    let paymentMethods: { id: string; brand: string; last4: string; expiry: string; isDefault: boolean }[] = [];
    if (profileData?.stripe_customer_id) {
      try {
        const methods = await stripe.paymentMethods.list({
          customer: profileData.stripe_customer_id,
          type: "card",
        });
        
        // Get the customer to find the default payment method
        const customer = await stripe.customers.retrieve(profileData.stripe_customer_id) as unknown as Record<string, unknown>;
        const invoiceSettings = customer.invoice_settings as Record<string, unknown> | undefined;
        const defaultMethodId = invoiceSettings?.default_payment_method as string | undefined;

        paymentMethods = methods.data.map((pm, idx) => ({
          id: pm.id,
          brand: pm.card?.brand || "Card",
          last4: pm.card?.last4 || "****",
          expiry: pm.card ? `${pm.card.exp_month}/${pm.card.exp_year}` : "N/A",
          isDefault: defaultMethodId ? pm.id === defaultMethodId : idx === 0
        }));
      } catch (_err) {
        // Silent error, return empty paymentMethods
      }
    }

    return NextResponse.json({
      plan: profileData?.plan || "Hobby",
      keys: processedKeys,
      totalUsage,
      globalTopRepos,
      avgLatency,
      successRate,
      resetDate,
      nextInvoiceDate,
      paymentMethods
    });
  } catch (err) {
    console.error("❌ Usage API: Critical failure:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
 
