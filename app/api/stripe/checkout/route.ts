import { stripe } from "@/lib/stripe";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { resolvePaidPlanRequest } from "@/lib/billing-catalog";
import { getJsonObject } from "@/lib/request-validation";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = getJsonObject(await req.json());
    const planRequest = resolvePaidPlanRequest(body);

    if (!planRequest) {
      return new NextResponse("Invalid plan or price selection", { status: 400 });
    }

    // Retrieve stripe_customer_id from the user's database profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    let stripeCustomerId = profile?.stripe_customer_id;

    if (!stripeCustomerId && user.email) {
      // Deduplicate: search Stripe for a customer with this email
      const existingCustomers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        stripeCustomerId = existingCustomers.data[0].id;
        
        // Link customer to the database profile in Supabase
        await supabase
          .from("profiles")
          .update({ stripe_customer_id: stripeCustomerId })
          .eq("id", user.id);
      }
    }

    // Log the metadata we're about to send
    console.log("💳 Creating Stripe Checkout Session", {
      userId: user.id,
      email: user.email,
      planId: planRequest.planId,
      priceId: planRequest.priceId,
      stripeCustomerId
    });

    // Create a Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: planRequest.priceId,
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
        planId: planRequest.planId,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          userEmail: user.email,
          planId: planRequest.planId,
        },
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("[STRIPE_CHECKOUT_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
