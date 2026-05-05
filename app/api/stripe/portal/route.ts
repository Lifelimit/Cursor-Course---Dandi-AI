import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // We need to find the Stripe Customer ID for this user.
    // Normally, you would store this in your Supabase 'profiles' table.
    // For now, we'll try to find them by email in Stripe.
    const customers = await stripe.customers.list({
      email: session.user.email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return new NextResponse("Customer not found", { status: 404 });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("[STRIPE_PORTAL_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
