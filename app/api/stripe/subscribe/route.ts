import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getEntitledPlanForSubscription, getPlanForSubscription, resolvePaidPlanRequest, type PaidPlanRequest } from "@/lib/billing-catalog";
import { getJsonObject, validateBillingDetails, validateOperationId, validatePaymentMethodId } from "@/lib/request-validation";
import { getOwnedPaymentMethod } from "@/lib/services/stripe-safety.service";
import { buildSubscriptionProfilePayload, resolveSubscriptionPaymentState, getSubscriptionPeriodBounds, buildPlanChangeScheduleUpdate, supersedePendingCancellation, resolveOrCreateSubscriptionSchedule } from "@/lib/services/stripe-billing-flow.service";
import {
  buildPaymentMethodProfilePayload,
  getAuthenticatedBillingUser,
  getOrCreateOwnedStripeCustomer,
  mapStripeErrorResponse,
  persistDefaultPaymentMethod,
  updateAuthBillingMetadata,
  updateProfileBillingMetadata,
} from "@/lib/services/stripe-route.service";
import type { SubscriptionActionResult } from "@/types/billing";

type ExpandedSubscription = Stripe.Subscription & {
  current_period_start?: number;
  current_period_end?: number;
};

function getPaymentMethodId(value: string | Stripe.PaymentMethod | null | undefined) {
  return typeof value === "string" ? value : value?.id || null;
}

function getActiveResult(subscription: ExpandedSubscription, plan: PaidPlanRequest): SubscriptionActionResult {
  const { periodStart } = getSubscriptionPeriodBounds(subscription);
  const effectiveAt = periodStart
    ? new Date(periodStart * 1000).toISOString()
    : new Date().toISOString();
  return {
    status: "active",
    plan: plan.planId,
    interval: plan.interval,
    reference: subscription.id,
    effectiveAt,
  };
}

async function persistActiveSubscription(input: {
  user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedBillingUser>>["user"]>;
  subscription: ExpandedSubscription;
  plan: PaidPlanRequest;
  paymentMethodId: string | null;
  billingDetails?: Record<string, unknown>;
}) {
  let paymentMethodDetails: ReturnType<typeof buildPaymentMethodProfilePayload> | undefined;
  if (input.paymentMethodId) {
    const method = await getOwnedPaymentMethod(
      input.paymentMethodId,
      String(input.subscription.customer),
    );
    paymentMethodDetails = buildPaymentMethodProfilePayload(method);
  }

  const payload = buildSubscriptionProfilePayload({
    planRequest: input.plan,
    subscription: input.subscription,
    paymentMethodDetails,
    billingDetails: input.billingDetails,
    scheduledPlan: null,
    scheduledPlanDate: null,
  });

  await updateProfileBillingMetadata(input.user.id, payload, {
    errorLog: "Subscription profile persistence failed.",
  });
  await updateAuthBillingMetadata(input.user, payload, {
    errorLog: "Subscription Auth metadata persistence failed.",
  });
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

    const planRequest = resolvePaidPlanRequest(body);
    if (!planRequest) {
      return NextResponse.json({ error: "Invalid plan or price selection" }, { status: 400 });
    }

    const operationId = validateOperationId(body.operationId);
    const billingDetails = validateBillingDetails(body.billingDetails);
    const customerId = await getOrCreateOwnedStripeCustomer({ supabase, user });

    const requestedPaymentMethodId = body.paymentMethodId
      ? validatePaymentMethodId(body.paymentMethodId)
      : null;
    if (requestedPaymentMethodId) {
      await getOwnedPaymentMethod(requestedPaymentMethodId, customerId);
      await persistDefaultPaymentMethod(customerId, requestedPaymentMethodId);
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 100,
      expand: ["data.latest_invoice.payment_intent"],
    });

    const activeSubscription = subscriptions.data.find(
      (subscription) => subscription.status === "active" || subscription.status === "trialing",
    ) as ExpandedSubscription | undefined;

    if (activeSubscription) {
      const currentPlan = getPlanForSubscription(activeSubscription);
      if (!currentPlan) {
        return NextResponse.json(
          { error: "The active Stripe subscription uses an unrecognized price. No plan change was made." },
          { status: 409 },
        );
      }

      if (currentPlan.priceId === planRequest.priceId) {
        await persistActiveSubscription({
          user,
          subscription: activeSubscription,
          plan: currentPlan,
          paymentMethodId: requestedPaymentMethodId || getPaymentMethodId(activeSubscription.default_payment_method),
          billingDetails,
        });
        return NextResponse.json(getActiveResult(activeSubscription, currentPlan));
      }

      const subscriptionForSchedule = await supersedePendingCancellation(
        activeSubscription,
      ) as ExpandedSubscription;

      const schedule = await resolveOrCreateSubscriptionSchedule(
        subscriptionForSchedule,
        `dandi-${user.id}-${operationId}-schedule-create`,
      );

      const scheduleUpdate = buildPlanChangeScheduleUpdate(
        schedule,
        planRequest.priceId,
        subscriptionForSchedule,
      );

      await stripe.subscriptionSchedules.update(
        schedule.id,
        {
          phases: scheduleUpdate.phases,
          end_behavior: scheduleUpdate.end_behavior,
          proration_behavior: scheduleUpdate.proration_behavior,
        },
        { idempotencyKey: `dandi-${user.id}-${operationId}-schedule-update` },
      );

      const scheduledAt = scheduleUpdate.effectiveAt;
      const payload = buildSubscriptionProfilePayload({
        planRequest: currentPlan,
        subscription: subscriptionForSchedule,
        scheduledPlan: planRequest.planId,
        scheduledPlanDate: scheduledAt,
      });
      await updateProfileBillingMetadata(user.id, payload, {
        errorLog: "Scheduled plan profile persistence failed.",
      });
      await updateAuthBillingMetadata(user, payload, {
        errorLog: "Scheduled plan Auth metadata persistence failed.",
      });

      const result: SubscriptionActionResult = {
        status: "scheduled",
        currentPlan: currentPlan.planId,
        targetPlan: planRequest.planId,
        interval: planRequest.interval,
        reference: schedule.id,
        effectiveAt: scheduledAt,
      };
      return NextResponse.json(result);
    }

    let subscription = subscriptions.data.find(
      (candidate) => candidate.metadata?.userId === user.id
        && candidate.metadata?.operationId === operationId,
    ) as ExpandedSubscription | undefined;

    const conflictingSubscription = subscriptions.data.find((candidate) =>
      ["incomplete", "past_due", "unpaid", "paused"].includes(candidate.status)
      && candidate.id !== subscription?.id,
    );
    if (!subscription && conflictingSubscription) {
      return NextResponse.json(
        { error: "An existing subscription needs payment attention before another can begin." },
        { status: 409 },
      );
    }

    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) {
      return NextResponse.json({ error: "The Stripe customer is no longer available." }, { status: 409 });
    }
    const defaultPaymentMethodId = getPaymentMethodId(customer.invoice_settings.default_payment_method);
    const paymentMethodId = requestedPaymentMethodId || defaultPaymentMethodId;
    if (!paymentMethodId) {
      const result: SubscriptionActionResult = {
        status: "requires_payment_method",
        message: "Add a payment method before starting a paid subscription.",
      };
      return NextResponse.json(result, { status: 402 });
    }

    if (!subscription) {
      subscription = await stripe.subscriptions.create(
        {
          customer: customerId,
          items: [{ price: planRequest.priceId }],
          default_payment_method: paymentMethodId,
          payment_behavior: "default_incomplete",
          payment_settings: { save_default_payment_method: "on_subscription" },
          expand: ["latest_invoice.payment_intent"],
          metadata: {
            userId: user.id,
            planId: planRequest.planId,
            operationId,
          },
        },
        { idempotencyKey: `dandi-${user.id}-${operationId}-subscription-create` },
      ) as ExpandedSubscription;
    }

    const paymentState = resolveSubscriptionPaymentState(subscription);
    if (paymentState.type === "requires_action") {
      const result: SubscriptionActionResult = {
        status: "requires_action",
        clientSecret: paymentState.clientSecret,
        subscriptionId: paymentState.subscriptionId,
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

    const entitledPlan = getEntitledPlanForSubscription(subscription);
    if (!entitledPlan) {
      const result: SubscriptionActionResult = {
        status: "processing",
        subscriptionId: subscription.id,
      };
      return NextResponse.json(result, { status: 202 });
    }

    await persistActiveSubscription({
      user,
      subscription,
      plan: entitledPlan,
      paymentMethodId,
      billingDetails,
    });
    return NextResponse.json(getActiveResult(subscription, entitledPlan));
  } catch (error) {
    console.error("Subscription operation failed.", error);
    return mapStripeErrorResponse(error, "Failed to process subscription");
  }
}
