import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { deliverPendingWebhooks } from "@/lib/services/webhook-delivery.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function hasValidCronAuthorization(request: Request, expectedSecret: string) {
  const authorization = request.headers.get("authorization") ?? "";
  const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const expectedBuffer = Buffer.from(expectedSecret);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length > 0
    && expectedBuffer.length === suppliedBuffer.length
    && crypto.timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export async function GET(request: Request) {
  const cronSecret = getServerEnv().CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Webhook delivery worker is not configured." }, { status: 503 });
  }

  if (!hasValidCronAuthorization(request, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await deliverPendingWebhooks();
    return NextResponse.json({ success: true, ...result }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    console.error("Webhook delivery worker failed to process its queue.");
    return NextResponse.json({ error: "Webhook delivery worker failed." }, { status: 503 });
  }
}
