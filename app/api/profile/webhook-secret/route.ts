import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateWebhookSigningSecret, getWebhookSecretMetadata } from "@/lib/services/webhook-secret.service";

export const dynamic = "force-dynamic";

const secretResponseHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "Pragma": "no-cache",
};

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Origin is not allowed." }, { status: 403 });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
      return NextResponse.json({ error: "Content-Type must be application/json." }, { status: 415 });
    }

    let body: Record<string, unknown>;
    try {
      const parsed = await request.json();
      body = parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : {};
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    if (body.confirm !== true) {
      return NextResponse.json({ error: "Secret rotation must be explicitly confirmed." }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("webhook_url")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Failed to load webhook settings for secret rotation.");
      return NextResponse.json({ error: "Failed to rotate webhook signing secret." }, { status: 500 });
    }
    if (!profile?.webhook_url) {
      return NextResponse.json({ error: "Save a webhook endpoint before rotating its signing secret." }, { status: 400 });
    }

    const newWebhookSecret = generateWebhookSigningSecret();
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        webhook_secret: newWebhookSecret,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to rotate webhook signing secret.");
      return NextResponse.json({ error: "Failed to rotate webhook signing secret." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      newWebhookSecret,
      ...getWebhookSecretMetadata(newWebhookSecret),
      webhookFailureCount: 0,
      webhookDisabledUntil: null,
    }, { headers: secretResponseHeaders });
  } catch {
    console.error("Webhook signing secret rotation failed.");
    return NextResponse.json({ error: "Failed to rotate webhook signing secret." }, { status: 500 });
  }
}
