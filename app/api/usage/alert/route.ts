import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUserId } from "@/lib/services/auth.service";

export async function PATCH(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const { keyId, threshold, channels, phone } = await request.json();

    if (!keyId) {
      return NextResponse.json({ error: "keyId is required" }, { status: 400 });
    }

    // Build update object dynamically
    const updateData: Record<string, unknown> = {};
    if (threshold !== undefined) updateData.alert_threshold = threshold;
    if (channels !== undefined) updateData.alert_channels = channels;
    if (phone !== undefined) updateData.alert_phone = phone;

    // Verify ownership and update
    const { error } = await supabaseAdmin
      .from("api_keys")
      .update(updateData)
      .eq("id", keyId)
      .eq("user_id", userId);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
