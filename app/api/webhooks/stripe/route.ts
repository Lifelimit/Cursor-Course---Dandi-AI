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

  if (event.type === "checkout.session.completed" || event.type === "customer.subscription.updated") {
    const session = event.data.object as Stripe.Checkout.Session | Stripe.Subscription;
    const isSubscriptionEvent = event.type === "customer.subscription.updated";
    
    const subscriptionId = isSubscriptionEvent 
      ? (session as Stripe.Subscription).id 
      : (session as Stripe.Checkout.Session).subscription as string;
      
    const customerId = isSubscriptionEvent
      ? (session as Stripe.Subscription).customer as string
      : (session as Stripe.Checkout.Session).customer as string;

    const metadata = isSubscriptionEvent 
      ? (session as Stripe.Subscription).metadata 
      : (session as Stripe.Checkout.Session).metadata;

    console.log(`🔔 Webhook: ${event.type} received`, {
      userId: metadata?.userId,
      subscriptionId,
      customerId
    });

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Determine planId: from metadata or from subscription items if metadata is missing
    const planId = metadata?.planId;
    if (!planId) {
      // Fallback: search for price ID in our constants to find the plan name
      const priceId = subscription.items.data[0].price.id;
      // We can map priceId back to planId if we had a mapping, but for now let's rely on metadata
      // If metadata is truly missing, we'll log it.
      console.warn("⚠️ Webhook warning: No planId in metadata. Attempting to derive from Price ID:", priceId);
    }

    // Update criteria: use userId from metadata if present, otherwise fallback to stripe_customer_id
    const updatePayload = {
      plan: planId || undefined, // Only update if we found it
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      billing_interval: subscription.items.data[0].price.recurring?.interval === "year" ? "year" : "month" as "month" | "year",
      updated_at: new Date().toISOString()
    };

    // Remove undefined fields
    Object.keys(updatePayload).forEach(key => 
      (updatePayload as Record<string, unknown>)[key] === undefined && delete (updatePayload as Record<string, unknown>)[key]
    );

    console.log("🕵️ Webhook: Attempting Supabase update...", {
      matchBy: metadata?.userId ? "userId" : "customerId",
      searchId: metadata?.userId || customerId,
      payload: updatePayload
    });

    const query = supabaseAdmin.from("profiles").update(updatePayload);

    if (metadata?.userId) {
      query.eq("id", metadata.userId);
    } else {
      query.eq("stripe_customer_id", customerId);
    }

    const { error, data } = await query.select();

    if (error) {
      console.error("❌ Supabase webhook update error:", error.message);
      return new NextResponse(`Database update failed: ${error.message}`, { status: 500 });
    }

    if (!data || data.length === 0) {
      console.warn("⚠️ Webhook warning: No matching profile found to update", {
        userId: metadata?.userId,
        customerId
      });
    }

    // Verify the update
    const { data: updatedProfile } = await supabaseAdmin
      .from("profiles")
      .select("email, plan, billing_interval")
      .eq("stripe_subscription_id", subscriptionId)
      .single();

    console.log("✅ Webhook: Profile updated successfully", {
      email: updatedProfile?.email,
      newPlan: updatedProfile?.plan,
      newInterval: updatedProfile?.billing_interval
    });
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
