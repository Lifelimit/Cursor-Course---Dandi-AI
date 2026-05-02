import { auth } from "@/auth";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia" as const,
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    const email = session?.user?.email;

    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Get or Create Customer
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("email", email)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({ email });
      customerId = customer.id;
      
      await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("email", email);
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";

    // 2. Create Setup Session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "setup",
      customer: customerId,
      success_url: `${origin}/billing?success=true`,
      cancel_url: `${origin}/billing?canceled=true`,
      metadata: {
        userId: session.user.id,
        type: "setup"
      }
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("Setup Session Error:", err);
    return NextResponse.json({ error: "Failed to create setup session" }, { status: 500 });
  }
}
