import { supabaseAdmin } from "@/lib/supabase-admin";
import { redis } from "@/lib/redis";
import { resolvePlan } from "@/lib/constants";
import crypto from "crypto";
import { normalizeGitHubRepoUrl } from "@/lib/security-core";
import { getRequestTelemetry } from "@/lib/account-environments";
import type { ValidatedApiKeyData } from "@/types/api-keys";

const USAGE_RESERVATION_SCRIPT = `
  local user_key = KEYS[1]
  local key_key = KEYS[2]
  local user_limit = tonumber(ARGV[1])
  local key_limit = tonumber(ARGV[2])
  local ttl = tonumber(ARGV[3])

  local user_current = tonumber(redis.call("GET", user_key) or "0")
  local key_current = tonumber(redis.call("GET", key_key) or "0")

  if user_limit >= 0 and user_current >= user_limit then
    return {0, 1, user_current, key_current}
  end
  if key_limit >= 0 and key_current >= key_limit then
    return {0, 2, user_current, key_current}
  end

  local user_next = redis.call("INCR", user_key)
  local key_next = redis.call("INCR", key_key)
  redis.call("EXPIRE", user_key, ttl)
  redis.call("EXPIRE", key_key, ttl)
  return {1, 0, user_next, key_next}
`;

export type ApiKeyQuotaErrorCode = "key_limit" | "plan_limit" | "unavailable";

export class ApiKeyQuotaError extends Error {
  constructor(public readonly code: ApiKeyQuotaErrorCode) {
    super(
      code === "key_limit"
        ? "Rate limit exceeded for this API key. Upgrade at dandi.ai"
        : code === "plan_limit"
          ? "Monthly usage limit exceeded for your plan. Upgrade at dandi.ai"
          : "Usage quota is temporarily unavailable. Please retry shortly.",
    );
    this.name = "ApiKeyQuotaError";
  }
}

export type ApiKeyQuotaReservation = {
  userUsage: number;
  keyUsage: number;
};

/** HMAC-SHA256 hash using the server secret. Used for new key hashing. */
export function hmacHash(value: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

/**
 * Resolve the user who owns request-created data. The demo credential is shared
 * for metering, but its browser session is never a shared authorization owner.
 */
export function getApiKeyDataOwnerId(
  keyData: Pick<ValidatedApiKeyData, "user_id" | "browserUserId">,
) {
  const ownerId = keyData.browserUserId || keyData.user_id;
  if (!ownerId || ownerId === "demo-user-id") {
    throw new Error("Authenticated data owner is required.");
  }
  return ownerId;
}

/** Returns true if the string looks like a valid GitHub repository URL. */
function isValidGitHubUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "github.com") return false;
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts.length >= 2;
  } catch {
    return false;
  }
}

export async function validateApiKey(keyValue: string) {
  // Special case for Playground Demo Key
  if (keyValue === "__demo__") {
    let activeUser;
    // Prevent bypass / direct cURL/CLI abuse by validating caller's active browser session via Supabase SSR
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) {
        throw new Error("Unauthorized: Active browser session required to use the Demo Key.");
      }
      activeUser = user;
    } catch {
      console.error("Demo key session validation failed.");
      throw new Error("Unauthorized: Active browser session required to use the Demo Key.");
    }

    return {
      id: "demo-id",
      name: "Playground Demo Key",
      usage_count: 0,
      monthly_limit: 1000,
      user_id: "demo-user-id",
      browserUserId: activeUser.id,
      key_type: "production" as const,
      plan: "Hobby"
    };
  }

  let keyData;
  let dbError;

  if (keyValue.includes("...")) {
    const normalizedKey = keyValue.replace(/\s+/g, "");
    // Validate caller's active browser session via Supabase SSR
    let profileId;
    try {
      const { getAuthenticatedUserId } = await import("@/lib/services/auth.service");
      profileId = await getAuthenticatedUserId();
    } catch {
      console.error("Masked key session validation failed.");
    }

    if (!profileId) {
      throw new Error("Unauthorized: Active browser session required to use a masked API key.");
    }

    const { data, error } = await supabaseAdmin
      .from("api_keys")
      .select("id, name, usage_count, monthly_limit, user_id, key_type, is_active, alert_threshold, alert_channels, profiles(plan, email)")
      .eq("key_value", normalizedKey)
      .eq("user_id", profileId)
      .eq("is_active", true)
      .single();

    keyData = data;
    dbError = error;
  } else {
    // Regular API keys: try HMAC-SHA256 first (new keys), fallback to plain SHA-256 (legacy keys)
    const { getServerEnv } = await import("@/lib/env");
    const hmacSecret = getServerEnv().API_KEY_HMAC_SECRET;
    const hmacHashed = hmacHash(keyValue, hmacSecret);

    const { data: hmacData, error: hmacError } = await supabaseAdmin
      .from("api_keys")
      .select("id, name, usage_count, monthly_limit, user_id, key_type, is_active, alert_threshold, alert_channels, profiles(plan, email)")
      .eq("hashed_key_value", hmacHashed)
      .eq("is_active", true)
      .single();

    if (hmacData && !hmacError) {
      keyData = hmacData;
      dbError = null;
    } else {
      // Fallback: try legacy SHA-256 hash for keys created before HMAC was introduced
      const legacyHashed = crypto.createHash("sha256").update(keyValue).digest("hex");
      const { data: legacyData, error: legacyError } = await supabaseAdmin
        .from("api_keys")
        .select("id, name, usage_count, monthly_limit, user_id, key_type, is_active, alert_threshold, alert_channels, profiles(plan, email)")
        .eq("hashed_key_value", legacyHashed)
        .eq("is_active", true)
        .single();

      keyData = legacyData;
      dbError = legacyError;
    }
  }

  if (dbError || !keyData) {
    throw new Error("Invalid API key");
  }

  const profilesData = keyData.profiles as { plan?: string; email?: string } | { plan?: string; email?: string }[];
  const plan = (Array.isArray(profilesData) ? profilesData[0]?.plan : profilesData?.plan) || "Hobby";
  const userEmail = Array.isArray(profilesData) ? profilesData[0]?.email : profilesData?.email;
  const resolved = resolvePlan(plan);
  const monthlyLimit = resolved.monthlyRequests;

  return {
    ...keyData,
    monthly_limit: keyData.monthly_limit ?? monthlyLimit,
    usage_count: keyData.usage_count || 0,
    plan,
    email: userEmail
  };
}

export async function reserveApiKeyUsage(
  keyData: ValidatedApiKeyData,
): Promise<ApiKeyQuotaReservation> {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const isDemoKey = keyData.id === "demo-id";
  const userId = isDemoKey ? "demo" : keyData.user_id;
  const userLimit = isDemoKey ? null : resolvePlan(keyData.plan).monthlyRequests;
  const keyLimit = isDemoKey ? 1000 : keyData.monthly_limit ?? userLimit;
  const usageKey = `usage:user:${userId}:${currentMonth}`;
  const keyUsageKey = `usage:key:${keyData.id}:${currentMonth}`;
  const ttlSeconds = 60 * 24 * 60 * 60;

  try {
    const result = await redis.eval(USAGE_RESERVATION_SCRIPT, [usageKey, keyUsageKey], [
      String(userLimit ?? -1),
      String(keyLimit ?? -1),
      String(ttlSeconds),
    ]) as unknown;
    const values = Array.isArray(result) ? result.map(Number) : [];
    const [reserved, reason, userUsage, keyUsage] = values;

    if (
      values.length < 4
      || !Number.isFinite(reserved)
      || !Number.isFinite(reason)
      || !Number.isFinite(userUsage)
      || !Number.isFinite(keyUsage)
      || (reserved !== 0 && reserved !== 1)
    ) {
      throw new ApiKeyQuotaError("unavailable");
    }

    if (reserved !== 1) {
      throw new ApiKeyQuotaError(reason === 1 ? "plan_limit" : "key_limit");
    }

    keyData.usage_count = keyUsage;
    return { userUsage, keyUsage };
  } catch (error) {
    if (error instanceof ApiKeyQuotaError) throw error;
    console.error("Redis was unavailable during atomic usage reservation; blocking the request.");
    throw new ApiKeyQuotaError("unavailable");
  }
}

export async function incrementKeyUsage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  keyData: any,
  repoUrl?: string,
  latencyMs: number = 0,
  status: "success" | "error" = "success",
  request?: Request
) {
  const keyId = keyData.id;
  const userId = keyData.user_id;
  if (keyId === "demo-id") {
    return;
  }

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  const newKeyUsage = keyData.usage_count || 0;

  // Quota counters are reserved atomically before provider work. This function
  // records telemetry and sends threshold alerts after that reservation; it must
  // not increment the counters again.
  if (status === "success" && keyData.monthly_limit && keyData.alert_threshold) {
    const pct = (newKeyUsage / keyData.monthly_limit) * 100;
    if (pct >= keyData.alert_threshold) {
      const emailAlertsEnabled = keyData.alert_channels?.includes("email") && keyData.email;
      if (emailAlertsEnabled) {
        const alertSentKey = `alert:sent:${keyId}:${currentMonth}`;
        let alreadySent = false;
        try {
          alreadySent = Boolean(await redis.get(alertSentKey));
        } catch {
          console.error("Redis was unavailable during usage-alert deduplication.");
        }

        if (!alreadySent) {
          try {
            const { sendAlertEmail } = await import("./email.service");
            await sendAlertEmail(keyData.email, keyData.name, pct, keyData.alert_threshold);
          } catch {
            console.error("Failed to send a usage alert email.");
          }

          try {
            await redis.set(alertSentKey, "true", { ex: 60 * 24 * 60 * 60 });
          } catch {
            console.error("Redis was unavailable while recording a usage alert.");
          }
        }
      }

    }
  }

  // 2. Validate and sanitize repoUrl before logging
  const safeRepoUrl = repoUrl && isValidGitHubUrl(repoUrl) ? normalizeGitHubRepoUrl(repoUrl) ?? undefined : undefined;

  // 3. Log metadata to Redis for analytics
  try {
    const logKey = `logs:user:${userId}:${currentMonth}`;
    const requestTelemetry = request ? getRequestTelemetry(request) : null;
    await redis.lpush(logKey, JSON.stringify({
      keyId,
      repoUrl: safeRepoUrl,
      usedAt: new Date().toISOString(),
      latencyMs,
      status,
      ...(requestTelemetry || {}),
    }));

    // Keep only last 100 logs in Redis per user for "hot" analytics
    await redis.ltrim(logKey, 0, 99);
  } catch {
    console.error("Redis was unavailable while recording usage telemetry.");
  }

  await supabaseAdmin
    .from("api_usage_log")
    .insert({
      api_key_id: keyId,
      user_id: userId,
      repo_url: safeRepoUrl,
      status,
      latency_ms: Math.max(0, Math.round(latencyMs)),
    })
    .then(({ error }) => {
      if (error) console.warn("Failed to persist API usage telemetry.");
    });
}
