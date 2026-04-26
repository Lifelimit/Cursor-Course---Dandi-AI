import { supabaseAdmin } from "@/lib/supabase-admin";

export async function validateApiKey(keyValue: string) {
  const { data, error } = await supabaseAdmin
    .from("api_keys")
    .select("id, name, usage_count")
    .eq("key_value", keyValue)
    .single();

  if (error || !data) {
    throw new Error("Invalid API key");
  }

  return data;
}

export async function incrementKeyUsage(keyId: string, currentCount: number) {
  const { error } = await supabaseAdmin
    .from("api_keys")
    .update({ usage_count: currentCount + 1 })
    .eq("id", keyId);

  if (error) {
    console.error("Failed to increment usage count for key:", keyId, error);
  }
}
