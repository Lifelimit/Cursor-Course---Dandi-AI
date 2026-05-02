import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

// Service Role client for bypassing RLS to update plans
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("Stripe-Signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new NextResponse(`Webhook Error: ${message}`, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (event.type === "checkout.session.completed") {
    console.log("🔔 Webhook: checkout.session.completed received", {
      userId: session.metadata?.userId,
      planId: session.metadata?.planId,
      subscriptionId: session.subscription
    });

    if (!session?.metadata?.userId || !session?.metadata?.planId) {
      console.error("❌ Webhook error: Missing metadata in session", session.id);
      return new NextResponse("Metadata is required", { status: 400 });
    }

    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    );

    // Update the profile in Supabase
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        plan: session.metadata.planId,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
        billing_interval: subscription.items.data[0].price.recurring?.interval === "year" ? "year" : "month",
        updated_at: new Date().toISOString()
      })
      .eq("id", session.metadata.userId);

    if (error) {
      console.error("❌ Supabase webhook error:", error.message, {
        userId: session.metadata.userId,
        plan: session.metadata.planId
      });
      return new NextResponse(`Database update failed: ${error.message}`, { status: 500 });
    }

    console.log("✅ Webhook: Profile updated successfully for user", session.metadata.userId);
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    
    // Downgrade user to Hobby plan if subscription is cancelled
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        plan: "Hobby",
        billing_interval: "month",
        updated_at: new Date().toISOString()
      })
      .eq("stripe_subscription_id", subscription.id);

    if (error) {
      console.error("Supabase webhook cancellation error:", error);
      return new NextResponse("Database update failed", { status: 500 });
    }
  }

  return new NextResponse(null, { status: 200 });
}
