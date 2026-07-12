import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { validateUuidList } from "@/lib/request-validation";
import { getAuthenticatedBillingUser } from "@/lib/services/stripe-route.service";

export async function POST(req: Request) {
  try {
    const { supabase, user, response } = await getAuthenticatedBillingUser();
    if (response) return response;

    let rawKeysToKeep: unknown;
    try {
      const body = await req.json();
      rawKeysToKeep = body && typeof body === "object" && !Array.isArray(body)
        ? (body as Record<string, unknown>).keysToKeep
        : undefined;
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }
    let keysToKeep: string[];

    try {
      keysToKeep = validateUuidList(rawKeysToKeep, { min: 0, max: 3 });
    } catch {
      return NextResponse.json({ error: "Invalid keys selection" }, { status: 400 });
    }

    if (keysToKeep.length > 0) {
      const { data: ownedKeys, error: ownedError } = await supabase
        .from("api_keys")
        .select("id")
        .eq("user_id", user.id)
        .in("id", keysToKeep);

      if (ownedError || (ownedKeys?.length ?? 0) !== keysToKeep.length) {
        return NextResponse.json({ error: "Invalid keys selection" }, { status: 400 });
      }
    }

    // 1. Get user profile and stripe customer ID
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: "No Stripe customer found" }, { status: 404 });
    }

    // 2. Get active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
    }

    const subscription = subscriptions.data[0];

    // 3. Schedule cancellation at period end and store keys to keep
    await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true,
      metadata: {
        keys_to_keep: JSON.stringify(keysToKeep),
        cancel_requested_at: new Date().toISOString(),
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    console.error("Subscription cancellation scheduling failed.");
    return NextResponse.json({ error: "Failed to schedule cancellation" }, { status: 500 });
  }
}
