import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUserId } from "@/lib/services/auth.service";
import { assertCanActivateKeys, getUserPlan } from "@/lib/services/api-key-limits.service";
import { getJsonObject, parseApiKeySettings } from "@/lib/request-validation";
import { isUuid } from "@/lib/security-core";

export async function PATCH(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const body = getJsonObject(await request.json());
    const keyId = body.keyId;

    if (!isUuid(keyId)) {
      return NextResponse.json({ error: "A valid keyId is required" }, { status: 400 });
    }

    const plan = await getUserPlan(userId);
    const settings = parseApiKeySettings(
      {
        alertThreshold: body.threshold,
        alertChannels: body.channels,
        phone: body.phone,
        monthlyLimit: body.monthlyLimit,
        isActive: body.isActive,
      },
      { plan, partial: true }
    );

    if (settings.isActive === true) {
      await assertCanActivateKeys(userId, plan, [keyId]);
    }

    // Fetch existing API key data for guardrail validation
    const { data: keyData, error: fetchError } = await supabaseAdmin
      .from("api_keys")
      .select("monthly_limit, alert_threshold, usage_count")
      .eq("id", keyId)
      .eq("user_id", userId)
      .single();

    if (fetchError || !keyData) {
      return NextResponse.json({ error: "API key not found." }, { status: 404 });
    }

    // Enforce guardrail: monthlyLimit must be strictly greater than current usage count
    if (settings.monthlyLimit !== undefined && settings.monthlyLimit !== null) {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      let usageCount = keyData.usage_count || 0;
      try {
        const { redis } = await import("@/lib/redis");
        const redisUsage = await redis.get<number>(`usage:key:${keyId}:${currentMonth}`);
        if (redisUsage !== null) {
          usageCount = redisUsage;
        }
      } catch (err) {
        console.warn("⚠️ Redis read failed in usage alert PATCH:", err);
      }

      if (settings.monthlyLimit <= usageCount) {
        return NextResponse.json(
          { error: `New monthly request limit must be strictly greater than the current usage of ${usageCount} requests.` },
          { status: 400 }
        );
      }
    }

    // Build update object dynamically
    const updateData: Record<string, unknown> = {};
    if (settings.alertThreshold !== undefined) updateData.alert_threshold = settings.alertThreshold;
    if (settings.alertChannels !== undefined) updateData.alert_channels = settings.alertChannels;
    if (settings.alertPhone !== undefined) updateData.alert_phone = settings.alertPhone;
    if (settings.monthlyLimit !== undefined) updateData.monthly_limit = settings.monthlyLimit;
    if (settings.isActive !== undefined) updateData.is_active = settings.isActive;

    // Verify ownership and update
    const { error } = await supabaseAdmin
      .from("api_keys")
      .update(updateData)
      .eq("id", keyId)
      .eq("user_id", userId);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
