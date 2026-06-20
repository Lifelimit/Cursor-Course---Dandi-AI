import { createClient } from "@/lib/supabase/server";
import { ApiKeyApiResponse } from "@/types/api";
import { resolvePlan } from "@/lib/constants";
import {
  buildDailyUsageTrend,
  getBillingPeriodDisplay,
  getDisplayUsageCount,
  getDisplayUsageCounts,
  getDisplayUsageLogs,
  getRecentUsageDates,
  getStripePaymentDisplay,
  getTopReposFromLogs,
  getUsagePerformanceMetrics,
  summarizeDailyLogs,
} from "@/lib/services/usage-billing.service";
import type { ServerUsageData } from "@/types/usage";

export { calculateNextInvoiceDate, calculateResetDate } from "@/lib/services/usage-billing.service";

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
    const logs = await getDisplayUsageLogs(logKey, 0, -1, { requireKeyId: true });

    const dates = getRecentUsageDates();

    // Prioritize the key's individual monthly_limit if set, otherwise fallback to plan limit
    const keysMapped = (data ?? []).map((k, index) => {
      const actualKeyUsage = keyUsageCounts[index] || 0;
      const limit = k.monthly_limit ?? monthlyLimit;
      const keyLogs = (logs || []).filter(l => l.keyId === k.id);
      
      const dailyTrend = buildDailyUsageTrend(dates, keyLogs, actualKeyUsage);

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

export async function getServerUsageData(): Promise<ServerUsageData | null> {
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
    const logs = await getDisplayUsageLogs(logKey, 0, -1, { requireKeyId: true });

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
    const dates = getRecentUsageDates(now);

    const processedKeys = (keys || []).map((key, index) => {
      const keyLogs = (logs || []).filter(l => l.keyId === key.id);
      
      const actualKeyUsage = keyUsageCounts[index] || 0;
      const limit = key.monthly_limit ?? monthlyLimit;
      const dailyTrend = buildDailyUsageTrend(dates, keyLogs, actualKeyUsage);

      return {
        ...key,
        usage_count: actualKeyUsage,
        monthly_limit: limit,
        pct: limit ? Math.min((actualKeyUsage / limit) * 100, 100) : 0,
        dailyTrend
      };
    });

    // 6. Global aggregates and performance metrics
    const { avgLatency, successRate } = getUsagePerformanceMetrics(logs || []);
    const globalTopRepos = getTopReposFromLogs(logs || [], 10);

    const dailyAnalytics = dates.map(date => summarizeDailyLogs(date, logs || []));

    // 7. Calculate billing dates
    const stripeCustomerId = profile?.stripe_customer_id;

    const { resetDate, nextInvoiceDate } = await getBillingPeriodDisplay({
      profile,
      now,
      selfHeal: {
        mode: "background",
        updateBy: "id",
        userId,
        periodEndSource: "server-data",
        logContext: "server-data helper",
      },
    });

    // 8. Fetch payment methods
    const { paymentMethods, customerBalance } = await getStripePaymentDisplay(stripeCustomerId);

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
