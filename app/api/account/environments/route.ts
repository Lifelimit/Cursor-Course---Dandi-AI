import { NextResponse } from "next/server";
import {
  buildAccountEnvironments,
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
    const rawLogs = await redis.lrange(`logs:user:${userId}:${currentMonth}`, 0, 99);
    const usageLogs: AccountUsageLog[] = rawLogs.map((log: unknown) => {
      try {
        return typeof log === "string" ? JSON.parse(log) : log;
      } catch {
        return {};
      }
    });

    return NextResponse.json({
      environments: buildAccountEnvironments({
        currentRequest: getRequestTelemetry(request),
        apiKeys: apiKeys || [],
        usageLogs,
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    const status = message.toLowerCase().includes("unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
