import { createClient } from "@/lib/supabase/server";
import { ApiKeyApiResponse } from "@/types/api";
import { stripe } from "@/lib/stripe";
import { redis } from "@/lib/redis";
import { resolvePlan } from "@/lib/constants";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

interface RedisUsageLog {
  keyId: string;
  usedAt: string;
  status: string;
  latencyMs: number;
  repoUrl?: string;
}

function parseRedisUsageLogs(rawLogs: unknown[]): RedisUsageLog[] {
  return rawLogs.flatMap((log): RedisUsageLog[] => {
    try {
      const parsed = typeof log === "string" ? JSON.parse(log) : log;
      if (!parsed || typeof parsed !== "object") return [];

      const usageLog = parsed as Partial<RedisUsageLog>;
      if (typeof usageLog.keyId !== "string" || typeof usageLog.usedAt !== "string") return [];

      return [{
        keyId: usageLog.keyId,
        usedAt: usageLog.usedAt,
        status: typeof usageLog.status === "string" ? usageLog.status : "",
        latencyMs: typeof usageLog.latencyMs === "number" ? usageLog.latencyMs : 0,
        repoUrl: typeof usageLog.repoUrl === "string" ? usageLog.repoUrl : undefined,
      }];
    } catch {
      return [];
    }
  });
}

function getUsageLogDate(log: RedisUsageLog) {
  return log.usedAt.split("T")[0];
}

function summarizeDailyLogs(date: string, logs: RedisUsageLog[]) {
  const dayLogs = logs.filter(log => getUsageLogDate(log) === date);
  const successCount = dayLogs.filter(log => log.status === "success").length;
  const errorCount = dayLogs.length - successCount;
  const totalLatency = dayLogs.reduce((acc, log) => acc + (log.latencyMs || 0), 0);
  const avgLatency = dayLogs.length > 0 ? Math.round(totalLatency / dayLogs.length) : 0;

  return {
    date,
    count: successCount,
    success: successCount,
    error: errorCount,
    avgLatency
  };
}

function reconcileDailyTrendToUsage(
  dailyTrend: ReturnType<typeof summarizeDailyLogs>[],
  usageCount: number
) {
  const totalSuccess = dailyTrend.reduce((acc, day) => acc + day.success, 0);
  if (totalSuccess === usageCount) return dailyTrend;

  if (totalSuccess === 0) {
    if (usageCount === 0 || dailyTrend.length === 0) return dailyTrend;
    return dailyTrend.map((day, index) => {
      if (index !== dailyTrend.length - 1) return day;
      return { ...day, count: usageCount, success: usageCount };
    });
  }

  let remainingSuccess = usageCount;
  return dailyTrend
    .slice()
    .reverse()
    .map(day => {
      const success = Math.min(day.success, remainingSuccess);
      remainingSuccess -= success;
      return { ...day, count: success, success };
    })
    .reverse();
}

async function getDisplayUsageCounts(keys: { id: string }[], currentMonth: string): Promise<number[]> {
  if (keys.length === 0) return [];

  try {
    const pipeline = redis.pipeline();
    keys.forEach(k => {
      pipeline.get(`usage:key:${k.id}:${currentMonth}`);
    });
    return (await pipeline.exec<number[]>()) || [];
  } catch (err) {
    console.warn("⚠️ Display Redis key usage read failed; using zero key usage:", err);
    return [];
  }
}

async function getDisplayUsageCount(key: string): Promise<number> {
  try {
    return (await redis.get<number>(key)) || 0;
  } catch (err) {
    console.warn("⚠️ Display Redis usage read failed; using zero usage:", err);
    return 0;
  }
}

async function getDisplayUsageLogs(key: string, start: number, stop: number): Promise<RedisUsageLog[]> {
  try {
    const rawLogs = await redis.lrange(key, start, stop);
    return parseRedisUsageLogs(rawLogs);
  } catch (err) {
    console.warn("⚠️ Display Redis log read failed; using empty usage logs:", err);
    return [];
  }
}

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
    const resolved = resolvePlan(plan);
    const monthlyLimit = resolved.monthlyRequests;


    const { data, error } = await supabase
      .from("api_keys")
      .select("id,name,key_value,key_type,usage_count,monthly_limit,created_at,is_active,alert_threshold,alert_channels,alert_phone")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return { keys: [], plan: plan || "Hobby" };

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const keyUsageCounts = await getDisplayUsageCounts(data ?? [], currentMonth);

    // Fetch user activity logs from Redis to compute trend details
    const logKey = `logs:user:${user.id}:${currentMonth}`;
    const logs = await getDisplayUsageLogs(logKey, 0, -1);

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
      
      const dailyTrend = reconcileDailyTrendToUsage(
        dates.map(date => summarizeDailyLogs(date, keyLogs)),
        actualKeyUsage
      );

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

export async function getServerUsageData() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const userId = user.id;

    // 1. Fetch user profile to get plan, Stripe details, and calculate limits
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, billing_next_date, billing_interval, stripe_customer_id, stripe_subscription_id")
      .eq("id", userId)
      .single();

    const plan = profile?.plan || "Hobby";
    const resolved = resolvePlan(plan);
    const monthlyLimit = resolved.monthlyRequests;


    // 2. Fetch current month's usage from Redis
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const usageKey = `usage:user:${userId}:${currentMonth}`;
    const totalUsage = await getDisplayUsageCount(usageKey);

    // 3. Fetch hot logs from Redis
    const logKey = `logs:user:${userId}:${currentMonth}`;
    const logs = await getDisplayUsageLogs(logKey, 0, -1);

    // 4. Fetch all API keys for the user
    const { data: keys, error: keysError } = await supabase
      .from("api_keys")
      .select("id, name, key_value, key_type, is_active, monthly_limit, alert_threshold, alert_channels, alert_phone, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (keysError) throw new Error(keysError.message);

    // 5. Fetch per-key usage from Redis for accurate counts
    const keyUsageCounts = await getDisplayUsageCounts(keys ?? [], currentMonth);

    const now = new Date();
    const dates = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      return d.toISOString().split("T")[0];
    }).reverse();

    const processedKeys = (keys || []).map((key, index) => {
      const keyLogs = (logs || []).filter(l => l.keyId === key.id);
      
      const actualKeyUsage = keyUsageCounts[index] || 0;
      const limit = key.monthly_limit ?? monthlyLimit;
      const dailyTrend = reconcileDailyTrendToUsage(
        dates.map(date => summarizeDailyLogs(date, keyLogs)),
        actualKeyUsage
      );

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

    const dailyAnalytics = dates.map(date => summarizeDailyLogs(date, logs || []));

    // 7. Calculate billing dates
    let resetDate = null;
    let nextInvoiceDate = null;
    const stripeCustomerId = profile?.stripe_customer_id;
    const stripeSubscriptionId = profile?.stripe_subscription_id;

    if (!profile?.billing_next_date && (stripeSubscriptionId || stripeCustomerId)) {
      // Trigger Stripe self-healing asynchronously to avoid blocking dashboard page rendering
      selfHealBillingDate(userId, stripeCustomerId || null, stripeSubscriptionId || null).catch(err => {
        console.error("❌ Unhandled rejection in billing self-healing:", err);
      });
    } else if (profile?.billing_next_date) {
      nextInvoiceDate = profile.billing_next_date;
    }

    nextInvoiceDate = calculateNextInvoiceDate(nextInvoiceDate, profile?.billing_interval || null, now);
    resetDate = calculateResetDate(nextInvoiceDate, now);

    // 8. Fetch payment methods
    let paymentMethods: {
      id: string;
      brand: string;
      last4: string;
      expiry: string;
      isDefault: boolean;
    }[] = [];
    let customerBalance = 0;
    if (stripeCustomerId) {
      try {
        const methods = await stripe.paymentMethods.list({
          customer: stripeCustomerId,
          type: "card",
        });
        
        const customer = await stripe.customers.retrieve(stripeCustomerId);
        if (customer && !customer.deleted) {
          const defaultMethodId = customer.invoice_settings?.default_payment_method;
          customerBalance = customer.balance || 0;

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
      stripeCustomerId,
      customerBalance,
      dailyAnalytics
    };
  } catch (err) {
    console.error("getServerUsageData error:", err);
    return null;
  }
}

/**
 * Asynchronously heals the next billing date for the user profile using Stripe.
 * Runs in the background to prevent blocking server-rendered dashboard data loads.
 */
async function selfHealBillingDate(
  userId: string,
  stripeCustomerId: string | null,
  stripeSubscriptionId: string | null
): Promise<void> {
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
      
      if (renewalDate) {
        // Heal the database profile asynchronously
        const { error } = await supabaseAdmin
          .from("profiles")
          .update({ 
            billing_next_date: renewalDate,
            stripe_subscription_id: stripeSubscriptionId || undefined
          })
          .eq("id", userId);
        
        if (error) {
          console.error("❌ Failed to update profile billing_next_date during self-healing:", error.message);
        }
      }
    }
  } catch (err) {
    console.warn("⚠️ Failed to self-heal next billing date via Stripe in server-data helper:", err);
  }
}

/**
 * Calculates the next quota reset date based on the user's subscription next billing/invoice date and the current time.
 */
export function calculateResetDate(nextInvoiceDate: string | null, now: Date): string {
  if (nextInvoiceDate) {
    try {
      const nextBilling = new Date(nextInvoiceDate);
      
      if (nextBilling <= now) {
        // Billing date is in the past (stale), calculate next occurrence of that billing day
        const resetDay = nextBilling.getDate();
        let nextReset = new Date(now.getFullYear(), now.getMonth(), resetDay);
        if (nextReset <= now) {
          nextReset = new Date(now.getFullYear(), now.getMonth() + 1, resetDay);
        }
        return nextReset.toISOString();
      } else if (nextBilling.getTime() - now.getTime() > 32 * 24 * 60 * 60 * 1000) {
        // Billing date is more than 32 days in the future (yearly plans), reset monthly
        const resetDay = nextBilling.getDate();
        let nextReset = new Date(now.getFullYear(), now.getMonth(), resetDay);
        if (nextReset <= now) {
          nextReset = new Date(now.getFullYear(), now.getMonth() + 1, resetDay);
        }
        return nextReset.toISOString();
      } else {
        // Billing date is monthly and in the future
        return nextInvoiceDate;
      }
    } catch {
      return nextInvoiceDate;
    }
  } else {
    // For Hobby/Free plans, or when billing date is missing, reset on 1st of next month
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toISOString();
  }
}

/**
 * Calculates the next invoice date based on the user's subscription next billing/invoice date, interval, and current time.
 */
export function calculateNextInvoiceDate(nextInvoiceDate: string | null, billingInterval: string | null, now: Date): string | null {
  if (!nextInvoiceDate) return null;
  try {
    const nextBilling = new Date(nextInvoiceDate);
    if (nextBilling <= now) {
      const resetDay = nextBilling.getDate();
      if (billingInterval === "year") {
        const nextInvoice = new Date(nextBilling);
        while (nextInvoice <= now) {
          nextInvoice.setFullYear(nextInvoice.getFullYear() + 1);
        }
        return nextInvoice.toISOString();
      } else {
        let nextInvoice = new Date(now.getFullYear(), now.getMonth(), resetDay);
        if (nextInvoice <= now) {
          nextInvoice = new Date(now.getFullYear(), now.getMonth() + 1, resetDay);
        }
        return nextInvoice.toISOString();
      }
    }
    return nextInvoiceDate;
  } catch {
    return nextInvoiceDate;
  }
}
