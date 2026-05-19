import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { paymentMethodId } = await req.json();
    if (!paymentMethodId) {
      return NextResponse.json({ error: "Missing paymentMethodId" }, { status: 400 });
    }

    // 1. Get Customer ID and Current Default PM from Supabase
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, payment_method_last4")
      .eq("id", user.id)
      .single();

    const customerId = profile?.stripe_customer_id;
    if (!customerId) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // 2. Detach Payment Method from Stripe
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    
    // Check if this card is the one stored in Supabase
    const isCurrentDefaultInDB = profile.payment_method_last4 === pm.card?.last4;

    await stripe.paymentMethods.detach(paymentMethodId);

    // 3. If we deleted the card that was shown as "Primary" in our DB, 
    // we should try to find a new one to show or clear it.
    if (isCurrentDefaultInDB) {
      const remainingMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
        limit: 1
      });

      if (remainingMethods.data.length > 0) {
        const newPM = remainingMethods.data[0];
        // Set this new one as default in Stripe if no default is set
        await stripe.customers.update(customerId, {
          invoice_settings: { default_payment_method: newPM.id }
        });

        await supabase
          .from("profiles")
          .update({
            payment_method_brand: newPM.card?.brand,
            payment_method_last4: newPM.card?.last4,
            payment_method_expiry: `${newPM.card?.exp_month}/${newPM.card?.exp_year}`,
            updated_at: new Date().toISOString()
          })
          .eq("id", user.id);
      } else {
        // No cards left
        await supabase
          .from("profiles")
          .update({
            payment_method_brand: null,
            payment_method_last4: null,
            payment_method_expiry: null,
            updated_at: new Date().toISOString()
          })
          .eq("id", user.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete Payment Error:", err);
    const message = err instanceof Error ? err.message : "Failed to delete payment method";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
