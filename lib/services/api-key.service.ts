import { supabaseAdmin } from "@/lib/supabase-admin";

export async function validateApiKey(keyValue: string) {
  // Special case for Playground Demo Key
  if (keyValue === "sk_live_demo_key_dandi_2026") {
    return {
      id: "demo-id",
      name: "Playground Demo User",
      usage_count: 0,
      monthly_limit: null,
      user_id: "demo-user-id",
      key_type: "production" as const
    };
  }

  const { data, error } = await supabaseAdmin
    .from("api_keys")
    .select("id, name, usage_count, monthly_limit, user_id, key_type, alert_threshold, alert_channels")
    .eq("key_value", keyValue)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    throw new Error("Invalid API key");
  }

  const isProduction = data.key_type === "production";

  // 1. Enforce Monthly Limit (Hard for both by default as it's the plan limit)
  if (data.monthly_limit !== null && data.usage_count >= data.monthly_limit) {
    throw new Error(`Usage limit exceeded. You have used ${data.usage_count}/${data.monthly_limit} credits.`);
  }

  // 2. Enforce Rate Limits (Requests per Minute)
  const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
  const { count: recentUsage } = await supabaseAdmin
    .from("api_usage_log")
    .select("*", { count: "exact", head: true })
    .eq("api_key_id", data.id)
    .gt("created_at", oneMinuteAgo);

  const rpmLimit = isProduction ? 1000 : 100;
  if (recentUsage !== null && recentUsage >= rpmLimit) {
    if (isProduction) {
      throw new Error(`Rate limit exceeded (Hard). Production keys are limited to ${rpmLimit} requests/minute.`);
    } else {
      // For Dev, we allow it but it's a "Soft" limit warning in the logs/response
      console.warn(`Soft Rate Limit Warning for ${data.name}: ${recentUsage}/${rpmLimit} req/min`);
    }
  }

  // 3. Smart Sentinel Check (Alert Threshold)
  if (data.alert_threshold !== null && data.monthly_limit !== null) {
    const usagePercent = (data.usage_count / data.monthly_limit) * 100;
    if (usagePercent >= data.alert_threshold) {
      // Logic for triggering alerts based on alert_channels (email, in-page, etc)
      // For now we log it, but in production this would trigger the notification service
      console.log(`[SENTINEL ALERT] Key ${data.name} has reached ${usagePercent.toFixed(1)}% of its limit.`);
    }
  }

  return data;
}

export async function incrementKeyUsage(keyId: string, currentCount: number, userId: string, repoUrl?: string) {
  if (keyId === "demo-id") return;

  // 1. Update the aggregate count on the key
  const { error: updateError } = await supabaseAdmin
    .from("api_keys")
    .update({ usage_count: currentCount + 1 })
    .eq("id", keyId);

  if (updateError) {
    console.error("Failed to increment usage count for key:", keyId, updateError);
  }

  // 2. Log the individual usage event for analytics
  const { error: logError } = await supabaseAdmin
    .from("api_usage_log")
    .insert({
      api_key_id: keyId,
      user_id: userId,
      repo_url: repoUrl,
    });

  if (logError) {
    console.error("Failed to log usage event:", logError);
  }
}

