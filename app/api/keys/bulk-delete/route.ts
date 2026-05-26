import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUserId } from "@/lib/services/auth.service";

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const body = (await request.json()) as { ids: string[]; action?: "disable" | "enable" };

    if (
      !Array.isArray(body.ids) || 
      body.ids.length === 0 || 
      body.ids.length > 50 || 
      !body.ids.every(id => typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    ) {
      return NextResponse.json(
        { error: "ids array is required, must contain only valid UUIDs, and must not exceed 50 items." },
        { status: 400 }
      );
    }

    const isActive = body.action === "enable";

    const { error } = await supabaseAdmin
      .from("api_keys")
      .update({ is_active: isActive })
      .in("id", body.ids)
      .eq("user_id", userId); // Security: only touch keys belonging to this user

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, affected: body.ids.length, action: isActive ? "enabled" : "disabled" });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
