import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return NextResponse.json({ plan: "Hobby" });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("plan")
      .eq("email", user.email)
      .single();

    return NextResponse.json({ plan: profile?.plan || "Hobby" });
  } catch (err) {
    console.error("Failed to fetch fresh profile plan:", err);
    return NextResponse.json({ plan: "Hobby" });
  }
}
