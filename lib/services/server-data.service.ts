import { createClient } from "@/lib/supabase/server";
import { ApiKeyApiResponse } from "@/types/api";
import { stripe } from "@/lib/stripe";
import { redis } from "@/lib/redis";
import { PLAN_DETAILS } from "@/lib/constants";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function getServerApiKeys(): Promise<{ keys: ApiKeyApiResponse[], plan: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return { keys: [], plan: "Hobby" };

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single();

    const plan = profile?.plan || "Hobby";
    const planDetail = PLAN_DETAILS[plan as keyof typeof PLAN_DETAILS] || PLAN_DETAILS["Hobby"];
    const monthlyLimit = planDetail.monthlyLimit;


    const { data, error } = await supabase
      .from("api_keys")
      .select("id,name,key_value,key_type,usage_count,monthly_limit,created_at,is_active,alert_threshold,alert_channels,alert_phone")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return { keys: [], plan: plan || "Hobby" };
    
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    let keyUsageCounts: number[] = [];
    if (data && data.length > 0) {
      const pipeline = redis.pipeline();
      data.forEach(k => {
        pipeline.get(`usage:key:${k.id}:${currentMonth}`);
      });
      keyUsageCounts = await pipeline.exec<number[]>();
    }

    // Fetch user activity logs from Redis to compute trend details
    const logKey = `logs:user:${user.id}:${currentMonth}`;
    const redisLogsStr = await redis.lrange(logKey, 0, -1);
    const logs = redisLogsStr.map(log => (typeof log === "string" ? JSON.parse(log) : log) as RedisUsageLog);

    const now = new Date();
    const dates = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      return d.toISOString().split("T")[0];
    }).reverse();

    // Prioritize the key's individual monthly_limit if set, otherwise fallback to plan limit
    const keysMapped = (data ?? []).map((k, index) => {
      const actualKeyUsage = keyUsageCounts[index] || 0;
      const limit = k.monthly_limit ?? monthlyLimit;
      const keyLogs = (logs || []).filter(l => l.keyId === k.id);
      
      const trendMap = keyLogs.reduce((acc: Record<string, number>, log) => {
        const date = log.usedAt.split("T")[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      const dailyTrend = dates.map(date => ({
        date,
        count: trendMap[date] || 0
      }));

      return {
        ...k,
        usage_count: actualKeyUsage,
        monthly_limit: limit,
        dailyTrend
      };
    });

    return {
      keys: keysMapped as unknown as ApiKeyApiResponse[],
      plan
    };
  } catch {
    return { keys: [], plan: "Hobby" };
  }
}

interface RedisUsageLog {
  keyId: string;
  usedAt: string;
  status: string;
  latencyMs: number;
  repoUrl?: string;
}

export async function getServerUsageData() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const userId = user.id;

    // 1. Fetch user profile to get plan, Stripe details, and calculate limits
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, billing_next_date, stripe_customer_id, stripe_subscription_id")
      .eq("id", userId)
      .single();

    const plan = profile?.plan || "Hobby";
    const planDetail = PLAN_DETAILS[plan as keyof typeof PLAN_DETAILS] || PLAN_DETAILS["Hobby"];
    const monthlyLimit = planDetail.monthlyLimit;


    // 2. Fetch current month's usage from Redis
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const usageKey = `usage:user:${userId}:${currentMonth}`;
    const totalUsage = (await redis.get<number>(usageKey)) || 0;

    // 3. Fetch hot logs from Redis
    const logKey = `logs:user:${userId}:${currentMonth}`;
    const redisLogsStr = await redis.lrange(logKey, 0, -1);
    const logs = redisLogsStr.map(log => (typeof log === "string" ? JSON.parse(log) : log) as RedisUsageLog);

    // 4. Fetch all API keys for the user
    const { data: keys, error: keysError } = await supabase
      .from("api_keys")
      .select("id, name, key_value, key_type, is_active, monthly_limit, alert_threshold, alert_channels, alert_phone, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (keysError) throw new Error(keysError.message);

    // 5. Fetch per-key usage from Redis for accurate counts
    let keyUsageCounts: number[] = [];
    if (keys && keys.length > 0) {
      const pipeline = redis.pipeline();
      keys.forEach(k => {
        pipeline.get(`usage:key:${k.id}:${currentMonth}`);
      });
      keyUsageCounts = await pipeline.exec<number[]>();
    }

    const now = new Date();
    const dates = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      return d.toISOString().split("T")[0];
    }).reverse();

    const processedKeys = (keys || []).map((key, index) => {
      const keyLogs = (logs || []).filter(l => l.keyId === key.id);
      
      // Daily trend from Redis logs
      const trendMap = keyLogs.reduce((acc: Record<string, number>, log) => {
        const date = log.usedAt.split("T")[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      const dailyTrend = dates.map(date => ({
        date,
        count: trendMap[date] || 0
      }));

      const actualKeyUsage = keyUsageCounts[index] || 0;
      const limit = key.monthly_limit ?? monthlyLimit;

      return {
        ...key,
        usage_count: actualKeyUsage,
        monthly_limit: limit,
        pct: limit ? Math.min((actualKeyUsage / limit) * 100, 100) : 0,
        dailyTrend
      };
    });

    // 6. Global aggregates and performance metrics
    const totalLogs = (logs || []).length;
    const successfulLogs = (logs || []).filter(l => l.status === "success").length;
    const totalLatency = (logs || []).reduce((acc, l) => acc + (l.latencyMs || 0), 0);
    
    const avgLatency = totalLogs > 0 ? Math.round(totalLatency / totalLogs) : 0;
    const successRate = totalLogs > 0 ? (successfulLogs / totalLogs) * 100 : 0;

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

    // 7. Calculate billing dates
    let resetDate = null;
    let nextInvoiceDate = null;
    const stripeCustomerId = profile?.stripe_customer_id;
    let stripeSubscriptionId = profile?.stripe_subscription_id;

    if (!profile?.billing_next_date && (stripeSubscriptionId || stripeCustomerId)) {
      try {
        let activeSubscription: Stripe.Subscription | null = null;
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
          const periodEnd = activeSubscription.items?.data?.[0]?.current_period_end || activeSubscription.billing_cycle_anchor;
          const renewalDate = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
          nextInvoiceDate = renewalDate;
          
          if (renewalDate) {
            // Heal the database profile asynchronously
            await supabaseAdmin
              .from("profiles")
              .update({ 
                billing_next_date: renewalDate,
                stripe_subscription_id: stripeSubscriptionId || undefined
              })
              .eq("id", userId);
          }
        }
      } catch (err) {
        console.warn("⚠️ Failed to self-heal next billing date via Stripe in server-data:", err);
      }
    } else if (profile?.billing_next_date) {
      nextInvoiceDate = profile.billing_next_date;
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
        resetDate = nextInvoiceDate;
      }
    }

    // 8. Fetch payment methods
    let paymentMethods: {
      id: string;
      brand: string;
      last4: string;
      expiry: string;
      isDefault: boolean;
    }[] = [];
    if (stripeCustomerId) {
      try {
        const methods = await stripe.paymentMethods.list({
          customer: stripeCustomerId,
          type: "card",
        });
        
        const customer = await stripe.customers.retrieve(stripeCustomerId);
        if (customer && !customer.deleted) {
          const defaultMethodId = customer.invoice_settings?.default_payment_method;

          paymentMethods = methods.data.map((pm, idx) => ({
            id: pm.id,
            brand: pm.card?.brand || "Card",
            last4: pm.card?.last4 || "****",
            expiry: pm.card ? `${pm.card.exp_month}/${pm.card.exp_year}` : "N/A",
            isDefault: defaultMethodId ? pm.id === defaultMethodId : idx === 0
          }));
        }
      } catch {
        // Silent fail for Stripe fetch
      }
    }

    return {
      plan,
      keys: processedKeys,
      totalUsage,
      globalTopRepos,
      avgLatency,
      successRate,
      resetDate,
      nextInvoiceDate,
      paymentMethods,
      stripeCustomerId
    };
  } catch (err) {
    console.error("getServerUsageData error:", err);
    return null;
  }
}
