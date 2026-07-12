import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUserId } from "@/lib/services/auth.service";
import { sendWebhookTestDelivery } from "@/lib/services/webhook-test.service";
import { checkRateLimit, createIpRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const webhookTestRateLimit = createIpRateLimit("@upstash/ratelimit:webhook-test", 5, "60 s");

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Origin is not allowed." }, { status: 403 });
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
    return NextResponse.json({ error: "Webhook test delivery must be explicitly confirmed." }, { status: 400 });
  }

  try {
    const userId = await getAuthenticatedUserId();
    const rateLimited = await checkRateLimit(request, webhookTestRateLimit, {}, {
      key: `user:${userId}`,
      failClosed: true,
      errorBody: { error: "Too many webhook test deliveries. Please wait before trying again." },
      outageMessage: "Redis was unavailable during webhook test rate limiting; blocking the outbound delivery.",
    });
    if (rateLimited) return rateLimited;

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
