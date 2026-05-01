import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUserId } from "@/lib/services/auth.service";

const TABLE_NAME = "api_keys";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type UpdatePayload = {
  name?: string;
  keyType?: "development" | "production";
  monthlyLimit?: number | null;
  is_active?: boolean;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const userId = await getAuthenticatedUserId();
    const { id } = await context.params;
    const body = (await request.json()) as UpdatePayload;

    const updates: Record<string, string | number | boolean | null> = {};

    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (!name) {
        return NextResponse.json({ error: "Name is required." }, { status: 400 });
      }
      updates.name = name;
    }

    if (body.keyType === "development" || body.keyType === "production") {
      updates.key_type = body.keyType;
    }

    if (typeof body.monthlyLimit === "number" || body.monthlyLimit === null) {
      updates.monthly_limit = body.monthlyLimit;
    }

    if (typeof body.is_active === "boolean") {
      updates.is_active = body.is_active;
    }

    const { data, error } = await supabaseAdmin
      .from(TABLE_NAME)
      .update(updates)
      .eq("id", id)
      .eq("user_id", userId) // Security: Ensure owner
      .select("id,name,key_value,key_type,usage_count,monthly_limit,created_at,is_active")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const userId = await getAuthenticatedUserId();
    const { id } = await context.params;

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

