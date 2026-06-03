import { supabaseAdmin } from "@/lib/supabase-admin";
import { redis } from "@/lib/redis";
import { resolvePlan } from "@/lib/constants";
import crypto from "crypto";
import { normalizeGitHubRepoUrl } from "@/lib/security-core";
import { getRequestTelemetry } from "@/lib/account-environments";

/** HMAC-SHA256 hash using the server secret. Used for new key hashing. */
export function hmacHash(value: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
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
    // Prevent bypass / direct cURL/CLI abuse by validating caller's active browser session via Supabase SSR
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) {
        throw new Error("Unauthorized: Active browser session required to use the Demo Key.");
      }
    } catch (sessionError) {
      console.error("Demo key session validation failed:", sessionError);
      throw new Error("Unauthorized: Active browser session required to use the Demo Key.");
    }

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const keyUsageKey = `usage:key:demo-id:${currentMonth}`;
    let currentKeyUsage = 0;
    try {
      currentKeyUsage = await redis.get<number>(keyUsageKey).then(v => v || 0);
    } catch (redisError) {
      console.error("⚠️ Redis outage during demo key usage check (failing open):", redisError);
    }

    if (currentKeyUsage >= 1000) {
      throw new Error("Monthly usage limit of 1,000 requests exceeded for the Playground Demo Key.");
    }

    return {
      id: "demo-id",
      name: "Playground Demo Key",
      usage_count: currentKeyUsage,
      monthly_limit: 1000,
      user_id: "demo-user-id",
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
    } catch (sessionError) {
      console.error("Masked key session validation failed:", sessionError);
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

  // Get current usage from Redis (Hot data)
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const usageKey = `usage:user:${keyData.user_id}:${currentMonth}`;
  const keyUsageKey = `usage:key:${keyData.id}:${currentMonth}`;

  let currentUsage = 0;
  let currentKeyUsage = 0;
  try {
    const [usage, keyUsage] = await Promise.all([
      redis.get<number>(usageKey).then(v => v || 0),
      redis.get<number>(keyUsageKey).then(v => v || 0)
    ]);
    currentUsage = usage;
    currentKeyUsage = keyUsage;
  } catch (redisError) {
    console.error("⚠️ Redis outage during user/key usage check (failing open):", redisError);
    // Fail open: fallback to persistent usage count from db
    currentKeyUsage = keyData.usage_count || 0;
  }

  // Enforce Specific Key Limit if set
  if (keyData.monthly_limit !== null && currentKeyUsage >= keyData.monthly_limit) {
    throw new Error(`Rate limit exceeded for this API key. Upgrade at dandi.ai`);
  }

  // Enforce Global Plan Limit
  if (monthlyLimit !== null && currentUsage >= monthlyLimit) {
    throw new Error(`Monthly usage limit exceeded for your plan. Upgrade at dandi.ai`);
  }

  return {
    ...keyData,
    monthly_limit: keyData.monthly_limit ?? monthlyLimit,
    usage_count: currentKeyUsage,
    plan,
    email: userEmail
  };
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
    if (status === "success") {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      try {
        await redis.incr(`usage:key:demo-id:${currentMonth}`);
      } catch (redisError) {
        console.error("⚠️ Redis outage during demo key increment:", redisError);
      }
    }
    return;
  }

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const usageKey = `usage:user:${userId}:${currentMonth}`;
  const keyUsageKey = `usage:key:${keyId}:${currentMonth}`;

  let newKeyUsage = 0;

  // 1. Increment usage in Redis (Atomic) — only for successful requests to be fair to users
  if (status === "success") {
    try {
      const [, val] = await Promise.all([
        redis.incr(usageKey),
        redis.incr(keyUsageKey),
      ]);
      newKeyUsage = val;
      // Set a 60-day TTL so stale monthly counters expire automatically
      const ttlSeconds = 60 * 24 * 60 * 60;
      await Promise.all([
        redis.expire(usageKey, ttlSeconds),
        redis.expire(keyUsageKey, ttlSeconds),
      ]);

      // Check for alerts
      if (keyData.monthly_limit && keyData.alert_threshold && keyData.alert_channels?.includes("email") && keyData.email) {
        const pct = (newKeyUsage / keyData.monthly_limit) * 100;
        if (pct >= keyData.alert_threshold) {
          // Only send once per month per key per threshold. Use Redis to deduplicate.
          const alertSentKey = `alert:sent:${keyId}:${currentMonth}`;
          try {
            const alreadySent = await redis.get(alertSentKey);
            if (!alreadySent) {
              // Await email sending to prevent early serverless execution suspension
              try {
                const { sendAlertEmail } = await import("./email.service");
                await sendAlertEmail(keyData.email, keyData.name, pct, keyData.alert_threshold);
              } catch (emailError) {
                console.error("Failed to send alert email:", emailError);
              }
              
              await redis.set(alertSentKey, "true", { ex: ttlSeconds });
            }
          } catch (redisAlertErr) {
            console.error("⚠️ Redis error during alert check/deduplication:", redisAlertErr);
          }
        }
      }
    } catch (redisError) {
      console.error("⚠️ Redis outage during usage increment/expiry:", redisError);
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
  } catch (redisLogErr) {
    console.error("⚠️ Redis outage during log push/trim:", redisLogErr);
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
      if (error) {
        console.warn("Failed to persist API usage log:", error.message);
      }
    });
}
