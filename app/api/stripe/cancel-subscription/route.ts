import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia" as const,
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
    const email = session?.user?.email;

    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { keysToKeep } = await req.json();

    if (!Array.isArray(keysToKeep) || keysToKeep.length > 3) {
      return NextResponse.json({ error: "Invalid keys selection" }, { status: 400 });
    }

    // 1. Get user profile and stripe customer ID
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("email", email)
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
  } catch (err) {
    console.error("Cancellation Error:", err);
    return NextResponse.json({ error: "Failed to schedule cancellation" }, { status: 500 });
  }
}
