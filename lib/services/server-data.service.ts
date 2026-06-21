import { createClient } from "@/lib/supabase/server";
import { ApiKeyApiResponse } from "@/types/api";
import { resolvePlan } from "@/lib/constants";
import {
  buildDailyUsageTrend,
  buildUsageSummaryData,
  getDisplayUsageCounts,
  getDisplayUsageLogs,
  getRecentUsageDates,
  getStripePaymentDisplay,
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
    const now = new Date();
    const { profile, keys } = await getServerUsageInputs(supabase, userId);
    const summaryData = await buildUsageSummaryData({
      userId,
      profile,
      keys,
      now,
      logOptions: { requireKeyId: true },
      selfHeal: {
        mode: "background",
        updateBy: "id",
        userId,
        periodEndSource: "server-data",
        logContext: "server-data helper",
      },
    });

    // 2. Fetch payment methods
    const stripeCustomerId = profile?.stripe_customer_id;
    const { paymentMethods, customerBalance } = await getStripePaymentDisplay(stripeCustomerId);

    return {
      ...summaryData,
      plan: summaryData.plan || "Hobby",
      paymentMethods,
      stripeCustomerId,
      customerBalance,
    };
  } catch (err) {
    console.error("getServerUsageData error:", err);
    return null;
  }
}

async function getServerUsageInputs(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const [profileRes, keysRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("plan, billing_next_date, billing_interval, stripe_customer_id, stripe_subscription_id, stripe_scheduled_plan, stripe_scheduled_plan_date")
      .eq("id", userId)
      .single(),
    supabase
      .from("api_keys")
      .select("id, name, key_value, key_type, is_active, monthly_limit, alert_threshold, alert_channels, alert_phone, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  if (keysRes.error) throw new Error(keysRes.error.message);

  return {
    profile: profileRes.data,
    keys: keysRes.data ?? [],
  };
}

export async function getServerUsageSummaryData(): Promise<ServerUsageData | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { profile, keys } = await getServerUsageInputs(supabase, user.id);
    const summaryData = await buildUsageSummaryData({
      userId: user.id,
      profile,
      keys,
      logOptions: { requireKeyId: true },
    });

    return {
      ...summaryData,
      plan: summaryData.plan || "Hobby",
      paymentMethods: [],
      stripeCustomerId: profile?.stripe_customer_id || null,
      customerBalance: 0,
    };
  } catch (err) {
    console.error("getServerUsageSummaryData error:", err);
    return null;
  }
}
