import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getEntitledPlanForSubscription, getPlanForSubscription } from "@/lib/billing-catalog";
import { getJsonObject, validateOperationId, validateStripeSubscriptionId } from "@/lib/request-validation";
import { getOwnedPaymentMethod } from "@/lib/services/stripe-safety.service";
import { buildSubscriptionProfilePayload, resolveSubscriptionPaymentState } from "@/lib/services/stripe-billing-flow.service";
import {
  buildPaymentMethodProfilePayload,
  getAuthenticatedBillingUser,
  getBillingProfile,
  mapStripeErrorResponse,
  updateAuthBillingMetadata,
  updateProfileBillingMetadata,
} from "@/lib/services/stripe-route.service";
import type { SubscriptionActionResult } from "@/types/billing";

function getObjectId(value: string | { id: string } | null | undefined) {
  return typeof value === "string" ? value : value?.id || null;
}

export async function POST(request: Request) {
  try {
    const { supabase, user, response } = await getAuthenticatedBillingUser({ requireEmail: true });
    if (response) return response;

    let body: Record<string, unknown>;
    try {
      body = getJsonObject(await request.json());
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const subscriptionId = validateStripeSubscriptionId(body.subscriptionId);
    const operationId = validateOperationId(body.operationId);
    const profile = await getBillingProfile<{ stripe_customer_id: string | null }>(
      supabase,
      user.id,
      "stripe_customer_id",
    );
    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: "Stripe customer not found." }, { status: 404 });
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["latest_invoice.payment_intent"],
    });
    const subscriptionCustomerId = getObjectId(subscription.customer as string | Stripe.Customer | Stripe.DeletedCustomer);
    if (subscriptionCustomerId !== profile.stripe_customer_id) {
      return NextResponse.json({ error: "Subscription not found." }, { status: 404 });
    }
    if (subscription.metadata?.userId && subscription.metadata.userId !== user.id) {
      return NextResponse.json({ error: "Subscription not found." }, { status: 404 });
    }
    if (subscription.metadata?.operationId && subscription.metadata.operationId !== operationId) {
      return NextResponse.json({ error: "Subscription operation does not match." }, { status: 409 });
    }

    const paymentState = resolveSubscriptionPaymentState(subscription);
    if (paymentState.type === "requires_action") {
      const result: SubscriptionActionResult = {
        status: "requires_action",
        subscriptionId,
        clientSecret: paymentState.clientSecret,
      };
      return NextResponse.json(result);
    }
    if (paymentState.type === "requires_payment_method") {
      const result: SubscriptionActionResult = {
        status: "requires_payment_method",
        message: paymentState.error,
      };
      return NextResponse.json(result, { status: 402 });
    }

    const configuredPlan = getPlanForSubscription(subscription);
    if ((subscription.status === "active" || subscription.status === "trialing") && !configuredPlan) {
      return NextResponse.json(
        { error: "The Stripe subscription uses an unrecognized price. No entitlement was changed." },
        { status: 409 },
      );
    }

    const entitledPlan = getEntitledPlanForSubscription(subscription);
    if (!entitledPlan) {
      const result: SubscriptionActionResult = { status: "processing", subscriptionId };
      return NextResponse.json(result, { status: 202 });
    }

    const paymentMethodId = getObjectId(subscription.default_payment_method as string | Stripe.PaymentMethod | null);
    let paymentMethodDetails: ReturnType<typeof buildPaymentMethodProfilePayload> | undefined;
    if (paymentMethodId) {
      const method = await getOwnedPaymentMethod(paymentMethodId, profile.stripe_customer_id);
      paymentMethodDetails = buildPaymentMethodProfilePayload(method);
    }

    const payload = buildSubscriptionProfilePayload({
      planRequest: entitledPlan,
      subscription,
      paymentMethodDetails,
      scheduledPlan: null,
      scheduledPlanDate: null,
    });
    await updateProfileBillingMetadata(user.id, payload, {
      errorLog: "Finalized subscription profile persistence failed.",
    });
    await updateAuthBillingMetadata(user, payload, {
      errorLog: "Finalized subscription Auth metadata persistence failed.",
    });

    const periodStart = subscription.items.data[0]?.current_period_start || subscription.billing_cycle_anchor;
    const result: SubscriptionActionResult = {
      status: "active",
      plan: entitledPlan.planId,
      interval: entitledPlan.interval,
      reference: subscription.id,
      effectiveAt: periodStart ? new Date(periodStart * 1000).toISOString() : new Date().toISOString(),
    };
    return NextResponse.json(result);
  } catch (error) {
    console.error("Subscription finalization failed.");
    return mapStripeErrorResponse(error, "Failed to finalize subscription.");
  }
}
