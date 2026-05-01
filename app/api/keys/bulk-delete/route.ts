import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUserId } from "@/lib/services/auth.service";

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const body = (await request.json()) as { ids: string[] };

    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json({ error: "ids array is required." }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("api_keys")
      .delete()
      .in("id", body.ids)
      .eq("user_id", userId); // Security: only delete keys belonging to this user

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted: body.ids.length });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
