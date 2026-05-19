import { stripe } from "@/lib/stripe";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { priceId, planId } = await req.json();

    if (!priceId) {
      return new NextResponse("Price ID is required", { status: 400 });
    }

    // Retrieve stripe_customer_id from the user's database profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    const stripeCustomerId = profile?.stripe_customer_id;

    // Log the metadata we're about to send
    console.log("💳 Creating Stripe Checkout Session", {
      userId: user.id,
      email: user.email,
      planId,
      priceId,
      stripeCustomerId
    });

    // Create a Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${publicEnv.NEXT_PUBLIC_APP_URL}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${publicEnv.NEXT_PUBLIC_APP_URL}/billing?canceled=true`,
      customer: stripeCustomerId || undefined,
      customer_email: stripeCustomerId ? undefined : user.email,
      metadata: {
        userId: user.id,
        userEmail: user.email,
        planId: planId,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          userEmail: user.email,
          planId: planId,
        },
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("[STRIPE_CHECKOUT_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
