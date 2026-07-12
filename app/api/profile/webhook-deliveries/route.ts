import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWebhookDeliveryHistory } from "@/lib/services/webhook-delivery.service";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
};

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const deliveries = await getWebhookDeliveryHistory(user.id);
    return NextResponse.json({ deliveries }, { headers: noStoreHeaders });
  } catch {
    console.error("Failed to load webhook delivery history.");
    return NextResponse.json({ error: "Webhook delivery history is temporarily unavailable." }, { status: 503 });
  }
}
