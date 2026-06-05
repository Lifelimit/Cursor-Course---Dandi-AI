import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUserId } from "@/lib/services/auth.service";
import { assertCanActivateKeys, getUserPlan } from "@/lib/services/api-key-limits.service";
import { getJsonObject, parseApiKeySettings } from "@/lib/request-validation";
import { isUuid } from "@/lib/security-core";

const TABLE_NAME = "api_keys";

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
    const body = getJsonObject(await request.json());
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
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      let usageCount = keyData.usage_count || 0;
      try {
        const { redis } = await import("@/lib/redis");
        const redisUsage = await redis.get<number>(`usage:key:${id}:${currentMonth}`);
        if (redisUsage !== null) {
          usageCount = redisUsage;
        }
      } catch (err) {
        console.warn("⚠️ Redis read failed in key PATCH:", err);
      }

      if (settings.monthlyLimit <= usageCount) {
        return NextResponse.json(
          { error: `New monthly limit must be strictly greater than the current usage of ${usageCount} credits.` },
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

    if (settings.alertPhone !== undefined) {
      updates.alert_phone = settings.alertPhone;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid updates provided." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from(TABLE_NAME)
      .update(updates)
      .eq("id", id)
      .eq("user_id", userId) // Security: Ensure owner
      .select("id,name,key_value,key_type,usage_count,monthly_limit,created_at,is_active,alert_threshold,alert_channels,alert_phone")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const userId = await getAuthenticatedUserId();
    const { id } = await context.params;
    if (!isUuid(id)) {
      return NextResponse.json({ error: "Invalid API key ID." }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from(TABLE_NAME)
      .delete()
      .eq("id", id)
      .eq("user_id", userId); // Security: Ensure owner

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
