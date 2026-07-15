import Stripe from "stripe";
import { getPaidPlanForPlanId, getPlanForPriceId, type PaidPlanRequest } from "@/lib/billing-catalog";
import { stripe } from "@/lib/stripe";
import { isPaidPlanId, isUuid } from "@/lib/security-core";

export { isActiveScheduledPlanChange } from "@/lib/billing-schedule";

export type BillingProfileSnapshot = {
  plan?: string | null;
  billing_next_date?: string | null;
  billing_interval?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_scheduled_plan?: string | null;
  stripe_scheduled_plan_date?: string | null;
};

function getSchedulePhasePriceId(phase: Stripe.SubscriptionSchedule.Phase) {
  const price = phase.items[0]?.price;
  return typeof price === "string" ? price : price?.id ?? null;
}

export function resolveScheduledPlanFromSchedule(
  schedule: Stripe.SubscriptionSchedule,
  now: Date,
): { scheduledPlan: string | null; scheduledPlanDate: string | null } {
  const phases = schedule.phases;
  if (!phases?.length) {
    return { scheduledPlan: null, scheduledPlanDate: null };
  }

  const nowUnix = Math.floor(now.getTime() / 1000);
  let currentPhaseIndex = -1;

  for (let index = 0; index < phases.length; index += 1) {
    const phase = phases[index];
    const start = phase.start_date;
    const end = phase.end_date ?? null;
    if (start <= nowUnix && (end === null || nowUnix < end)) {
      currentPhaseIndex = index;
      break;
    }
  }

  if (currentPhaseIndex === -1) {
    return { scheduledPlan: null, scheduledPlanDate: null };
  }

  const currentPhase = phases[currentPhaseIndex];
  const nextPhase = phases[currentPhaseIndex + 1];
  if (!nextPhase) {
    return { scheduledPlan: null, scheduledPlanDate: null };
  }

  const currentPlan = getPlanForPriceId(getSchedulePhasePriceId(currentPhase));
  const nextPlan = getPlanForPriceId(getSchedulePhasePriceId(nextPhase));
  if (!nextPlan || currentPlan?.planId === nextPlan.planId) {
    return { scheduledPlan: null, scheduledPlanDate: null };
  }

  const phaseEnd = currentPhase.end_date;
  if (!phaseEnd || phaseEnd <= nowUnix) {
    return { scheduledPlan: null, scheduledPlanDate: null };
  }

  return {
    scheduledPlan: nextPlan.planId,
    scheduledPlanDate: new Date(phaseEnd * 1000).toISOString(),
  };
}

export function resolveEffectiveBillingState(input: {
  profile: BillingProfileSnapshot;
  subscription: Stripe.Subscription;
  schedule: Stripe.SubscriptionSchedule | null;
  verifiedPlan: PaidPlanRequest;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const scheduleIsActive = input.schedule
    && (input.schedule.status === "active" || input.schedule.status === "not_started");
  let { scheduledPlan, scheduledPlanDate } = scheduleIsActive && input.schedule
    ? resolveScheduledPlanFromSchedule(input.schedule, now)
    : { scheduledPlan: null, scheduledPlanDate: null };

  const profileScheduledPlan = input.profile.stripe_scheduled_plan || null;
  const profileScheduledDate = input.profile.stripe_scheduled_plan_date || null;
  const profileScheduleIsOverdue = Boolean(
    profileScheduledPlan
    && profileScheduledDate
    && new Date(profileScheduledDate) <= now,
  );

  let overdueScheduledPlan: PaidPlanRequest | null = null;
  if (profileScheduleIsOverdue && profileScheduledPlan && isPaidPlanId(profileScheduledPlan)) {
    const targetPlan = getPaidPlanForPlanId(profileScheduledPlan, input.verifiedPlan.interval);
    if (targetPlan && targetPlan.planId !== input.verifiedPlan.planId) {
      overdueScheduledPlan = targetPlan;
    }
  }

  if (profileScheduleIsOverdue) {
    const scheduleDateIsFuture = scheduledPlanDate && new Date(scheduledPlanDate) > now;
    if (!scheduleDateIsFuture) {
      scheduledPlan = null;
      scheduledPlanDate = null;
    }
  }

  if (overdueScheduledPlan && input.verifiedPlan.planId === overdueScheduledPlan.planId) {
    overdueScheduledPlan = null;
    scheduledPlan = null;
    scheduledPlanDate = null;
  }

  return {
    plan: input.verifiedPlan.planId,
    scheduledPlan,
    scheduledPlanDate,
    overdueScheduledPlan,
  };
}

export function buildProfileBillingReconciliationPayload(input: {
  profile: BillingProfileSnapshot;
  subscription: Stripe.Subscription;
  schedule: Stripe.SubscriptionSchedule | null;
  verifiedPlan: PaidPlanRequest;
  now?: Date;
}): Record<string, unknown> | null {
  const now = input.now ?? new Date();
  const periodEnd =
    input.subscription.items?.data?.[0]?.current_period_end ||
    (input.subscription as unknown as { current_period_end?: number }).current_period_end;
  const renewalDate = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
  const interval =
    input.subscription.items?.data?.[0]?.price?.recurring?.interval === "year" ? "year" : "month";

  const effectiveState = resolveEffectiveBillingState({
    profile: input.profile,
    subscription: input.subscription,
    schedule: input.schedule,
    verifiedPlan: input.verifiedPlan,
    now,
  });

  const targetPlan = effectiveState.plan;
  const planChanged = (input.profile.plan || "Hobby") !== targetPlan;
  const scheduledChanged =
    (input.profile.stripe_scheduled_plan || null) !== effectiveState.scheduledPlan
    || (input.profile.stripe_scheduled_plan_date || null) !== effectiveState.scheduledPlanDate;
  const billingDateChanged = (input.profile.billing_next_date || null) !== renewalDate;
  const intervalChanged = (input.profile.billing_interval || null) !== interval;
  const subscriptionIdChanged = input.profile.stripe_subscription_id !== input.subscription.id;

  if (!planChanged && !scheduledChanged && !billingDateChanged && !intervalChanged && !subscriptionIdChanged) {
    return null;
  }

  return {
    plan: targetPlan,
    stripe_subscription_id: input.subscription.id,
    billing_interval: interval,
    billing_next_date: renewalDate,
    stripe_scheduled_plan: effectiveState.scheduledPlan,
    stripe_scheduled_plan_date: effectiveState.scheduledPlanDate,
    updated_at: now.toISOString(),
  };
}

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

  if (paymentIntent?.status === "requires_action" && typeof paymentIntent.client_secret === "string") {
    return {
      type: "requires_action" as const,
      clientSecret: paymentIntent.client_secret,
      subscriptionId: subscription.id,
    };
  }

  if (paymentIntent?.status === "requires_action") {
    return {
      type: "requires_payment_method" as const,
      error: "Payment authentication could not start. Please try again.",
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
  scheduledPlan?: string | null;
  scheduledPlanDate?: string | null;
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
    stripe_subscription_id: input.subscriptionId,
    billing_next_date: renewalDate,
  };

  if (input.paymentMethodDetails !== undefined) {
    updatePayload.payment_method_last4 = input.paymentMethodDetails?.last4 ?? null;
    updatePayload.payment_method_brand = input.paymentMethodDetails?.brand ?? null;
    updatePayload.payment_method_expiry = input.paymentMethodDetails?.expiry ?? null;
  }

  if (input.verifiedPlan) {
    updatePayload.plan = input.verifiedPlan.planId;
    updatePayload.billing_interval = interval;
  }

  if (input.scheduledPlan !== undefined) {
    updatePayload.stripe_scheduled_plan = input.scheduledPlan;
    updatePayload.stripe_scheduled_plan_date = input.scheduledPlanDate ?? null;
  } else if (!input.subscription.schedule) {
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
    return Array.isArray(parsed)
      && parsed.length <= 3
      && parsed.every((item) => typeof item === "string" && isUuid(item))
      ? parsed
      : [];
  } catch {
    return [];
  }
}

export function buildSubscriptionDeletedProfilePayload(now = new Date()) {
  return {
    plan: "Hobby",
    stripe_subscription_id: null,
    billing_interval: null,
    billing_next_date: null,
    stripe_scheduled_plan: null,
    stripe_scheduled_plan_date: null,
    updated_at: now.toISOString(),
  };
}

export function isDuplicateWebhookEventError(error: { code?: string } | null | undefined) {
  return error?.code === "23505";
}

export function isLiveSubscriptionScheduleStatus(
  status: Stripe.SubscriptionSchedule.Status,
) {
  return status === "active" || status === "not_started";
}

export function getSubscriptionPeriodBounds(subscription: Stripe.Subscription) {
  const periodStart = subscription.items.data[0]?.current_period_start
    || (subscription as Stripe.Subscription & { current_period_start?: number }).current_period_start
    || subscription.billing_cycle_anchor;
  const periodEnd = subscription.items.data[0]?.current_period_end
    || (subscription as Stripe.Subscription & { current_period_end?: number }).current_period_end;

  return { periodStart, periodEnd };
}

function getScheduleItemPriceId(
  price: string | Stripe.Price | Stripe.DeletedPrice | null | undefined,
) {
  if (!price) return null;
  return typeof price === "string" ? price : price.id;
}

export function buildPlanChangeScheduleUpdate(
  schedule: Stripe.SubscriptionSchedule,
  targetPriceId: string,
  subscription?: Stripe.Subscription,
) {
  const currentPhase = schedule.phases[0];
  if (!currentPhase) {
    throw new Error("Stripe schedule is missing its current phase.");
  }

  const phaseStart = currentPhase.start_date;
  const phaseEnd = currentPhase.end_date
    ?? (subscription ? getSubscriptionPeriodBounds(subscription).periodEnd : undefined);
  if (!phaseEnd) {
    throw new Error("Stripe did not return a valid billing period for the schedule phase.");
  }

  const phaseItems = currentPhase.items.map((item) => {
    const priceId = getScheduleItemPriceId(item.price);
    if (!priceId) {
      throw new Error("Stripe schedule phase item is missing a price.");
    }
    return {
      price: priceId,
      quantity: item.quantity ?? 1,
    };
  });

  return {
    phases: [
      {
        start_date: phaseStart,
        end_date: phaseEnd,
        items: phaseItems,
      },
      {
        start_date: phaseEnd,
        items: [{ price: targetPriceId }],
      },
    ],
    end_behavior: "release" as const,
    proration_behavior: "none" as const,
    effectiveAt: new Date(phaseEnd * 1000).toISOString(),
  };
}

export async function supersedePendingCancellation(subscription: Stripe.Subscription) {
  if (!subscription.cancel_at_period_end) {
    return subscription;
  }

  const updated = await stripe.subscriptions.update(subscription.id, {
    cancel_at_period_end: false,
    metadata: {
      ...subscription.metadata,
      keys_to_keep: "",
      cancel_requested_at: "",
    },
  });

  return stripe.subscriptions.retrieve(updated.id);
}

export async function resolveOrCreateSubscriptionSchedule(
  subscription: Stripe.Subscription,
  idempotencyKey: string,
) {
  const scheduleId = typeof subscription.schedule === "string"
    ? subscription.schedule
    : subscription.schedule?.id;

  if (scheduleId) {
    const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId);
    if (isLiveSubscriptionScheduleStatus(schedule.status)) {
      return schedule;
    }
  }

  return stripe.subscriptionSchedules.create(
    { from_subscription: subscription.id },
    { idempotencyKey },
  );
}
