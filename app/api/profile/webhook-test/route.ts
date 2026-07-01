import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUserId } from "@/lib/services/auth.service";
import { sendWebhookTestDelivery } from "@/lib/services/webhook-test.service";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const userId = await getAuthenticatedUserId();

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("webhook_url, webhook_secret")
      .eq("id", userId)
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to load webhook configuration." }, { status: 500 });
    }

    const webhookUrl = profile?.webhook_url || "";
    const signingSecret = profile?.webhook_secret || "";
    if (!webhookUrl || !signingSecret) {
      return NextResponse.json({ error: "Save a webhook endpoint before sending a test delivery." }, { status: 400 });
    }

    const result = await sendWebhookTestDelivery({ webhookUrl, signingSecret });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook test delivery failed.";
    const status = message.toLowerCase().includes("unauthorized") ? 401 : 500;
    return NextResponse.json({ error: status === 401 ? "Unauthorized" : "Webhook test delivery failed." }, { status });
  }
}
