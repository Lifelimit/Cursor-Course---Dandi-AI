import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getJsonObject, validatePaymentMethodId } from "@/lib/request-validation";
import { getOwnedPaymentMethod } from "@/lib/services/stripe-safety.service";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = getJsonObject(await req.json());
    const paymentMethodId = validatePaymentMethodId(body.paymentMethodId);

    // 1. Get Customer ID from Supabase
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    const customerId = profile?.stripe_customer_id;
    if (!customerId) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const pm = await getOwnedPaymentMethod(paymentMethodId, customerId);

    // 2. Update Stripe Customer
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // 3. Retrieve the payment method details for immediate DB update
    if (pm.card) {
      await supabase
        .from("profiles")
        .update({
          payment_method_brand: pm.card.brand,
          payment_method_last4: pm.card.last4,
          payment_method_expiry: `${pm.card.exp_month}/${pm.card.exp_year}`,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Set Default Payment Error:", err);
    const message = err instanceof Error ? err.message : "Failed to set default payment method";
    const lowerMessage = message.toLowerCase();
    const status = lowerMessage.includes("payment method") || lowerMessage.includes("invalid") ? 400 : 500;
    return NextResponse.json({ error: status === 500 ? "Failed to set default payment method" : message }, { status });
  }
}
