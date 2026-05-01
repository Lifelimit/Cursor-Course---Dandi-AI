import { supabaseAdmin } from "@/lib/supabase-admin";

export async function validateApiKey(keyValue: string) {
  // Special case for Playground Demo Key
  if (keyValue === "sk_live_demo_key_dandi_2026") {
    return {
      id: "demo-id",
      name: "Playground Demo User",
      usage_count: 0,
      monthly_limit: null,
      user_id: "demo-user-id"
    };
  }

  const { data, error } = await supabaseAdmin
    .from("api_keys")
    .select("id, name, usage_count, monthly_limit, user_id")
    .eq("key_value", keyValue)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    throw new Error("Invalid API key");
  }

  // Enforce monthly limit
  if (data.monthly_limit !== null && data.usage_count >= data.monthly_limit) {
    throw new Error(`Usage limit exceeded. You have used ${data.usage_count}/${data.monthly_limit} credits.`);
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

