import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const { key } = await request.json();

    if (!key) {
      return NextResponse.json({ error: "API key is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("api_keys")
      .select("id, name")
      .eq("key_value", key)
      .single();

    if (error || !data) {
      return NextResponse.json({ valid: false, error: "Invalid API key" }, { status: 404 });
    }

    return NextResponse.json({ valid: true, name: data.name });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
