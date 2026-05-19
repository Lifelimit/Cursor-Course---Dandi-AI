import { supabaseAdmin } from "@/lib/supabase-admin";
import { redis } from "@/lib/redis";
import { PLAN_DETAILS } from "@/lib/constants";
import { serverEnv } from "@/lib/env";

export async function validateApiKey(keyValue: string) {
  // Special case for Playground Demo Key
  if (keyValue === serverEnv.DEMO_API_KEY) {
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

  const { data: keyData, error } = await supabaseAdmin
    .from("api_keys")
    .select("id, name, usage_count, monthly_limit, user_id, key_type, is_active")
    .eq("key_value", keyValue)
    .eq("is_active", true)
    .single();

  if (error || !keyData) {
    throw new Error("Invalid API key");
  }

  // Fetch user profile to check plan and limits
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("plan")
    .eq("id", keyData.user_id)
    .single();

  if (profileError || !profile) {
    throw new Error("User profile not found");
  }

  const plan = profile.plan || "Hobby";
  const planDetail = PLAN_DETAILS[plan];
  
  // Extract numeric limit from string like "1,000 requests / mo"
  let monthlyLimit: number | null = null;
  if (planDetail.features[0].includes("Unlimited")) {
    monthlyLimit = null;
  } else {
    const match = planDetail.features[0].match(/(\d+,?\d+)/);
    if (match) {
      monthlyLimit = parseInt(match[0].replace(",", ""));
    }
  }

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
    throw new Error(`Usage limit of ${keyData.monthly_limit} reached for this specific API key.`);
  }

  // Enforce Global Plan Limit
  if (monthlyLimit !== null && currentUsage >= monthlyLimit) {
    throw new Error(`Monthly usage limit exceeded for your ${plan} plan. Used ${currentUsage}/${monthlyLimit} credits.`);
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
  
  // 1. Increment usage in Redis (Atomic)
  // We only increment usage count for successful requests to be fair to users
  if (status === "success") {
    await Promise.all([
      redis.incr(usageKey),
      redis.incr(keyUsageKey)
    ]);
  }

  // 2. Log metadata to Redis for analytics
  const logKey = `logs:user:${userId}:${currentMonth}`;
  await redis.lpush(logKey, JSON.stringify({
    keyId,
    repoUrl,
    usedAt: new Date().toISOString(),
    latencyMs,
    status
  }));
  
  // Keep only last 100 logs in Redis per user for "hot" analytics
  await redis.ltrim(logKey, 0, 99);
}
