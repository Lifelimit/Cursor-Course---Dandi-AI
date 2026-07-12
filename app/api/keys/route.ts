import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUserId } from "@/lib/services/auth.service";
import { getServerEnv } from "@/lib/env";
import { resolvePlan } from "@/lib/constants";
import crypto from "crypto";
import { hmacHash } from "@/lib/services/api-key.service";
import { assertCanActivateKeys, getApiKeyLimitDatabaseMessage, getUserPlan } from "@/lib/services/api-key-limits.service";
import { getJsonObject, getSafeApiKeyValidationError, parseApiKeySettings } from "@/lib/request-validation";
import {
  buildCountOnlyDailyTrend,
  getDurableUsageLogs,
  getDisplayUsageCounts,
  getRecentUsageDates,
  UsageDataUnavailableError,
} from "@/lib/services/usage-billing.service";
import { getUsagePeriod } from "@/lib/utils/usage-period";
import type { ApiKeyRow } from "@/types/api-keys";

const TABLE_NAME = "api_keys";

function buildKeyValue() {
  return `dandi_${crypto.randomUUID().replace(/-/g, "").slice(0, 28)}`;
}

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("plan")
      .eq("id", userId)
      .maybeSingle();

    const plan = profileError ? null : profile?.plan || "Hobby";
    const resolved = resolvePlan(plan ?? "Hobby");
    const monthlyLimit = resolved.monthlyRequests;

    const { data, error } = await supabaseAdmin
      .from(TABLE_NAME)
      .select("id,name,key_value,key_type,usage_count,monthly_limit,created_at,is_active,alert_threshold,alert_channels")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to load API keys." }, { status: 500 });
    }

    const now = new Date();
    const currentMonth = getUsagePeriod(now).key;
    const keyUsageCounts = await getDisplayUsageCounts(data ?? [], currentMonth);

    const logs = await getDurableUsageLogs(userId, now);
    const dates = getRecentUsageDates(now);

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

    const headers: Record<string, string> = { "Cache-Control": "no-store" };
    if (plan) headers["x-dandi-plan"] = plan;
    return NextResponse.json(mappedKeys, { headers });
  } catch (err) {
    const unauthorized = err instanceof Error && /unauthorized/i.test(err.message);
    const unavailable = err instanceof UsageDataUnavailableError;
    return NextResponse.json(
      { error: unauthorized ? "Unauthorized" : unavailable ? "API key usage is temporarily unavailable." : "Failed to load API keys." },
      { status: unauthorized ? 401 : unavailable ? 503 : 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const plan = await getUserPlan(userId);
    let body: Record<string, unknown>;
    try {
      body = getJsonObject(await request.json());
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }
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
        is_active: settings.isActive ?? true,
      })
      .select("id,name,key_value,key_type,usage_count,monthly_limit,created_at,is_active,alert_threshold,alert_channels")
      .single();

    if (error) {
      const limitMessage = getApiKeyLimitDatabaseMessage(error);
      return NextResponse.json(
        { error: limitMessage || "Failed to create API key." },
        { status: limitMessage ? 409 : 500 },
      );
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
    const safeMessage = getSafeApiKeyValidationError(err, "Failed to create API key.");
    const isValidation = safeMessage !== "Failed to create API key.";
    const unauthorized = err instanceof Error && /unauthorized/i.test(err.message);
    return NextResponse.json({ error: unauthorized ? "Unauthorized" : safeMessage }, { status: unauthorized ? 401 : isValidation ? 400 : 500 });
  }
}
