import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getJsonObject, validateBillingDetails, validatePaymentMethodId } from "@/lib/request-validation";
import { getOwnedPaymentMethod } from "@/lib/services/stripe-safety.service";
import {
  buildPaymentMethodProfilePayload,
  getAuthenticatedBillingUser,
  getBillingProfile,
  mapStripeErrorResponse,
  persistDefaultPaymentMethod,
  requireStripeCustomerId,
  updateAuthBillingMetadata,
  updateProfileBillingMetadata,
} from "@/lib/services/stripe-route.service";

type BillingProfile = {
  stripe_customer_id: string | null;
};

export async function POST(req: Request) {
  try {
    const { supabase, user, response } = await getAuthenticatedBillingUser({ requireEmail: true });
    if (response) return response;

    let body: Record<string, unknown>;
    try {
      body = getJsonObject(await req.json());
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const paymentMethodId = validatePaymentMethodId(body.paymentMethodId);
    const billingDetails = validateBillingDetails(body.billingDetails);

    // 1. Retrieve the customer ID
    const profile = await getBillingProfile<BillingProfile>(supabase, user.id, "stripe_customer_id");
    const { customerId, response: missingCustomerResponse } = requireStripeCustomerId(profile, "Stripe customer not found");
    if (missingCustomerResponse) return missingCustomerResponse;

    // 2. Retrieve PaymentMethod from Stripe to get brand, last4, expiry
    const pm = await getOwnedPaymentMethod(paymentMethodId, customerId);
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
        console.warn("Duplicate card linkage attempt rejected.");
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
    await persistDefaultPaymentMethod(customerId, paymentMethodId);

    // 5. Update profiles and user_metadata
    const paymentMethodData = buildPaymentMethodProfilePayload(pm, { nullFallback: true });
    const updateData = { ...paymentMethodData };

    if (billingDetails) {
      updateData.billing_street = billingDetails.street;
      updateData.billing_city = billingDetails.city;
      updateData.billing_state = billingDetails.state;
      updateData.billing_zip = billingDetails.zip;
      updateData.billing_country = billingDetails.country;
    }

    // Update profiles table
    await updateProfileBillingMetadata(user.id, updateData, {
      errorLog: "❌ Save PM: Failed to update profile in database:",
    });

    // Update auth metadata
    await updateAuthBillingMetadata(user, updateData, {
      errorLog: "❌ Save PM: Failed to update auth metadata:",
    });

    return NextResponse.json(
      { success: true, paymentMethod: paymentMethodData },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("Save payment method failed.");
    return mapStripeErrorResponse(err, "Failed to save payment method");
  }
}
