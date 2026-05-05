import { createClient } from "@/lib/supabase/server";
import { ApiKeyApiResponse } from "@/types/api";
import { stripe } from "@/lib/stripe";
import { Redis } from "@upstash/redis";
import { PLAN_DETAILS } from "@/lib/constants";

const redis = Redis.fromEnv();

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
    let monthlyLimit: number | null = null;
    if (planDetail.features[0].includes("Unlimited")) {
      monthlyLimit = null;
    } else {
      const match = planDetail.features[0].match(/(\d+,?\d+)/);
      if (match) {
        monthlyLimit = parseInt(match[0].replace(",", ""));
      }
    }

    const { data, error } = await supabase
      .from("api_keys")
      .select("id,name,key_value,key_type,usage_count,monthly_limit,created_at,is_active,alert_threshold,alert_channels,alert_phone")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return { keys: [], plan: plan || "Hobby" };
    
    // We can't easily get per-key usage from Redis as it's tracked per user,
    // so we return the keys with the global monthly limit applied to them visually
    return {
      keys: (data ?? []).map(k => ({
        ...k,
        monthly_limit: monthlyLimit
      })) as ApiKeyApiResponse[],
      plan
    };
  } catch {
    return { keys: [], plan: "Hobby" };
  }
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
      .select("plan, billing_next_date, stripe_customer_id")
      .eq("id", userId)
      .single();

    const plan = profile?.plan || "Hobby";
    const planDetail = PLAN_DETAILS[plan as keyof typeof PLAN_DETAILS] || PLAN_DETAILS["Hobby"];
    let monthlyLimit: number | null = null;
    if (planDetail.features[0].includes("Unlimited")) {
      monthlyLimit = null;
    } else {
      const match = planDetail.features[0].match(/(\d+,?\d+)/);
      if (match) {
        monthlyLimit = parseInt(match[0].replace(",", ""));
      }
    }

    // 2. Fetch current month's usage from Redis
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const usageKey = `usage:user:${userId}:${currentMonth}`;
    const totalUsage = (await redis.get<number>(usageKey)) || 0;

    // 3. Fetch hot logs from Redis
    const logKey = `logs:user:${userId}:${currentMonth}`;
    const redisLogsStr = await redis.lrange(logKey, 0, -1);
    const logs = redisLogsStr.map(log => typeof log === "string" ? JSON.parse(log) : log);

    // 4. Fetch all API keys for the user
    const { data: keys, error: keysError } = await supabase
      .from("api_keys")
      .select("id, name, key_type, is_active, alert_threshold, alert_channels, alert_phone, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (keysError) throw new Error(keysError.message);

    // 5. Process data for trends and top repos
    const now = new Date();
    const dates = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      return d.toISOString().split("T")[0];
    }).reverse();

    const processedKeys = (keys || []).map(key => {
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

      // Approximate usage count per key from hot logs (capped at 100 by redis ltrim)
      const approxUsageCount = keyLogs.length;

      return {
        ...key,
        usage_count: approxUsageCount,
        monthly_limit: monthlyLimit,
        pct: monthlyLimit ? Math.min((totalUsage / monthlyLimit) * 100, 100) : 0,
        dailyTrend
      };
    });

    // 6. Global aggregates
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
    let stripeCustomerId = profile?.stripe_customer_id;

    if (profile?.billing_next_date) {
      nextInvoiceDate = profile.billing_next_date;
      
      try {
        const nextBilling = new Date(profile.billing_next_date);
        const now = new Date();
        
        if (nextBilling.getTime() - now.getTime() > 32 * 24 * 60 * 60 * 1000) {
          const resetDay = nextBilling.getDate();
          let nextReset = new Date(now.getFullYear(), now.getMonth(), resetDay);
          if (nextReset <= now) {
            nextReset = new Date(now.getFullYear(), now.getMonth() + 1, resetDay);
          }
          resetDate = nextReset.toISOString();
        } else {
          resetDate = profile.billing_next_date;
        }
      } catch {
        resetDate = profile.billing_next_date;
      }
    }

    // 8. Fetch payment methods
    let paymentMethods: any[] = [];
    if (stripeCustomerId) {
      try {
        const methods = await stripe.paymentMethods.list({
          customer: stripeCustomerId,
          type: "card",
        });
        
        const customer = await stripe.customers.retrieve(stripeCustomerId) as any;
        const defaultMethodId = customer.invoice_settings?.default_payment_method;

        paymentMethods = methods.data.map(pm => ({
          id: pm.id,
          brand: pm.card?.brand || "Card",
          last4: pm.card?.last4 || "****",
          expiry: pm.card ? `${pm.card.exp_month}/${pm.card.exp_year}` : "N/A",
          isDefault: pm.id === defaultMethodId
        }));
      } catch {
        // Silent fail for Stripe fetch
      }
    }

    return {
      plan,
      keys: processedKeys,
      totalUsage,
      globalTopRepos,
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
