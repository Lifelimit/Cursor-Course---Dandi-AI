import { NextResponse } from "next/server";
import {
  buildAccountAccess,
  getRequestTelemetry,
} from "@/lib/account-environments";
import { getDisplayUsageLogs } from "@/lib/services/usage-billing.service";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUserId } from "@/lib/services/auth.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();

    const { data: apiKeys, error } = await supabaseAdmin
      .from("api_keys")
      .select("id, name, key_type, created_at, is_active")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const currentMonth = new Date().toISOString().slice(0, 7);
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
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    const status = message.toLowerCase().includes("unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
