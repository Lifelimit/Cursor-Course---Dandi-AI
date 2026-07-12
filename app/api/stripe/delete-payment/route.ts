import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getJsonObject, validatePaymentMethodId } from "@/lib/request-validation";
import { getOwnedPaymentMethod } from "@/lib/services/stripe-safety.service";
import {
  buildClearPaymentMethodProfilePayload,
  buildPaymentMethodProfilePayload,
  getAuthenticatedBillingUser,
  getBillingProfile,
  mapStripeErrorResponse,
  persistDefaultPaymentMethod,
  requireStripeCustomerId,
  updateProfileBillingMetadata,
} from "@/lib/services/stripe-route.service";

type BillingProfile = {
  stripe_customer_id: string | null;
  payment_method_last4: string | null;
};

export async function POST(req: Request) {
  try {
    const { supabase, user, response } = await getAuthenticatedBillingUser();
    if (response) return response;

    const body = getJsonObject(await req.json());
    const paymentMethodId = validatePaymentMethodId(body.paymentMethodId);

    // 1. Get Customer ID and Current Default PM from Supabase
    const profile = await getBillingProfile<BillingProfile>(supabase, user.id, "stripe_customer_id, payment_method_last4");
    const { customerId, response: missingCustomerResponse } = requireStripeCustomerId(profile, "Customer not found");
    if (missingCustomerResponse) return missingCustomerResponse;

    // 2. Detach Payment Method from Stripe
    const pm = await getOwnedPaymentMethod(paymentMethodId, customerId);
    
    // Check if this card is the one stored in Supabase
    const isCurrentDefaultInDB = profile?.payment_method_last4 === pm.card?.last4;

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
        await persistDefaultPaymentMethod(customerId, newPM.id);

        await updateProfileBillingMetadata(
          user.id,
          buildPaymentMethodProfilePayload(newPM, { includeUpdatedAt: true, optionalCardExpiry: true }),
          { errorLog: "❌ Delete PM: Failed to update profile in database:" }
        );
      } else {
        // No cards left
        await updateProfileBillingMetadata(
          user.id,
          buildClearPaymentMethodProfilePayload(),
          { errorLog: "❌ Delete PM: Failed to clear profile payment method in database:" }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete Payment Error:", err);
    return mapStripeErrorResponse(err, "Failed to delete payment method");
  }
}
