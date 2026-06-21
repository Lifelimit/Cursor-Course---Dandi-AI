import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUserId } from "@/lib/services/auth.service";
import {
  buildUsageSummaryData,
  getStripePaymentDisplay,
} from "@/lib/services/usage-billing.service";
import type { UsageData } from "@/types/usage";

type UsageScope = "summary" | "full";

function resolveUsageScope(request: Request): UsageScope | null {
  const scope = new URL(request.url).searchParams.get("scope") || "full";
  if (scope === "summary" || scope === "full") return scope;
  return null;
}

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const scope = resolveUsageScope(request);
    if (!scope) {
      return NextResponse.json({ error: "Invalid usage scope. Use summary or full." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email;

    // 1. Fetch profile and API keys in parallel; Redis display data is best-effort below

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

    const now = new Date();
    const summaryData = await buildUsageSummaryData({
      userId,
      profile: profileData,
      keys: keys ?? [],
      now,
      logStop: 99,
      logOptions: {
        includeSnakeRepoUrl: true,
        warning: "⚠️ Display Redis log read failed; using empty usage analytics:",
      },
      selfHeal: scope === "full"
        ? {
            mode: "await",
            updateBy: "email",
            userEmail,
            periodEndSource: "usage-api",
            logContext: "API route",
          }
        : undefined,
    });

    if (scope === "summary") {
      return NextResponse.json(summaryData);
    }

    const stripeCustomerId = profileData?.stripe_customer_id;
    const { paymentMethods, customerBalance } = await getStripePaymentDisplay(stripeCustomerId, {
      requireActiveCustomer: false,
    });

    const responseBody: UsageData = {
      ...summaryData,
      paymentMethods,
      customerBalance,
      scheduledPlan: profileData?.stripe_scheduled_plan || null,
      scheduledPlanDate: profileData?.stripe_scheduled_plan_date || null
    };

    return NextResponse.json(responseBody);
  } catch (err) {
    console.error("❌ Usage API: Critical failure:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
