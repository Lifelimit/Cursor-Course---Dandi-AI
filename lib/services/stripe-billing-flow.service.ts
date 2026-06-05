import Stripe from "stripe";
import type { PaidPlanRequest } from "@/lib/billing-catalog";

export type PaymentMethodDetails = {
  brand?: string | null;
  last4?: string | null;
  expiry?: string | null;
};

export function getSubscriptionPaymentIntent(subscription: Stripe.Subscription) {
  const invoice = subscription.latest_invoice as Stripe.Invoice | null | undefined;
  return (invoice as unknown as { payment_intent?: Stripe.PaymentIntent | string | null })?.payment_intent as
    | Stripe.PaymentIntent
    | null
    | undefined;
}

export function resolveSubscriptionPaymentState(subscription: Stripe.Subscription) {
  const paymentIntent = getSubscriptionPaymentIntent(subscription);

  if (paymentIntent?.status === "requires_action") {
    return {
      type: "requires_action" as const,
      clientSecret: paymentIntent.client_secret,
      subscriptionId: subscription.id,
    };
  }

  if (paymentIntent?.status === "requires_payment_method") {
    return {
      type: "requires_payment_method" as const,
      error: "Your card was declined. Please try another card.",
    };
  }

  return { type: "ready" as const };
}

export function buildSubscriptionProfilePayload(input: {
  planRequest: PaidPlanRequest;
  subscription: Stripe.Subscription;
  paymentMethodDetails?: {
    payment_method_last4?: string | null;
    payment_method_brand?: string | null;
    payment_method_expiry?: string | null;
  };
  billingDetails?: Record<string, unknown>;
  scheduledPlan?: string | null;
  scheduledPlanDate?: string | null;
  now?: Date;
}) {
  const periodEnd =
    input.subscription.items?.data?.[0]?.current_period_end ||
    (input.subscription as unknown as { current_period_end?: number }).current_period_end ||
    (input.subscription as unknown as { billing_cycle_anchor?: number }).billing_cycle_anchor;
  const renewalDate = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;

  const updatePayload: Record<string, unknown> = {
    plan: input.planRequest.planId,
    stripe_subscription_id: input.subscription.id,
    billing_interval: input.subscription.items?.data?.[0]?.price?.recurring?.interval === "year" ? "year" : "month",
    billing_next_date: renewalDate,
    updated_at: (input.now ?? new Date()).toISOString(),
    ...(input.paymentMethodDetails || {}),
  };

  if (input.billingDetails) {
    updatePayload.billing_street = typeof input.billingDetails.street === "string" ? input.billingDetails.street : null;
    updatePayload.billing_city = typeof input.billingDetails.city === "string" ? input.billingDetails.city : null;
    updatePayload.billing_state = typeof input.billingDetails.state === "string" ? input.billingDetails.state : null;
    updatePayload.billing_zip = typeof input.billingDetails.zip === "string" ? input.billingDetails.zip : null;
    updatePayload.billing_country = typeof input.billingDetails.country === "string" ? input.billingDetails.country : null;
  }

  if (input.scheduledPlan !== undefined) {
    updatePayload.stripe_scheduled_plan = input.scheduledPlan;
  }
  if (input.scheduledPlanDate !== undefined) {
    updatePayload.stripe_scheduled_plan_date = input.scheduledPlanDate;
  }

  Object.keys(updatePayload).forEach((key) => updatePayload[key] === undefined && delete updatePayload[key]);
  return updatePayload;
}

export function buildWebhookSubscriptionUpdatePayload(input: {
  customerId: string;
  subscriptionId: string;
  subscription: Stripe.Subscription;
  verifiedPlan: PaidPlanRequest | null;
  paymentMethodDetails?: PaymentMethodDetails | null;
  now?: Date;
}) {
  const periodEnd =
    input.subscription.items?.data?.[0]?.current_period_end ||
    (input.subscription as unknown as { current_period_end?: number }).current_period_end;
  const renewalDate = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
  const interval =
    input.verifiedPlan?.interval ??
    ((input.subscription as unknown as { items?: { data?: Array<{ price?: { recurring?: { interval?: string } } }> } })
      .items?.data?.[0]?.price?.recurring?.interval === "year"
      ? "year"
      : "month");

  const updatePayload: Record<string, unknown> = {
    stripe_customer_id: input.customerId,
    updated_at: (input.now ?? new Date()).toISOString(),
    plan: input.verifiedPlan?.planId,
    stripe_subscription_id: input.subscriptionId,
    billing_interval: interval,
    payment_method_last4: input.paymentMethodDetails?.last4,
    payment_method_brand: input.paymentMethodDetails?.brand,
    payment_method_expiry: input.paymentMethodDetails?.expiry,
    billing_next_date: renewalDate,
  };

  if (!input.subscription.schedule) {
    updatePayload.stripe_scheduled_plan = null;
    updatePayload.stripe_scheduled_plan_date = null;
  }

  Object.keys(updatePayload).forEach((key) => updatePayload[key] === undefined && delete updatePayload[key]);
  return updatePayload;
}

export function parseKeysToKeep(value: string | null | undefined) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string") ? parsed : [];
  } catch {
    return [];
  }
}

export function buildSubscriptionDeletedProfilePayload(now = new Date()) {
  return {
    plan: "Hobby",
    updated_at: now.toISOString(),
  };
}

export function isDuplicateWebhookEventError(error: { code?: string } | null | undefined) {
  return error?.code === "23505";
}
