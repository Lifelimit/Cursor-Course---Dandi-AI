import { supabaseAdmin } from "@/lib/supabase-admin";
import { redis } from "@/lib/redis";
import { PLAN_DETAILS } from "@/lib/constants";
import crypto from "crypto";

/** HMAC-SHA256 hash using the server secret. Used for new key hashing. */
export function hmacHash(value: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

/** Legacy SHA-256 hash (no secret). Used as a fallback for keys created before HMAC was introduced. */
function sha256Hash(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
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
    const currentKeyUsage = await redis.get<number>(keyUsageKey).then(v => v || 0);

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

    // Query key by key_value (masked) and user_id to ensure ownership
    const { data, error } = await supabaseAdmin
      .from("api_keys")
      .select("id, name, usage_count, monthly_limit, user_id, key_type, is_active, profiles(plan)")
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
      .select("id, name, usage_count, monthly_limit, user_id, key_type, is_active, profiles(plan)")
      .eq("hashed_key_value", hmacHashed)
      .eq("is_active", true)
      .single();

    if (hmacData && !hmacError) {
      keyData = hmacData;
      dbError = null;
    } else {
      // Fallback: try legacy SHA-256 hash for keys created before HMAC was introduced
      const legacyHashed = sha256Hash(keyValue);
      const { data: legacyData, error: legacyError } = await supabaseAdmin
        .from("api_keys")
        .select("id, name, usage_count, monthly_limit, user_id, key_type, is_active, profiles(plan)")
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

  const profilesData = keyData.profiles as { plan?: string } | { plan?: string }[];
  const plan = (Array.isArray(profilesData) ? profilesData[0]?.plan : profilesData?.plan) || "Hobby";
  const planDetail = PLAN_DETAILS[plan as keyof typeof PLAN_DETAILS] ?? PLAN_DETAILS["Hobby"];

  // Use numeric limit directly from plan constants — no regex parsing needed
  const monthlyLimit = planDetail.monthlyLimit;

  // Get current usage from Redis (Hot data)
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const usageKey = `usage:user:${keyData.user_id}:${currentMonth}`;
  const keyUsageKey = `usage:key:${keyData.id}:${currentMonth}`;

  const [currentUsage, currentKeyUsage] = await Promise.all([
    redis.get<number>(usageKey).then(v => v || 0),
    redis.get<number>(keyUsageKey).then(v => v || 0)
  ]);

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
    plan
  };
}

export async function incrementKeyUsage(
  keyId: string,
  userId: string,
  repoUrl?: string,
  latencyMs: number = 0,
  status: "success" | "error" = "success"
) {
  if (keyId === "demo-id") {
    if (status === "success") {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      await redis.incr(`usage:key:demo-id:${currentMonth}`);
    }
    return;
  }

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const usageKey = `usage:user:${userId}:${currentMonth}`;
  const keyUsageKey = `usage:key:${keyId}:${currentMonth}`;

  // 1. Increment usage in Redis (Atomic) — only for successful requests to be fair to users
  if (status === "success") {
    await Promise.all([
      redis.incr(usageKey),
      redis.incr(keyUsageKey),
    ]);
    // Set a 60-day TTL so stale monthly counters expire automatically
    const ttlSeconds = 60 * 24 * 60 * 60;
    await Promise.all([
      redis.expire(usageKey, ttlSeconds),
      redis.expire(keyUsageKey, ttlSeconds),
    ]);
  }

  // 2. Validate and sanitize repoUrl before logging
  const safeRepoUrl = repoUrl && isValidGitHubUrl(repoUrl) ? repoUrl : undefined;

  // 3. Log metadata to Redis for analytics
  const logKey = `logs:user:${userId}:${currentMonth}`;
  await redis.lpush(logKey, JSON.stringify({
    keyId,
    repoUrl: safeRepoUrl,
    usedAt: new Date().toISOString(),
    latencyMs,
    status
  }));

  // Keep only last 100 logs in Redis per user for "hot" analytics
  await redis.ltrim(logKey, 0, 99);
}
