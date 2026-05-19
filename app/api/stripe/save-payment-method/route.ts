import { createClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

const supabaseAdmin = createSupabaseClient(
  serverEnv.NEXT_PUBLIC_SUPABASE_URL,
  serverEnv.SUPABASE_SERVICE_ROLE_KEY,
  {
    global: {
      fetch: (url, options) => fetch(url, { ...options, cache: "no-store" })
    }
  }
);

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { paymentMethodId, billingDetails } = await req.json();

    if (!paymentMethodId) {
      return NextResponse.json({ error: "Payment method ID is required" }, { status: 400 });
    }

    // 1. Retrieve the customer ID
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    const customerId = profile?.stripe_customer_id;
    if (!customerId) {
      return NextResponse.json({ error: "Stripe customer not found" }, { status: 404 });
    }

    // 2. Retrieve PaymentMethod from Stripe to get brand, last4, expiry
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);

    // 3. Attach PaymentMethod to Customer (if not already attached)
    if (pm.customer !== customerId) {
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    }

    // 4. Set as default payment method
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // 5. Update profiles and user_metadata
    const updateData: Record<string, string | null> = {
      payment_method_last4: pm.card?.last4 || null,
      payment_method_brand: pm.card?.brand || null,
      payment_method_expiry: pm.card ? `${pm.card.exp_month}/${pm.card.exp_year}` : null,
    };

    if (billingDetails) {
      updateData.billing_street = billingDetails.street || null;
      updateData.billing_city = billingDetails.city || null;
      updateData.billing_state = billingDetails.state || null;
      updateData.billing_zip = billingDetails.zip || null;
      updateData.billing_country = billingDetails.country || null;
    }

    // Update profiles table
    await supabaseAdmin
      .from("profiles")
      .update(updateData)
      .eq("id", user.id);

    // Update auth metadata
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, ...updateData },
    });

    return NextResponse.json({ success: true, paymentMethod: updateData });
  } catch (err) {
    console.error("Save Payment Method Error:", err);
    return NextResponse.json({ error: "Failed to save payment method" }, { status: 500 });
  }
}
