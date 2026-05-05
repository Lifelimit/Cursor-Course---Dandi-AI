import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
    const email = session?.user?.email;

    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { paymentMethodId } = await req.json();
    if (!paymentMethodId) {
      return NextResponse.json({ error: "Missing paymentMethodId" }, { status: 400 });
    }

    // 1. Get Customer ID from Supabase
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("email", email)
      .single();

    const customerId = profile?.stripe_customer_id;
    if (!customerId) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // 2. Update Stripe Customer
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // 3. Retrieve the payment method details for immediate DB update
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (pm.card) {
      await supabaseAdmin
        .from("profiles")
        .update({
          payment_method_brand: pm.card.brand,
          payment_method_last4: pm.card.last4,
          payment_method_expiry: `${pm.card.exp_month}/${pm.card.exp_year}`,
          updated_at: new Date().toISOString()
        })
        .eq("email", email);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Set Default Payment Error:", err);
    return NextResponse.json({ error: "Failed to set default payment method" }, { status: 500 });
  }
}
