import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUserId } from "@/lib/services/auth.service";
import { Redis } from "@upstash/redis";
import { PLAN_DETAILS } from "@/lib/constants";

const TABLE_NAME = "api_keys";
const redis = Redis.fromEnv();

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
  alert_threshold: number | null;
  alert_channels: string[] | null;
  alert_phone: string | null;
};

function buildKeyValue() {
  return `sk_live_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
}

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("plan")
      .eq("id", userId)
      .single();

    const plan = profile?.plan || "Hobby";
    const planDetail = PLAN_DETAILS[plan as keyof typeof PLAN_DETAILS] || PLAN_DETAILS["Hobby"];
    let monthlyLimit: number | null = null;
    if (planDetail.features[0].includes("Unlimited")) {
      monthlyLimit = null;
    } else {
      const match = planDetail.features[0].match(/(\d+,?\d+)/);
      if (match) {
        monthlyLimit = parseInt(match[0].replace(",", ""));
      }
    }

    const { data, error } = await supabaseAdmin
      .from(TABLE_NAME)
      .select("id,name,key_value,key_type,usage_count,monthly_limit,created_at,is_active,alert_threshold,alert_channels,alert_phone")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const pipeline = redis.pipeline();
    (data ?? []).forEach(k => {
      pipeline.get(`usage:key:${k.id}:${currentMonth}`);
    });
    const keyUsageCounts = await pipeline.exec<number[]>();

    const mappedKeys = (data ?? []).map((k, index) => ({
      ...k,
      usage_count: keyUsageCounts[index] || 0,
      monthly_limit: k.monthly_limit ?? monthlyLimit
    }));

    return NextResponse.json(mappedKeys as ApiKeyRow[]);
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
      .select("id,name,key_value,key_type,usage_count,monthly_limit,created_at,is_active,alert_threshold,alert_channels,alert_phone")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as ApiKeyRow, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}



