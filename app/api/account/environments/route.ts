import { NextResponse } from "next/server";
import {
  buildAccountAccess,
  getRequestTelemetry,
} from "@/lib/account-environments";
import { getDisplayUsageLogs, UsageDataUnavailableError } from "@/lib/services/usage-billing.service";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUserId } from "@/lib/services/auth.service";
import { getUsagePeriod } from "@/lib/utils/usage-period";
import { isEmailDeliveryConfigured } from "@/lib/services/email.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();

    const { data: apiKeys, error } = await supabaseAdmin
      .from("api_keys")
      .select("id, name, key_type, monthly_limit, alert_threshold, alert_channels, created_at, is_active")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to load account environments." }, { status: 500 });
    }

    const currentMonth = getUsagePeriod().key;
    const usageLogs = await getDisplayUsageLogs(`logs:user:${userId}:${currentMonth}`, 0, 99, {
      requireKeyId: true,
      warning: "⚠️ Display Redis log read failed; using empty account environment usage logs:",
    });

    const accountAccess = buildAccountAccess({
      currentRequest: getRequestTelemetry(request),
      apiKeys: apiKeys || [],
      usageLogs,
    });

    return NextResponse.json({
      currentBrowser: accountAccess.currentBrowser,
      apiKeys: accountAccess.apiKeys,
      recentRequests: accountAccess.recentRequests,
      emailAlertsAvailable: isEmailDeliveryConfigured(),
    });
  } catch (err) {
    const unauthorized = err instanceof Error && /unauthorized/i.test(err.message);
    const unavailable = err instanceof UsageDataUnavailableError;
    return NextResponse.json({ error: unauthorized ? "Unauthorized" : unavailable ? "Recent request activity is temporarily unavailable." : "Failed to load account environments." }, { status: unauthorized ? 401 : unavailable ? 503 : 500 });
  }
}
