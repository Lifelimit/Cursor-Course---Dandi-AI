import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUserId } from "@/lib/services/auth.service";
import { assertCanActivateKeys, getApiKeyLimitDatabaseMessage, getUserPlan } from "@/lib/services/api-key-limits.service";
import { getJsonObject, getSafeApiKeyValidationError, parseApiKeySettings } from "@/lib/request-validation";
import { isUuid } from "@/lib/security-core";
import { getDisplayUsageCount, UsageDataUnavailableError } from "@/lib/services/usage-billing.service";
import { getUsagePeriod } from "@/lib/utils/usage-period";
import { deleteApiKeyRedisData } from "@/lib/services/account-deletion.service";

const TABLE_NAME = "api_keys";
const noStoreHeaders = { "Cache-Control": "private, no-store" };

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const userId = await getAuthenticatedUserId();
    const { id } = await context.params;
    if (!isUuid(id)) {
      return NextResponse.json({ error: "Invalid API key ID." }, { status: 400 });
    }

    const plan = await getUserPlan(userId);
    let body: Record<string, unknown>;
    try {
      body = getJsonObject(await request.json());
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }
    const settings = parseApiKeySettings(body, { plan, partial: true });

    if (settings.isActive === true) {
      await assertCanActivateKeys(userId, plan, [id]);
    }

    // Fetch existing API key data for guardrail validation
    const { data: keyData, error: fetchError } = await supabaseAdmin
      .from(TABLE_NAME)
      .select("monthly_limit, alert_threshold, usage_count")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (fetchError || !keyData) {
      return NextResponse.json({ error: "API key not found." }, { status: 404 });
    }

    // Enforce guardrail: monthlyLimit must be strictly greater than current usage count
    if (settings.monthlyLimit !== undefined && settings.monthlyLimit !== null) {
      const currentMonth = getUsagePeriod().key;
      const usageCount = await getDisplayUsageCount(`usage:key:${id}:${currentMonth}`);

      if (settings.monthlyLimit <= usageCount) {
        return NextResponse.json(
          { error: `New monthly request limit must be strictly greater than the current usage of ${usageCount} requests.` },
          { status: 400 }
        );
      }
    }

    const updates: Record<string, string | number | boolean | string[] | null> = {};

    if (settings.name !== undefined) {
      updates.name = settings.name;
    }

    if (settings.keyType) {
      updates.key_type = settings.keyType;
    }

    if (settings.monthlyLimit !== undefined) {
      updates.monthly_limit = settings.monthlyLimit;
    }

    if (settings.isActive !== undefined) {
      updates.is_active = settings.isActive;
    }

    if (settings.alertThreshold !== undefined) {
      updates.alert_threshold = settings.alertThreshold;
    }

    if (settings.alertChannels !== undefined) {
      updates.alert_channels = settings.alertChannels;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid updates provided." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from(TABLE_NAME)
      .update(updates)
      .eq("id", id)
      .eq("user_id", userId) // Security: Ensure owner
      .select("id,name,key_value,key_type,usage_count,monthly_limit,created_at,is_active,alert_threshold,alert_channels")
      .single();

    if (error) {
      const limitMessage = getApiKeyLimitDatabaseMessage(error);
      return NextResponse.json(
        { error: limitMessage || "Failed to update API key." },
        { status: limitMessage ? 409 : 500 },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    const safeMessage = getSafeApiKeyValidationError(err, "Failed to update API key.");
    const unauthorized = err instanceof Error && /unauthorized/i.test(err.message);
    const unavailable = err instanceof UsageDataUnavailableError;
    return NextResponse.json({ error: unauthorized ? "Unauthorized" : unavailable ? "API key usage is temporarily unavailable." : safeMessage }, { status: unauthorized ? 401 : unavailable ? 503 : safeMessage === "Failed to update API key." ? 500 : 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const userId = await getAuthenticatedUserId();
    const { id } = await context.params;
    if (!isUuid(id)) {
      return NextResponse.json({ error: "Invalid API key ID." }, { status: 400 });
    }

    const { data: deletionState, error: deletionError } = await supabaseAdmin.rpc(
      "begin_owned_api_key_deletion",
      { p_profile_id: userId, p_key_id: id },
    );

    if (deletionError) {
      console.error("API key deletion transaction failed.");
      return NextResponse.json(
        { error: "API key deletion is temporarily unavailable." },
        { status: 503, headers: noStoreHeaders },
      );
    }

    if (deletionState === "deletion_pending") {
      return NextResponse.json(
        { error: "Account deletion is pending. API keys cannot be changed." },
        { status: 409, headers: noStoreHeaders },
      );
    }

    if (deletionState === "not_found" || deletionState === "profile_missing") {
      return NextResponse.json(
        { error: "API key not found." },
        { status: 404, headers: noStoreHeaders },
      );
    }

    if (deletionState !== "deleted" && deletionState !== "cleanup_pending") {
      console.error("API key deletion returned an invalid state.");
      return NextResponse.json(
        { error: "API key deletion is temporarily unavailable." },
        { status: 503, headers: noStoreHeaders },
      );
    }

    try {
      await deleteApiKeyRedisData(id);
    } catch {
      return NextResponse.json(
        { error: "The API key was deleted, but cleanup is incomplete. Retry deletion." },
        { status: 503, headers: noStoreHeaders },
      );
    }

    const { error: cleanupError } = await supabaseAdmin.rpc(
      "acknowledge_api_key_redis_cleanup",
      { p_profile_id: userId, p_key_id: id },
    );
    if (cleanupError) {
      console.error("API key Redis cleanup acknowledgement failed.");
      return NextResponse.json(
        { error: "The API key was deleted, but cleanup confirmation is pending. Retry deletion." },
        { status: 503, headers: noStoreHeaders },
      );
    }

    return new NextResponse(null, { status: 204, headers: noStoreHeaders });
  } catch (err) {
    const unauthorized = err instanceof Error && /unauthorized/i.test(err.message);
    return NextResponse.json({ error: unauthorized ? "Unauthorized" : "Failed to delete API key." }, { status: unauthorized ? 401 : 500 });
  }
}
