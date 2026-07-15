import { NextResponse } from "next/server";
import { getJsonObject, validatePaymentMethodId } from "@/lib/request-validation";
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
    const { supabase, user, response } = await getAuthenticatedBillingUser();
    if (response) return response;

    let body: Record<string, unknown>;
    try {
      body = getJsonObject(await req.json());
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }
    const paymentMethodId = validatePaymentMethodId(body.paymentMethodId);

    // 1. Get Customer ID from Supabase
    const profile = await getBillingProfile<BillingProfile>(supabase, user.id, "stripe_customer_id");
    const { customerId, response: missingCustomerResponse } = requireStripeCustomerId(profile, "Customer not found");
    if (missingCustomerResponse) return missingCustomerResponse;

    const pm = await getOwnedPaymentMethod(paymentMethodId, customerId);

    // 2. Update Stripe Customer
    await persistDefaultPaymentMethod(customerId, paymentMethodId);

    // 3. Retrieve the payment method details for immediate DB update
    if (pm.card) {
      const paymentMethodData = buildPaymentMethodProfilePayload(pm, { includeUpdatedAt: true });
      await updateProfileBillingMetadata(
        user.id,
        paymentMethodData,
        { errorLog: "❌ Set Default PM: Failed to update profile in database:" }
      );
      await updateAuthBillingMetadata(user, paymentMethodData, {
        errorLog: "Set default payment method auth metadata update failed.",
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Set default payment method failed.");
    return mapStripeErrorResponse(err, "Failed to set default payment method");
  }
}
