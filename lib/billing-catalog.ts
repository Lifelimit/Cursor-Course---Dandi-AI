import Stripe from "stripe";
import { publicEnv } from "@/lib/env";
import {
  BillingInterval,
  PaidPlanId,
  isBillingInterval,
  isPaidPlanId,
} from "@/lib/security-core";

export type PaidPlanRequest = {
  planId: PaidPlanId;
  interval: BillingInterval;
  priceId: string;
};

type PriceEntry = PaidPlanRequest & {
  priceId: string;
};

function getCatalog(): Record<PaidPlanId, Record<BillingInterval, string>> {
  return {
    Premium: {
      month: publicEnv.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID,
      year: publicEnv.NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID,
    },
    Researcher: {
      month: publicEnv.NEXT_PUBLIC_STRIPE_RESEARCHER_MONTHLY_PRICE_ID,
      year: publicEnv.NEXT_PUBLIC_STRIPE_RESEARCHER_YEARLY_PRICE_ID,
    },
  };
}

export function getPriceEntries(): PriceEntry[] {
  const catalog = getCatalog();
  return Object.entries(catalog).flatMap(([planId, prices]) =>
    Object.entries(prices).map(([interval, priceId]) => ({
      planId: planId as PaidPlanId,
      interval: interval as BillingInterval,
      priceId,
    }))
  );
}

export function resolvePaidPlanRequest(input: {
  planId?: unknown;
  priceId?: unknown;
  interval?: unknown;
}): PaidPlanRequest | null {
  if (!isPaidPlanId(input.planId) || typeof input.priceId !== "string") {
    return null;
  }

  const catalog = getCatalog();
  const expectedInterval = isBillingInterval(input.interval)
    ? input.interval
    : (Object.entries(catalog[input.planId]).find(([, priceId]) => priceId === input.priceId)?.[0] as
        | BillingInterval
        | undefined);

  if (!expectedInterval) {
    return null;
  }

  const expectedPriceId = catalog[input.planId][expectedInterval];
  if (input.priceId !== expectedPriceId) {
    return null;
  }

  return {
    planId: input.planId,
    interval: expectedInterval,
    priceId: expectedPriceId,
  };
}

export function getPlanForPriceId(priceId?: string | null): PaidPlanRequest | null {
  if (!priceId) return null;
  return getPriceEntries().find((entry) => entry.priceId === priceId) ?? null;
}

export function getPlanForSubscription(subscription: Stripe.Subscription): PaidPlanRequest | null {
  const priceId = subscription.items?.data?.[0]?.price?.id;
  return getPlanForPriceId(priceId);
}
