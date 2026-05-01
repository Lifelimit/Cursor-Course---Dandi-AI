import { supabaseAdmin } from "@/lib/supabase-admin";

export async function validateApiKey(keyValue: string) {
  // Special case for Playground Demo Key
  if (keyValue === "sk_live_demo_key_dandi_2026") {
    return {
      id: "demo-id",
      name: "Playground Demo User",
      usage_count: 0,
      monthly_limit: null
    };
  }

  const { data, error } = await supabaseAdmin
    .from("api_keys")
    .select("id, name, usage_count, monthly_limit")
    .eq("key_value", keyValue)
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

export async function incrementKeyUsage(keyId: string, currentCount: number) {
  if (keyId === "demo-id") return;

  const { error } = await supabaseAdmin
    .from("api_keys")
    .update({ usage_count: currentCount + 1 })
    .eq("id", keyId);

  if (error) {
    console.error("Failed to increment usage count for key:", keyId, error);
  }
}

