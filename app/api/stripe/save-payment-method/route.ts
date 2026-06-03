import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getJsonObject, validatePaymentMethodId } from "@/lib/request-validation";
import { getOwnedPaymentMethod } from "@/lib/services/stripe-safety.service";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = getJsonObject(await req.json());
    const paymentMethodId = validatePaymentMethodId(body.paymentMethodId);
    const billingDetails = getJsonObject(body.billingDetails);

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
    const pm = await getOwnedPaymentMethod(paymentMethodId, customerId, { allowUnattached: true });
    const newFingerprint = pm.card?.fingerprint;

    // Check for duplicate fingerprint to prevent linking multiple identical cards
    if (newFingerprint) {
      const existingMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
      });

      const isDuplicate = existingMethods.data.some(
        (existingPm) =>
          existingPm.id !== paymentMethodId &&
          existingPm.card?.fingerprint === newFingerprint
      );

      if (isDuplicate) {
        console.warn(`⚠️ Save Payment Method: Duplicate card detected (fingerprint: ${newFingerprint}). PM: ${paymentMethodId}`);
        // If already attached, detach it
        if (pm.customer === customerId) {
          await stripe.paymentMethods.detach(paymentMethodId);
        }
        return NextResponse.json(
          { error: "This card is already linked to your account." },
          { status: 400 }
        );
      }
    }

    // 3. Attach PaymentMethod to Customer (if not already attached)
    if (!pm.customer) {
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

    if (body.billingDetails && typeof body.billingDetails === "object") {
      updateData.billing_street = typeof billingDetails.street === "string" ? billingDetails.street : null;
      updateData.billing_city = typeof billingDetails.city === "string" ? billingDetails.city : null;
      updateData.billing_state = typeof billingDetails.state === "string" ? billingDetails.state : null;
      updateData.billing_zip = typeof billingDetails.zip === "string" ? billingDetails.zip : null;
      updateData.billing_country = typeof billingDetails.country === "string" ? billingDetails.country : null;
    }

    // Update profiles table
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update(updateData)
      .eq("id", user.id);
    if (profileError) {
      console.error("❌ Save PM: Failed to update profile in database:", profileError.message);
      throw new Error(`Database profile update failed: ${profileError.message}`);
    }

    // Update auth metadata
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, ...updateData },
    });
    if (authError) {
      console.error("❌ Save PM: Failed to update auth metadata:", authError.message);
      throw new Error(`Auth metadata update failed: ${authError.message}`);
    }

    return NextResponse.json({ success: true, paymentMethod: updateData });
  } catch (err) {
    console.error("Save Payment Method Error:", err);
    const message = err instanceof Error ? err.message : "Failed to save payment method";
    const lowerMessage = message.toLowerCase();
    const status = lowerMessage.includes("payment method") || lowerMessage.includes("invalid") ? 400 : 500;
    return NextResponse.json({ error: status === 500 ? "Failed to save payment method" : message }, { status });
  }
}
