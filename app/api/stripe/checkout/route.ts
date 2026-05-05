import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id || !session?.user?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = session.user as { id: string; email: string; stripe_customer_id?: string };
    const { priceId, planId } = await req.json();

    if (!priceId) {
      return new NextResponse("Price ID is required", { status: 400 });
    }

    // Log the metadata we're about to send
    console.log("💳 Creating Stripe Checkout Session", {
      userId: user.id,
      email: user.email,
      planId,
      priceId
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
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?canceled=true`,
      customer: user.stripe_customer_id || undefined,
      customer_email: user.stripe_customer_id ? undefined : user.email,
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
