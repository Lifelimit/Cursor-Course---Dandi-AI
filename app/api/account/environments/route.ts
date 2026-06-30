import { NextResponse } from "next/server";
import {
  buildAccountAccess,
  getRequestTelemetry,
  type AccountUsageLog,
} from "@/lib/account-environments";
import { redis } from "@/lib/redis";
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
    let rawLogs: unknown[] = [];
    try {
      rawLogs = await redis.lrange(`logs:user:${userId}:${currentMonth}`, 0, 99);
    } catch (err) {
      console.warn("⚠️ Display Redis log read failed; using empty account environment usage logs:", err);
    }

    const usageLogs: AccountUsageLog[] = rawLogs.map((log: unknown) => {
      try {
        return typeof log === "string" ? JSON.parse(log) : log;
      } catch {
        return {};
      }
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
