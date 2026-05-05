import { supabaseAdmin } from "@/lib/supabase-admin";
import { Redis } from "@upstash/redis";
import { PLAN_DETAILS } from "@/lib/constants";

const redis = Redis.fromEnv();

export async function validateApiKey(keyValue: string) {
  // Special case for Playground Demo Key
  if (keyValue === "sk_live_demo_key_dandi_2026") {
    return {
      id: "demo-id",
      name: "Playground Demo User",
      usage_count: 0,
      monthly_limit: 1000,
      user_id: "demo-user-id",
      key_type: "production" as const
    };
  }

  const { data: keyData, error } = await supabaseAdmin
    .from("api_keys")
    .select("id, name, usage_count, user_id, key_type, is_active")
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
  const currentUsage = (await redis.get<number>(usageKey)) || 0;

  // Enforce Monthly Limit
  if (monthlyLimit !== null && currentUsage >= monthlyLimit) {
    throw new Error(`Monthly usage limit exceeded for your ${plan} plan. Used ${currentUsage}/${monthlyLimit} credits.`);
  }

  return {
    ...keyData,
    monthly_limit: monthlyLimit,
    usage_count: currentUsage,
    plan
  };
}

export async function incrementKeyUsage(keyId: string, userId: string, repoUrl?: string) {
  if (keyId === "demo-id") return;

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const usageKey = `usage:user:${userId}:${currentMonth}`;

  // 1. Increment usage in Redis (Atomic)
  await redis.incr(usageKey);

  // 2. Optionally: Periodically sync to Postgres api_keys table 
  // (Not doing here to save connection cycles as requested)
  
  // 3. Log metadata to Redis for analytics instead of Postgres
  const logKey = `logs:user:${userId}:${currentMonth}`;
  await redis.lpush(logKey, JSON.stringify({
    keyId,
    repoUrl,
    usedAt: new Date().toISOString()
  }));
  
  // Keep only last 100 logs in Redis per user for "hot" analytics
  await redis.ltrim(logKey, 0, 99);
}
