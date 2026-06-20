import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUserId } from "@/lib/services/auth.service";
import { getServerEnv } from "@/lib/env";
import { resolvePlan } from "@/lib/constants";
import crypto from "crypto";
import { hmacHash } from "@/lib/services/api-key.service";
import { assertCanActivateKeys, getUserPlan } from "@/lib/services/api-key-limits.service";
import { getJsonObject, parseApiKeySettings } from "@/lib/request-validation";
import {
  buildCountOnlyDailyTrend,
  getDisplayUsageCounts,
  getDisplayUsageLogs,
  getRecentUsageDates,
} from "@/lib/services/usage-billing.service";
import type { ApiKeyRow } from "@/types/api-keys";

const TABLE_NAME = "api_keys";

function buildKeyValue() {
  return `sk_live_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
}

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("plan")
      .eq("id", userId)
      .single();

    const plan = profile?.plan || "Hobby";
    const resolved = resolvePlan(plan);
    const monthlyLimit = resolved.monthlyRequests;

    const { data, error } = await supabaseAdmin
      .from(TABLE_NAME)
      .select("id,name,key_value,key_type,usage_count,monthly_limit,created_at,is_active,alert_threshold,alert_channels,alert_phone")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const keyUsageCounts = await getDisplayUsageCounts(data ?? [], currentMonth);

    // Fetch user activity logs to build trend coordinates
    const logKey = `logs:user:${userId}:${currentMonth}`;
    const logs = await getDisplayUsageLogs(logKey, 0, 99, {
      requireKeyId: true,
      warning: "⚠️ Display Redis log read failed; using empty key trends:",
    });

    const dates = getRecentUsageDates();

    const mappedKeys = (data ?? []).map((k, index) => {
      const actualUsage = keyUsageCounts[index] || 0;
      const keyLogs = logs.filter((l) => l.keyId === k.id);
      const dailyTrend = buildCountOnlyDailyTrend(dates, keyLogs);

      return {
        ...k,
        usage_count: actualUsage,
        monthly_limit: k.monthly_limit ?? monthlyLimit,
        dailyTrend
      };
    });

    return NextResponse.json(mappedKeys);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const plan = await getUserPlan(userId);
    const body = getJsonObject(await request.json());
    const settings = parseApiKeySettings(body, { plan, requireName: true });

    if (settings.isActive !== false) {
      await assertCanActivateKeys(userId, plan, [], 1);
    }

    const plainKey = buildKeyValue();
    const hmacSecret = getServerEnv().API_KEY_HMAC_SECRET;
    const hashedKeyValue = hmacHash(plainKey, hmacSecret);
    const maskedKey = `${plainKey.slice(0, 8)}...${plainKey.slice(-4)}`;

    const { data, error } = await supabaseAdmin
      .from(TABLE_NAME)
      .insert({
        name: settings.name,
        key_value: maskedKey,
        hashed_key_value: hashedKeyValue,
        key_type: settings.keyType ?? "development",
        usage_count: 0,
        monthly_limit: settings.monthlyLimit ?? null,
        user_id: userId,
        alert_threshold: settings.alertThreshold ?? 80,
        alert_channels: settings.alertChannels ?? ["in-page"],
        alert_phone: settings.alertPhone ?? null,
        is_active: settings.isActive ?? true,
      })
      .select("id,name,key_value,key_type,usage_count,monthly_limit,created_at,is_active,alert_threshold,alert_channels,alert_phone")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ...(data as ApiKeyRow),
      plain_key: plainKey
    }, {
      status: 201,
      headers: {
        // Prevent CDNs, proxies, and browsers from caching the response containing the plaintext key
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
      }
    });
  } catch (err) {
    const message = (err as Error).message;
    const status = message.includes("active API keys") || message.includes("Monthly limit") ? 400 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}
