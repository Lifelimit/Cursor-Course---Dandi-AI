import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { resolvePlan } from "@/lib/constants";
import {
  getBillingPeriodDisplay,
  getDurableUsageLogs,
  getDisplayUsageCount,
  getDisplayUsageCounts,
  getActiveRepositoryCount,
  getRecentUsageDates,
  getStripePaymentDisplay,
  getStripeSubscriptionDisplay,
  getTopReposFromLogs,
  getUsagePerformanceMetrics,
  reconcileProfileBillingFromStripe,
  summarizeDailyLogs,
  BillingDataUnavailableError,
  UsageDataUnavailableError,
} from "@/lib/services/usage-billing.service";
import { getUsagePeriod } from "@/lib/utils/usage-period";
import type { UsageData } from "@/types/usage";

const privateNoStoreHeaders = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: privateNoStoreHeaders },
      );
    }
    const userId = user.id;

    // 1. Fetch profile and API keys in parallel; Redis display data is best-effort below
    const now = new Date();
    const currentMonth = getUsagePeriod(now).key;
    const includeBilling = new URL(request.url).searchParams.get("scope") !== "usage";

    const [profileRes, keysRes] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("plan, billing_next_date, billing_interval, stripe_customer_id, stripe_subscription_id, stripe_scheduled_plan, stripe_scheduled_plan_date")
        .eq("id", userId)
        .single(),
      supabaseAdmin
        .from("api_keys")
        .select("id, name, key_type, usage_count, monthly_limit, is_active, alert_threshold, alert_channels, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
    ]);

    const profileData = profileRes.data;
    const keys = keysRes.data;
    const keysError = keysRes.error;

    if (keysError) throw new Error(keysError.message);

    let billingProfile = profileData;
    if (includeBilling && billingProfile?.stripe_customer_id) {
      const reconciledProfile = await reconcileProfileBillingFromStripe(userId, billingProfile);
      if (reconciledProfile) {
        billingProfile = { ...billingProfile, ...reconciledProfile };
      }
    }

    let plan = "Hobby";
    if (billingProfile?.plan) {
      plan = billingProfile.plan;
    }

    const resolved = resolvePlan(plan);
    // Use numeric limit directly from constants — no regex parsing needed
    const monthlyLimit = resolved.monthlyRequests;

    const userUsage = await getDisplayUsageCount(`usage:user:${userId}:${currentMonth}`);
    const logs = await getDurableUsageLogs(userId, now);

    // 2. Fetch per-key usage from Redis
    const keyUsageCounts = await getDisplayUsageCounts(keys ?? [], currentMonth);

    // 3. Process logs (Hot Analytics)
    const { avgLatency, successRate } = getUsagePerformanceMetrics(logs);

    // 5. Process data for trends and top repos
    const dates = getRecentUsageDates(now);

    const processedKeys = (keys || []).map((key, index) => {
      const keyLogs = (logs || []).filter((l) => l.keyId === key.id);
      const actualUsage = keyUsageCounts[index] || 0;
      
      // Daily trend
      const dailyTrend = dates.map((date) => summarizeDailyLogs(date, keyLogs));

      // Top repos for this key
      const topRepos = getTopReposFromLogs(keyLogs, 5);

      const limit = key.monthly_limit ?? monthlyLimit;
      const pctLimit = limit ?? resolved.maxLimitCap;

      return {
        ...key,
        usage_count: actualUsage,
        monthly_limit: limit,
        pct: pctLimit ? Math.min((actualUsage / pctLimit) * 100, 100) : 0,
        dailyTrend,
        topRepos
      };
    });

    // 6. Global aggregates
    const totalUsage = userUsage;
    
    const globalTopRepos = getTopReposFromLogs(logs || [], 10);
    const activeRepositoryCount = getActiveRepositoryCount(logs || []);

    // Global Daily Trends (requests, latency, success, error) over the last 30 days
    const dailyAnalytics = dates.map(date => {
      return summarizeDailyLogs(date, logs || []);
    });

    // 7. Calculate billing / quota reset dates
    const stripeCustomerId = billingProfile?.stripe_customer_id;
    const { resetDate, nextInvoiceDate } = await getBillingPeriodDisplay({
      profile: billingProfile,
      now,
      selfHeal: includeBilling
        ? {
            mode: "await",
            userId,
            periodEndSource: "usage-api",
            logContext: "API route",
          }
        : undefined,
    });

    const billingProjection = includeBilling
      ? await Promise.all([
          getStripePaymentDisplay(stripeCustomerId),
          getStripeSubscriptionDisplay(billingProfile?.stripe_subscription_id),
        ])
      : null;
    const paymentDisplay = billingProjection?.[0];
    const subscriptionDisplay = billingProjection?.[1] || null;

    const responseBody: UsageData = {
      plan: billingProfile?.plan || "Hobby",
      keys: processedKeys,
      totalUsage,
      globalTopRepos,
      activeRepositoryCount,
      avgLatency,
      successRate,
      resetDate,
      nextInvoiceDate,
      paymentMethods: paymentDisplay?.paymentMethods,
      customerBalance: paymentDisplay?.customerBalance,
      dailyAnalytics,
      scheduledPlan: billingProfile?.stripe_scheduled_plan || null,
      scheduledPlanDate: billingProfile?.stripe_scheduled_plan_date || null,
      billingInterval: subscriptionDisplay?.interval || (billingProfile?.billing_interval === "year" ? "year" : "month"),
      subscriptionStatus: subscriptionDisplay?.status || null,
      cancelAtPeriodEnd: subscriptionDisplay?.cancelAtPeriodEnd || false,
    };

    return NextResponse.json(responseBody, {
      headers: privateNoStoreHeaders,
    });
  } catch (err) {
    console.error("Usage analytics request failed.");
    const status = err instanceof UsageDataUnavailableError || err instanceof BillingDataUnavailableError ? 503 : 500;
    return NextResponse.json(
      { error: "Usage analytics are temporarily unavailable. Please try again." },
      { status, headers: privateNoStoreHeaders },
    );
  }
}
