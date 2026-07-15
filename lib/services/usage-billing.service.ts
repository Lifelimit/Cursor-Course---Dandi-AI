import Stripe from "stripe";
import { redis } from "@/lib/redis";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getEntitledPlanForSubscription, type PaidPlanRequest } from "@/lib/billing-catalog";
import {
  buildProfileBillingReconciliationPayload,
  resolveEffectiveBillingState,
  type BillingProfileSnapshot,
} from "@/lib/services/stripe-billing-flow.service";
import { formatIsoDatePart } from "@/lib/format";
import { getRecentUsageDatesUtc, getUsagePeriod } from "@/lib/utils/usage-period";
import type { PaymentMethodDisplay } from "@/types/billing";
import type { DailyUsageSummary, UsageLog } from "@/types/usage";

export type { PaymentMethodDisplay } from "@/types/billing";
export type { DailyUsageSummary, UsageLog } from "@/types/usage";

export type BillingSubscriptionStatus = NonNullable<import("@/types/billing").BillingData["subscriptionStatus"]>;

export class UsageDataUnavailableError extends Error {
  constructor(message = "Usage data is temporarily unavailable.") {
    super(message);
    this.name = "UsageDataUnavailableError";
  }
}

export class BillingDataUnavailableError extends Error {
  constructor(message = "Billing data is temporarily unavailable.") {
    super(message);
    this.name = "BillingDataUnavailableError";
  }
}

export type StripeSubscriptionDisplay = {
  status: BillingSubscriptionStatus;
  interval: "month" | "year" | null;
  cancelAtPeriodEnd: boolean;
};

type BillingProfile = BillingProfileSnapshot;

type SelfHealOptions = {
  mode: "background" | "await";
  userId: string;
  periodEndSource: "server-data" | "usage-api";
  logContext: string;
};

export function parseUsageLogs(
  rawLogs: unknown[],
  options: { requireKeyId?: boolean; includeSnakeRepoUrl?: boolean } = {}
): UsageLog[] {
  return rawLogs.flatMap((log): UsageLog[] => {
    try {
      const parsed = typeof log === "string" ? JSON.parse(log) : log;
      if (!parsed || typeof parsed !== "object") return [];

      const usageLog = parsed as Partial<UsageLog>;
      if (typeof usageLog.usedAt !== "string") return [];
      if (options.requireKeyId && typeof usageLog.keyId !== "string") return [];

      return [{
        status: typeof usageLog.status === "string" ? usageLog.status : "",
        latencyMs: typeof usageLog.latencyMs === "number" ? usageLog.latencyMs : 0,
        keyId: typeof usageLog.keyId === "string" ? usageLog.keyId : undefined,
        repoUrl: typeof usageLog.repoUrl === "string" ? usageLog.repoUrl : undefined,
        repo_url: options.includeSnakeRepoUrl && typeof usageLog.repo_url === "string" ? usageLog.repo_url : undefined,
        usedAt: usageLog.usedAt,
        ip: typeof usageLog.ip === "string" ? usageLog.ip : null,
        userAgent: typeof usageLog.userAgent === "string" ? usageLog.userAgent : null,
        city: typeof usageLog.city === "string" ? usageLog.city : null,
        region: typeof usageLog.region === "string" ? usageLog.region : null,
        country: typeof usageLog.country === "string" ? usageLog.country : null,
      }];
    } catch {
      return [];
    }
  });
}

export function getUsageLogDate(log: Pick<UsageLog, "usedAt">) {
  return formatIsoDatePart(log.usedAt);
}

export function summarizeDailyLogs(date: string, logs: UsageLog[]): DailyUsageSummary {
  const dayLogs = logs.filter(log => getUsageLogDate(log) === date);
  const successCount = dayLogs.filter(log => log.status === "success").length;
  const errorCount = dayLogs.length - successCount;
  const totalLatency = dayLogs.reduce((acc, log) => acc + (log.latencyMs || 0), 0);
  const avgLatency = dayLogs.length > 0 ? Math.round(totalLatency / dayLogs.length) : 0;

  return {
    date,
    count: dayLogs.length,
    success: successCount,
    error: errorCount,
    avgLatency
  };
}

export function getRecentUsageDates(now = new Date(), days = 30) {
  return getRecentUsageDatesUtc(now, days);
}

export function buildCountOnlyDailyTrend(dates: string[], logs: UsageLog[]) {
  const trendMap = logs.reduce((acc: Record<string, number>, log) => {
    const date = getUsageLogDate(log);
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  return dates.map(date => ({
    date,
    count: trendMap[date] || 0
  }));
}

export function getUsagePerformanceMetrics(logs: UsageLog[]) {
  const totalLogs = logs.length;
  const successfulLogs = logs.filter(log => log.status === "success").length;
  const totalLatency = logs.reduce((acc, log) => acc + (log.latencyMs || 0), 0);

  return {
    avgLatency: totalLogs > 0 ? Math.round(totalLatency / totalLogs) : 0,
    successRate: totalLogs > 0 ? (successfulLogs / totalLogs) * 100 : 0,
  };
}

export function getTopReposFromLogs(logs: UsageLog[], limit: number) {
  const repoMap = logs.reduce((acc: Record<string, number>, log) => {
    if (log.repoUrl) {
      acc[log.repoUrl] = (acc[log.repoUrl] || 0) + 1;
    }
    return acc;
  }, {});

  return Object.entries(repoMap)
    .map(([repo_url, count]) => ({ repo_url, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function getActiveRepositoryCount(logs: UsageLog[]) {
  return new Set(logs.map(log => log.repoUrl).filter((repoUrl): repoUrl is string => Boolean(repoUrl))).size;
}

export async function getDisplayUsageCounts(keys: { id: string }[], currentMonth: string): Promise<number[]> {
  if (keys.length === 0) return [];

  try {
    const pipeline = redis.pipeline();
    keys.forEach(k => {
      pipeline.get(`usage:key:${k.id}:${currentMonth}`);
    });
    const values = await pipeline.exec<number[]>();
    if (!values || values.length !== keys.length) {
      throw new UsageDataUnavailableError();
    }
    return values.map((value) => Number(value) || 0);
  } catch {
    throw new UsageDataUnavailableError();
  }
}

export async function getDisplayUsageCount(key: string): Promise<number> {
  try {
    return (await redis.get<number>(key)) || 0;
  } catch {
    throw new UsageDataUnavailableError();
  }
}

export async function getDurableUsageLogs(
  userId: string,
  now = new Date(),
  days = 30,
): Promise<UsageLog[]> {
  const pageSize = 1_000;
  const maximumRows = 100_000;
  const firstDate = getRecentUsageDatesUtc(now, days)[0];
  const since = `${firstDate}T00:00:00.000Z`;
  const until = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  )).toISOString();
  const rows: Array<{
    api_key_id: string | null;
    repo_url: string | null;
    status: string;
    latency_ms: number;
    used_at: string;
  }> = [];

  for (let from = 0; from < maximumRows; from += pageSize) {
    const { data, error } = await supabaseAdmin
      .from("api_usage_log")
      .select("api_key_id, repo_url, status, latency_ms, used_at")
      .eq("user_id", userId)
      .gte("used_at", since)
      .lt("used_at", until)
      .order("used_at", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw new UsageDataUnavailableError("Usage analytics are temporarily unavailable.");
    const page = (data || []) as typeof rows;
    rows.push(...page);
    if (page.length < pageSize) break;
    if (from + pageSize >= maximumRows) {
      throw new UsageDataUnavailableError("Usage analytics exceed the safe display limit.");
    }
  }

  return rows.map((row) => ({
    keyId: row.api_key_id || undefined,
    repoUrl: row.repo_url || undefined,
    status: row.status,
    latencyMs: row.latency_ms,
    usedAt: row.used_at,
  }));
}

export async function getDisplayUsageLogs(
  key: string,
  start: number,
  stop: number,
  options: Parameters<typeof parseUsageLogs>[1] & { warning?: string } = {}
): Promise<UsageLog[]> {
  try {
    const rawLogs = await redis.lrange(key, start, stop);
    return parseUsageLogs(rawLogs, options);
  } catch {
    throw new UsageDataUnavailableError("Recent request activity is temporarily unavailable.");
  }
}

export function calculateResetDate(nextInvoiceDate: string | null, now: Date): string {
  void nextInvoiceDate;
  return getUsagePeriod(now).resetsAt;
}

export function calculateNextInvoiceDate(nextInvoiceDate: string | null, billingInterval: string | null, now: Date): string | null {
  if (!nextInvoiceDate) return null;
  try {
    const nextBilling = new Date(nextInvoiceDate);
    if (nextBilling <= now) {
      const resetDay = nextBilling.getDate();
      if (billingInterval === "year") {
        const nextInvoice = new Date(nextBilling);
        while (nextInvoice <= now) {
          nextInvoice.setFullYear(nextInvoice.getFullYear() + 1);
        }
        return nextInvoice.toISOString();
      } else {
        let nextInvoice = new Date(now.getFullYear(), now.getMonth(), resetDay);
        if (nextInvoice <= now) {
          nextInvoice = new Date(now.getFullYear(), now.getMonth() + 1, resetDay);
        }
        return nextInvoice.toISOString();
      }
    }
    return nextInvoiceDate;
  } catch {
    return nextInvoiceDate;
  }
}

function getSubscriptionPeriodEnd(subscription: Stripe.Subscription, source: SelfHealOptions["periodEndSource"]) {
  if (source === "usage-api") {
    return (subscription as unknown as { current_period_end?: number }).current_period_end ||
      subscription.items?.data?.[0]?.current_period_end;
  }

  return subscription.items?.data?.[0]?.current_period_end || subscription.billing_cycle_anchor;
}

async function selfHealBillingDate(
  stripeCustomerId: string | null,
  stripeSubscriptionId: string | null,
  options: SelfHealOptions
): Promise<string | null> {
  try {
    let activeSubscription: Stripe.Subscription | null = null;
    let resolvedSubscriptionId = stripeSubscriptionId;

    if (resolvedSubscriptionId) {
      activeSubscription = await stripe.subscriptions.retrieve(resolvedSubscriptionId);
    } else if (stripeCustomerId) {
      const subs = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: "active",
        limit: 1
      });
      if (subs.data.length > 0) {
        activeSubscription = subs.data[0];
        resolvedSubscriptionId = activeSubscription.id;
      }
    }

    if (activeSubscription && activeSubscription.status === "active") {
      const periodEnd = getSubscriptionPeriodEnd(activeSubscription, options.periodEndSource);
      const renewalDate = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
      
      if (renewalDate) {
        const updateData = {
          billing_next_date: renewalDate,
          stripe_subscription_id: resolvedSubscriptionId || undefined
        };

        const { error } = await supabaseAdmin
          .from("profiles")
          .update(updateData)
          .eq("id", options.userId);

        if (error) {
          console.error("Failed to update profile billing date during self-healing.");
        }
      }

      return renewalDate;
    }
  } catch {
    console.warn("Stripe billing-date self-healing failed.");
  }

  return null;
}

async function applyOverdueScheduledPlanChange(
  subscription: Stripe.Subscription,
  schedule: Stripe.SubscriptionSchedule | null,
  targetPlan: PaidPlanRequest,
) {
  const subscriptionItemId = subscription.items.data[0]?.id;
  if (!subscriptionItemId) return subscription;

  await stripe.subscriptions.update(subscription.id, {
    items: [{ id: subscriptionItemId, price: targetPlan.priceId }],
    proration_behavior: "none",
  });

  if (schedule?.id && (schedule.status === "active" || schedule.status === "not_started")) {
    await stripe.subscriptionSchedules.release(schedule.id);
  }

  return stripe.subscriptions.retrieve(subscription.id);
}

export async function reconcileProfileBillingFromStripe(
  userId: string,
  profile: BillingProfileSnapshot,
): Promise<BillingProfileSnapshot | null> {
  const customerId = profile.stripe_customer_id;
  if (!customerId) return null;

  try {
    let subscription: Stripe.Subscription | null = null;

    if (profile.stripe_subscription_id) {
      const candidate = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
      if (candidate.status === "active" || candidate.status === "trialing") {
        subscription = candidate;
      }
    }

    if (!subscription) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 100,
      });
      subscription = subscriptions.data.find(
        (candidate) => candidate.status === "active" || candidate.status === "trialing",
      ) ?? null;
    }

    if (!subscription) return null;

    let verifiedPlan = getEntitledPlanForSubscription(subscription);
    if (!verifiedPlan) return null;

    let scheduleId = typeof subscription.schedule === "string"
      ? subscription.schedule
      : subscription.schedule?.id;
    let schedule = scheduleId
      ? await stripe.subscriptionSchedules.retrieve(scheduleId)
      : null;

    const effectiveState = resolveEffectiveBillingState({
      profile,
      subscription,
      schedule,
      verifiedPlan,
    });

    if (effectiveState.overdueScheduledPlan) {
      subscription = await applyOverdueScheduledPlanChange(
        subscription,
        schedule,
        effectiveState.overdueScheduledPlan,
      );
      verifiedPlan = getEntitledPlanForSubscription(subscription);
      if (!verifiedPlan) return null;

      scheduleId = typeof subscription.schedule === "string"
        ? subscription.schedule
        : subscription.schedule?.id;
      schedule = scheduleId
        ? await stripe.subscriptionSchedules.retrieve(scheduleId)
        : null;
    }

    const payload = buildProfileBillingReconciliationPayload({
      profile,
      subscription,
      schedule,
      verifiedPlan,
    });
    if (!payload) return null;

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update(payload)
      .eq("id", userId)
      .eq("stripe_customer_id", customerId)
      .select("plan, billing_next_date, billing_interval, stripe_customer_id, stripe_subscription_id, stripe_scheduled_plan, stripe_scheduled_plan_date")
      .single();

    if (error || !data) {
      console.warn("Billing reconciliation profile update failed.");
      return null;
    }

    return data;
  } catch {
    console.warn("Stripe billing reconciliation failed.");
    return null;
  }
}

export async function getBillingPeriodDisplay(input: {
  profile: BillingProfile | null | undefined;
  now: Date;
  selfHeal?: SelfHealOptions;
}) {
  const stripeCustomerId = input.profile?.stripe_customer_id || null;
  const stripeSubscriptionId = input.profile?.stripe_subscription_id || null;
  let nextInvoiceDate: string | null = null;

  if (!input.profile?.billing_next_date && (stripeSubscriptionId || stripeCustomerId) && input.selfHeal) {
    if (input.selfHeal.mode === "background") {
      selfHealBillingDate(stripeCustomerId, stripeSubscriptionId, input.selfHeal).catch(() => {
        console.error("Background billing-date self-healing failed.");
      });
    } else {
      nextInvoiceDate = await selfHealBillingDate(stripeCustomerId, stripeSubscriptionId, input.selfHeal);
    }
  } else if (input.profile?.billing_next_date) {
    nextInvoiceDate = input.profile.billing_next_date;
  }

  nextInvoiceDate = calculateNextInvoiceDate(nextInvoiceDate, input.profile?.billing_interval || null, input.now);

  return {
    resetDate: getUsagePeriod(input.now).resetsAt,
    nextInvoiceDate,
  };
}

export async function getStripePaymentDisplay(
  stripeCustomerId: string | null | undefined,
): Promise<{ paymentMethods: PaymentMethodDisplay[]; customerBalance: number }> {
  if (!stripeCustomerId) {
    return { paymentMethods: [], customerBalance: 0 };
  }

  try {
    const methods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: "card",
    });
    
    const customer = await stripe.customers.retrieve(stripeCustomerId);
    if (customer.deleted) {
      return { paymentMethods: [], customerBalance: 0 };
    }

    const defaultMethodId = customer.invoice_settings?.default_payment_method;
    const customerBalance = customer.balance || 0;

    return {
      customerBalance,
      paymentMethods: methods.data.map((pm) => ({
        id: pm.id,
        brand: pm.card?.brand || "Card",
        last4: pm.card?.last4 || "****",
        expiry: pm.card ? `${pm.card.exp_month}/${pm.card.exp_year}` : "N/A",
        isDefault: Boolean(defaultMethodId && pm.id === defaultMethodId)
      })),
    };
  } catch (error) {
    if (error instanceof Stripe.errors.StripeInvalidRequestError && error.statusCode === 404) {
      return { paymentMethods: [], customerBalance: 0 };
    }
    throw new BillingDataUnavailableError();
  }
}

export async function getStripeSubscriptionDisplay(
  stripeSubscriptionId: string | null | undefined,
): Promise<StripeSubscriptionDisplay | null> {
  if (!stripeSubscriptionId) return null;

  try {
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    const interval = subscription.items?.data?.[0]?.price?.recurring?.interval;

    return {
      status: subscription.status as BillingSubscriptionStatus,
      interval: interval === "year" ? "year" : interval === "month" ? "month" : null,
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    };
  } catch (error) {
    if (error instanceof Stripe.errors.StripeInvalidRequestError && error.statusCode === 404) {
      return null;
    }
    throw new BillingDataUnavailableError();
  }
}
