import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUserId } from "@/lib/services/auth.service";

export async function PATCH(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const { keyId, threshold } = await request.json();

    if (!keyId) {
      return NextResponse.json({ error: "keyId is required" }, { status: 400 });
    }

    // Verify ownership and update
    const { error } = await supabaseAdmin
      .from("api_keys")
      .update({ alert_threshold: threshold })
      .eq("id", keyId)
      .eq("user_id", userId);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
