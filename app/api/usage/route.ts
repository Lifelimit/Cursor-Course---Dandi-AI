import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { stripe } from "@/lib/stripe";
import { getAuthenticatedUserId } from "@/lib/services/auth.service";
import { PLAN_DETAILS } from "@/lib/constants";
import { redis } from "@/lib/redis";

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email;

    // 1. Fetch profile early to calculate fallback monthly limits
    let profileData: { plan: string | null; billing_next_date: string | null; stripe_customer_id: string | null; stripe_subscription_id?: string | null } | null = null;
    let plan = "Hobby";

    if (userEmail) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("plan, billing_next_date, stripe_customer_id, stripe_subscription_id")
        .eq("email", userEmail)
        .single();
      
      profileData = profile;
      if (profileData?.plan) {
        plan = profileData.plan;
      }
    }

    const planDetail = PLAN_DETAILS[plan as keyof typeof PLAN_DETAILS] ?? PLAN_DETAILS["Hobby"];
    // Use numeric limit directly from constants — no regex parsing needed
    const monthlyLimit = planDetail.monthlyLimit;

    // 2. Fetch all API keys for the user
    const { data: keys, error: keysError } = await supabaseAdmin
      .from("api_keys")
      .select("id, name, key_type, usage_count, monthly_limit, is_active, alert_threshold, alert_channels, alert_phone, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (keysError) throw new Error(keysError.message);

    // 3. Fetch real-time usage from Redis
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const pipeline = redis.pipeline();
    (keys || []).forEach(k => {
      pipeline.get(`usage:key:${k.id}:${currentMonth}`);
    });
    const keyUsageCounts = await pipeline.exec<number[]>();
    interface UsageLog {
      status: string;
      latencyMs?: number;
      keyId?: string;
      repoUrl?: string;
      usedAt: string;
      repo_url?: string;
    }

    const userUsage = await redis.get<number>(`usage:user:${userId}:${currentMonth}`) || 0;

    // 4. Fetch usage logs from Redis (Hot Analytics)
    const logKey = `logs:user:${userId}:${currentMonth}`;
    const rawLogs = await redis.lrange(logKey, 0, 99);
    const logs: UsageLog[] = rawLogs.map((l: string) => {
      try {
        return typeof l === 'string' ? JSON.parse(l) : l;
      } catch {
        return {} as UsageLog;
      }
    });

    // Calculate Global Performance Metrics
    const totalLogs = logs.length;
    const successfulLogs = logs.filter((l: UsageLog) => l.status === "success").length;
    const totalLatency = logs.reduce((acc: number, l: UsageLog) => acc + (l.latencyMs || 0), 0);
    
    const avgLatency = totalLogs > 0 ? Math.round(totalLatency / totalLogs) : 0;
    const successRate = totalLogs > 0 ? (successfulLogs / totalLogs) * 100 : 0;

    // 5. Process data for trends and top repos
    const now = new Date();
    const dates = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      return d.toISOString().split("T")[0];
    }).reverse();

    const processedKeys = (keys || []).map((key, index) => {
      const keyLogs = (logs || []).filter((l: UsageLog) => l.keyId === key.id);
      const actualUsage = keyUsageCounts[index] || 0;
      
      // Daily trend
      const trendMap = keyLogs.reduce((acc: Record<string, number>, log: UsageLog) => {
        const date = log.usedAt.split("T")[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      const dailyTrend = dates.map(date => ({
        date,
        count: trendMap[date] || 0
      }));

      // Top repos for this key
      const repoMap = keyLogs.reduce((acc: Record<string, number>, log: UsageLog) => {
        if (log.repoUrl) {
          acc[log.repoUrl] = (acc[log.repoUrl] || 0) + 1;
        }
        return acc;
      }, {});

      const topRepos = Object.entries(repoMap)
        .map(([repo_url, count]) => ({ repo_url, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const limit = key.monthly_limit ?? monthlyLimit;

      return {
        ...key,
        usage_count: actualUsage,
        monthly_limit: limit,
        pct: limit ? Math.min((actualUsage / limit) * 100, 100) : 0,
        dailyTrend,
        topRepos
      };
    });

    // 6. Global aggregates
    const totalUsage = userUsage;
    
    const globalRepoMap = (logs || []).reduce((acc: Record<string, number>, log) => {
      if (log.repoUrl) {
        acc[log.repoUrl] = (acc[log.repoUrl] || 0) + 1;
      }
      return acc;
    }, {});

    const globalTopRepos = Object.entries(globalRepoMap)
      .map(([repo_url, count]) => ({ repo_url, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 7. Calculate billing / quota reset dates
    let resetDate = null;
    let nextInvoiceDate = null;
    const stripeCustomerId = profileData?.stripe_customer_id;
    let stripeSubscriptionId = profileData?.stripe_subscription_id;

    if (!profileData?.billing_next_date && (stripeSubscriptionId || stripeCustomerId)) {
      try {
        let activeSubscription = null;
        if (stripeSubscriptionId) {
          activeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        } else if (stripeCustomerId) {
          const subs = await stripe.subscriptions.list({
            customer: stripeCustomerId,
            status: "active",
            limit: 1
          });
          if (subs.data.length > 0) {
            activeSubscription = subs.data[0];
            stripeSubscriptionId = activeSubscription.id;
          }
        }

        if (activeSubscription && activeSubscription.status === "active") {
          const periodEnd = (activeSubscription as unknown as { current_period_end?: number }).current_period_end || (activeSubscription as unknown as { items?: { data?: Array<{ current_period_end: number }> } }).items?.data?.[0]?.current_period_end;
          const renewalDate = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
          nextInvoiceDate = renewalDate;
          
          // Heal the database profile asynchronously
          if (userEmail && renewalDate) {
            await supabaseAdmin
              .from("profiles")
              .update({ 
                billing_next_date: renewalDate,
                stripe_subscription_id: stripeSubscriptionId || undefined
              })
              .eq("email", userEmail);
          }
        }
      } catch (err) {
        console.warn("⚠️ Failed to self-heal next billing date via Stripe in API route:", err);
      }
    } else if (profileData?.billing_next_date) {
      nextInvoiceDate = profileData.billing_next_date;
    }

    if (nextInvoiceDate) {
      try {
        const nextBilling = new Date(nextInvoiceDate);
        const now = new Date();
        
        if (nextBilling.getTime() - now.getTime() > 32 * 24 * 60 * 60 * 1000) {
          const resetDay = nextBilling.getDate();
          let nextReset = new Date(now.getFullYear(), now.getMonth(), resetDay);
          if (nextReset <= now) {
            nextReset = new Date(now.getFullYear(), now.getMonth() + 1, resetDay);
          }
          resetDate = nextReset.toISOString();
        } else {
          resetDate = nextInvoiceDate;
        }
      } catch {
        // Date calculation failed, fallback handled by null resetDate
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
      } catch {
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
