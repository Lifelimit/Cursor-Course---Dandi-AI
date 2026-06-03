import { resolvePlan } from "@/lib/constants";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function getUserPlan(userId: string) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single();

  return profile?.plan || "Hobby";
}

export async function assertCanActivateKeys(
  userId: string,
  plan: string,
  activatingIds: string[] = [],
  additionalNewKeys = 0
) {
  const resolved = resolvePlan(plan);
  const keyLimit = resolved.maxKeys;
  if (keyLimit === null) return;

  let activeQuery = supabaseAdmin
    .from("api_keys")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_active", true);

  if (activatingIds.length > 0) {
    activeQuery = activeQuery.not("id", "in", `(${activatingIds.join(",")})`);
  }

  const { count, error } = await activeQuery;
  if (error) throw new Error(error.message);

  const { data: ownedKeys, error: ownedError } =
    activatingIds.length > 0
      ? await supabaseAdmin
          .from("api_keys")
          .select("id")
          .eq("user_id", userId)
          .in("id", activatingIds)
      : { data: [], error: null };

  if (ownedError) throw new Error(ownedError.message);
  if (activatingIds.length > 0 && (ownedKeys?.length ?? 0) !== activatingIds.length) {
    throw new Error("One or more API keys were not found.");
  }

  if ((count ?? 0) + activatingIds.length + additionalNewKeys > keyLimit) {
    throw new Error(`Your ${plan} plan allows up to ${keyLimit} active API keys.`);
  }
}
