import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUserId } from "@/lib/services/auth.service";
import { resolvePlan } from "@/lib/constants";
import {
  buildDailyUsageTrend,
  getBillingPeriodDisplay,
  getDisplayUsageCount,
  getDisplayUsageCounts,
  getDisplayUsageLogs,
  getActiveRepositoryCount,
  getRecentUsageDates,
  getStripePaymentDisplay,
  getTopReposFromLogs,
  getUsagePerformanceMetrics,
  summarizeDailyLogs,
} from "@/lib/services/usage-billing.service";
import type { UsageData } from "@/types/usage";

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email;

    // 1. Fetch profile and API keys in parallel; Redis display data is best-effort below
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    const [profileRes, keysRes] = await Promise.all([
      userEmail
        ? supabaseAdmin
            .from("profiles")
            .select("plan, billing_next_date, billing_interval, stripe_customer_id, stripe_subscription_id, stripe_scheduled_plan, stripe_scheduled_plan_date")
            .eq("email", userEmail)
            .single()
        : Promise.resolve({ data: null }),
      supabaseAdmin
        .from("api_keys")
        .select("id, name, key_type, usage_count, monthly_limit, is_active, alert_threshold, alert_channels, alert_phone, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
    ]);

    const profileData = profileRes.data;
    const keys = keysRes.data;
    const keysError = keysRes.error;

    if (keysError) throw new Error(keysError.message);

    let plan = "Hobby";
    if (profileData?.plan) {
      plan = profileData.plan;
    }

    const resolved = resolvePlan(plan);
    // Use numeric limit directly from constants — no regex parsing needed
    const monthlyLimit = resolved.monthlyRequests;

    const userUsage = await getDisplayUsageCount(
      `usage:user:${userId}:${currentMonth}`,
      "⚠️ Display Redis usage read failed; using zero total usage:"
    );

    const logs = await getDisplayUsageLogs(`logs:user:${userId}:${currentMonth}`, 0, 99, {
      includeSnakeRepoUrl: true,
      warning: "⚠️ Display Redis log read failed; using empty usage analytics:",
    });

    // 2. Fetch per-key usage from Redis
    const keyUsageCounts = await getDisplayUsageCounts(keys ?? [], currentMonth);

    // 3. Process logs (Hot Analytics)
    const { avgLatency, successRate } = getUsagePerformanceMetrics(logs);

    // 5. Process data for trends and top repos
    const now = new Date();
    const dates = getRecentUsageDates(now);

    const processedKeys = (keys || []).map((key, index) => {
      const keyLogs = (logs || []).filter((l) => l.keyId === key.id);
      const actualUsage = keyUsageCounts[index] || 0;
      
      // Daily trend
      const dailyTrend = buildDailyUsageTrend(dates, keyLogs, actualUsage);

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
    const stripeCustomerId = profileData?.stripe_customer_id;
    const { resetDate, nextInvoiceDate } = await getBillingPeriodDisplay({
      profile: profileData,
      now,
      selfHeal: {
        mode: "await",
        updateBy: "email",
        userEmail,
        periodEndSource: "usage-api",
        logContext: "API route",
      },
    });

    const { paymentMethods, customerBalance } = await getStripePaymentDisplay(stripeCustomerId, {
      requireActiveCustomer: false,
    });

    const responseBody: UsageData = {
      plan: profileData?.plan || "Hobby",
      keys: processedKeys,
      totalUsage,
      globalTopRepos,
      activeRepositoryCount,
      avgLatency,
      successRate,
      resetDate,
      nextInvoiceDate,
      paymentMethods,
      customerBalance,
      dailyAnalytics,
      scheduledPlan: profileData?.stripe_scheduled_plan || null,
      scheduledPlanDate: profileData?.stripe_scheduled_plan_date || null
    };

    return NextResponse.json(responseBody);
  } catch (err) {
    console.error("❌ Usage API: Critical failure:", err);
    return NextResponse.json({ error: "Usage analytics are temporarily unavailable. Please try again." }, { status: 500 });
  }
}
