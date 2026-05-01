import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUserId } from "@/lib/services/auth.service";

const TABLE_NAME = "api_keys";

type ApiKeyRow = {
  id: string;
  name: string;
  key_value: string;
  key_type: "development" | "production";
  usage_count: number;
  monthly_limit: number | null;
  created_at: string;
  user_id: string;
  is_active: boolean;
};

function buildKeyValue() {
  return `sk_live_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
}

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();

    const { data, error } = await supabaseAdmin
      .from(TABLE_NAME)
      .select("id,name,key_value,key_type,usage_count,monthly_limit,created_at,is_active")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json((data ?? []) as ApiKeyRow[]);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const body = await request.json();

    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const keyType = body?.keyType === "production" ? "production" : "development";
    const monthlyLimit =
      typeof body?.monthlyLimit === "number" && Number.isFinite(body.monthlyLimit)
        ? body.monthlyLimit
        : null;

    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from(TABLE_NAME)
      .insert({
        name,
        key_value: buildKeyValue(),
        key_type: keyType,
        usage_count: 0,
        monthly_limit: monthlyLimit,
        user_id: userId,
      })
      .select("id,name,key_value,key_type,usage_count,monthly_limit,created_at,is_active")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as ApiKeyRow, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}



