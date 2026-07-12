import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUserId } from "@/lib/services/auth.service";
import { assertCanActivateKeys, getUserPlan } from "@/lib/services/api-key-limits.service";
import { getJsonObject, getSafeApiKeyValidationError, validateUuidList } from "@/lib/request-validation";

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const body = getJsonObject(await request.json()) as { ids?: unknown; action?: "disable" | "enable" };
    const ids = validateUuidList(body.ids, { min: 1, max: 50 });

    const isActive = body.action === "enable";
    if (isActive) {
      const plan = await getUserPlan(userId);
      await assertCanActivateKeys(userId, plan, ids);
    }

    const { data, error } = await supabaseAdmin
      .from("api_keys")
      .update({ is_active: isActive })
      .in("id", ids)
      .eq("user_id", userId) // Security: only touch keys belonging to this user
      .select("id");

    if (error) {
      return NextResponse.json({ error: "Failed to update API keys." }, { status: 500 });
    }

    return NextResponse.json({ success: true, affected: data?.length ?? 0, action: isActive ? "enabled" : "disabled" });
  } catch (err) {
    const safeMessage = getSafeApiKeyValidationError(err, "Failed to update API keys.");
    const unauthorized = err instanceof Error && /unauthorized/i.test(err.message);
    return NextResponse.json({ error: unauthorized ? "Unauthorized" : safeMessage }, { status: unauthorized ? 401 : safeMessage === "Failed to update API keys." ? 500 : 400 });
  }
}
