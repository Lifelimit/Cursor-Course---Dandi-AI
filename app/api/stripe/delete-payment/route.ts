import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getJsonObject, validatePaymentMethodId } from "@/lib/request-validation";
import { getOwnedPaymentMethod } from "@/lib/services/stripe-safety.service";
import {
  buildClearPaymentMethodProfilePayload,
  clearPaymentMethodReferences,
  getAuthenticatedBillingUser,
  getBillingProfile,
  getCustomerDefaultPaymentMethodId,
  listRenewableStripeSubscriptions,
  mapStripeErrorResponse,
  requireStripeCustomerId,
  updateAuthBillingMetadata,
  updateProfileBillingMetadata,
} from "@/lib/services/stripe-route.service";

type BillingProfile = {
  stripe_customer_id: string | null;
};

function getPaymentMethodId(value: string | { id: string } | null | undefined) {
  return typeof value === "string" ? value : value?.id || null;
}

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

    const profile = await getBillingProfile<BillingProfile>(supabase, user.id, "stripe_customer_id");
    const { customerId, response: missingCustomerResponse } = requireStripeCustomerId(profile, "Customer not found");
    if (missingCustomerResponse) return missingCustomerResponse;

    const customerDefaultPaymentMethodId = await getCustomerDefaultPaymentMethodId(customerId);
    await getOwnedPaymentMethod(paymentMethodId, customerId);

    const renewableSubscriptions = await listRenewableStripeSubscriptions(customerId);
    const isSubscriptionDefault = renewableSubscriptions.some(
      (subscription) => getPaymentMethodId(subscription.default_payment_method) === paymentMethodId,
    );
    const isCustomerDefault = customerDefaultPaymentMethodId === paymentMethodId;

    if (isSubscriptionDefault && !isCustomerDefault) {
      return NextResponse.json(
        { error: "This payment method is used by a subscription. Choose another subscription payment method before removing it." },
        { status: 409 },
      );
    }

    await stripe.paymentMethods.detach(paymentMethodId);

    if (isCustomerDefault) {
      await clearPaymentMethodReferences(customerId, paymentMethodId);
      const clearPayload = buildClearPaymentMethodProfilePayload();
      await updateProfileBillingMetadata(user.id, clearPayload, {
        errorLog: "Delete payment method profile cleanup failed.",
      });
      await updateAuthBillingMetadata(user, clearPayload, {
        errorLog: "Delete payment method auth metadata cleanup failed.",
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete payment method failed.");
    return mapStripeErrorResponse(err, "Failed to delete payment method");
  }
}
