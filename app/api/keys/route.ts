import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const TABLE_NAME = "api_keys";

type ApiKeyRow = {
  id: string;
  name: string;
  key_value: string;
  key_type: "development" | "production";
  usage_count: number;
  monthly_limit: number | null;
  created_at: string;
};

function buildKeyValue() {
  return `sk_live_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from(TABLE_NAME)
    .select("id,name,key_value,key_type,usage_count,monthly_limit,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((data ?? []) as ApiKeyRow[]);
}

export async function POST(request: Request) {
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
    })
    .select("id,name,key_value,key_type,usage_count,monthly_limit,created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data as ApiKeyRow, { status: 201 });
}
