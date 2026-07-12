import "server-only";
import { redis } from "@/lib/redis";
import { stripe } from "@/lib/stripe";

export class AccountDeletionBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountDeletionBlockedError";
  }
}

type BillingProfile = {
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

const terminalSubscriptionStatuses = new Set(["canceled", "incomplete_expired"]);
const liveScheduleStatuses = new Set(["active", "not_started"]);

function getStripeObjectId(value: string | { id: string } | null | undefined) {
  return typeof value === "string" ? value : value?.id || null;
}

function isMissingStripeResource(error: unknown) {
  return error instanceof stripe.errors.StripeInvalidRequestError && error.statusCode === 404;
}

async function retrieveSubscriptionIfPresent(subscriptionId: string) {
  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    if (isMissingStripeResource(error)) return null;
    throw error;
  }
}

async function listCustomerSubscriptionsIfPresent(customerId: string) {
  try {
    return await stripe.subscriptions
      .list({ customer: customerId, status: "all", limit: 100 })
      .autoPagingToArray({ limit: 1_000 });
  } catch (error) {
    if (isMissingStripeResource(error)) return [];
    throw error;
  }
}

async function listCustomerSchedulesIfPresent(customerId: string) {
  try {
    return await stripe.subscriptionSchedules
      .list({ customer: customerId, limit: 100 })
      .autoPagingToArray({ limit: 1_000 });
  } catch (error) {
    if (isMissingStripeResource(error)) return [];
    throw error;
  }
}

export async function assertNoLiveStripeBilling(profile: BillingProfile) {
  if (!profile.stripe_customer_id && !profile.stripe_subscription_id) return;

  try {
    const storedSubscription = profile.stripe_subscription_id
      ? await retrieveSubscriptionIfPresent(profile.stripe_subscription_id)
      : null;
    const subscriptionCustomerId = storedSubscription
      ? getStripeObjectId(storedSubscription.customer)
      : null;

    if (
      profile.stripe_customer_id
      && subscriptionCustomerId
      && profile.stripe_customer_id !== subscriptionCustomerId
    ) {
      throw new Error("Stripe profile binding mismatch.");
    }

    if (storedSubscription && !terminalSubscriptionStatuses.has(storedSubscription.status)) {
      throw new AccountDeletionBlockedError(
        "Cancel the Stripe subscription and wait for it to end before deleting the account.",
      );
    }

    const customerId = profile.stripe_customer_id || subscriptionCustomerId;
    if (!customerId) return;

    const [subscriptions, schedules] = await Promise.all([
      listCustomerSubscriptionsIfPresent(customerId),
      listCustomerSchedulesIfPresent(customerId),
    ]);

    if (subscriptions.some((subscription) => !terminalSubscriptionStatuses.has(subscription.status))) {
      throw new AccountDeletionBlockedError(
        "Cancel every Stripe subscription and wait for it to end before deleting the account.",
      );
    }
    if (schedules.some((schedule) => liveScheduleStatuses.has(schedule.status))) {
      throw new AccountDeletionBlockedError(
        "Cancel every scheduled Stripe plan change before deleting the account.",
      );
    }
  } catch (error) {
    if (error instanceof AccountDeletionBlockedError) throw error;
    throw new Error("Stripe billing could not be verified. No account data was deleted.");
  }
}

async function scanKeys(pattern: string) {
  let cursor = "0";
  const keys: string[] = [];
  let iterations = 0;

  do {
    const [nextCursor, page] = await redis.scan(cursor, { match: pattern, count: 100 });
    cursor = nextCursor;
    keys.push(...page);
    iterations += 1;
    if (iterations > 200 || keys.length > 20_000) {
      throw new Error("Account cleanup exceeded its safe bound.");
    }
  } while (cursor !== "0");

  return keys;
}

async function deleteRedisPatterns(patterns: string[]) {
  for (const pattern of patterns) {
    const keys = await scanKeys(pattern);
    for (let index = 0; index < keys.length; index += 100) {
      const pipeline = redis.pipeline();
      keys.slice(index, index + 100).forEach((key) => pipeline.del(key));
      await pipeline.exec();
    }
  }
}

function getApiKeyRedisPatterns(apiKeyId: string) {
  return [
    `usage:key:${apiKeyId}:*`,
    `alert:sent:${apiKeyId}:*`,
    `alert:retry:${apiKeyId}:*`,
  ];
}

export async function deleteApiKeyRedisData(apiKeyId: string) {
  await deleteRedisPatterns(getApiKeyRedisPatterns(apiKeyId));
}

export async function deleteAccountRedisData(userId: string, apiKeyIds: string[]) {
  await deleteRedisPatterns([
    `usage:user:${userId}:*`,
    `logs:user:${userId}:*`,
    `lock:ingest:${userId}:*`,
    ...apiKeyIds.flatMap(getApiKeyRedisPatterns),
  ]);
}
