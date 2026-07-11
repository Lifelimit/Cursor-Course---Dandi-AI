import Stripe from "stripe";
import { redis } from "@/lib/redis";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatIsoDate, formatIsoDatePart } from "@/lib/format";
import type { PaymentMethodDisplay } from "@/types/billing";
import type { DailyUsageSummary, UsageLog } from "@/types/usage";

export type { PaymentMethodDisplay } from "@/types/billing";
export type { DailyUsageSummary, UsageLog } from "@/types/usage";

type BillingProfile = {
  billing_next_date?: string | null;
  billing_interval?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
};

type SelfHealOptions = {
  mode: "background" | "await";
  updateBy: "id" | "email";
  userId?: string;
  userEmail?: string | null;
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
    count: successCount,
    success: successCount,
    error: errorCount,
    avgLatency
  };
}

export function reconcileDailyTrendToUsage(dailyTrend: DailyUsageSummary[], usageCount: number) {
  const totalSuccess = dailyTrend.reduce((acc, day) => acc + day.success, 0);
  if (totalSuccess === usageCount) return dailyTrend;

  if (totalSuccess === 0) {
    if (usageCount === 0 || dailyTrend.length === 0) return dailyTrend;
    return dailyTrend.map((day, index) => {
      if (index !== dailyTrend.length - 1) return day;
      return { ...day, count: usageCount, success: usageCount };
    });
  }

  let remainingSuccess = usageCount;
  return dailyTrend
    .slice()
    .reverse()
    .map(day => {
      const success = Math.min(day.success, remainingSuccess);
      remainingSuccess -= success;
      return { ...day, count: success, success };
    })
    .reverse();
}

export function getRecentUsageDates(now = new Date(), days = 30) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    return formatIsoDate(d);
  }).reverse();
}

export function buildDailyUsageTrend(dates: string[], logs: UsageLog[], usageCount: number) {
  return reconcileDailyTrendToUsage(
    dates.map(date => summarizeDailyLogs(date, logs)),
    usageCount
  );
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
    return (await pipeline.exec<number[]>()) || [];
  } catch (err) {
    console.warn("⚠️ Display Redis key usage read failed; using zero key usage:", err);
    return [];
  }
}

export async function getDisplayUsageCount(key: string, warning = "⚠️ Display Redis usage read failed; using zero usage:"): Promise<number> {
  try {
    return (await redis.get<number>(key)) || 0;
  } catch (err) {
    console.warn(warning, err);
    return 0;
  }
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
  } catch (err) {
    console.warn(options.warning ?? "⚠️ Display Redis log read failed; using empty usage logs:", err);
    return [];
  }
}

export function calculateResetDate(nextInvoiceDate: string | null, now: Date): string {
  if (nextInvoiceDate) {
    try {
      const nextBilling = new Date(nextInvoiceDate);
      
      if (nextBilling <= now) {
        const resetDay = nextBilling.getDate();
        let nextReset = new Date(now.getFullYear(), now.getMonth(), resetDay);
        if (nextReset <= now) {
          nextReset = new Date(now.getFullYear(), now.getMonth() + 1, resetDay);
        }
        return nextReset.toISOString();
      } else if (nextBilling.getTime() - now.getTime() > 32 * 24 * 60 * 60 * 1000) {
        const resetDay = nextBilling.getDate();
        let nextReset = new Date(now.getFullYear(), now.getMonth(), resetDay);
        if (nextReset <= now) {
          nextReset = new Date(now.getFullYear(), now.getMonth() + 1, resetDay);
        }
        return nextReset.toISOString();
      } else {
        return nextInvoiceDate;
      }
    } catch {
      return nextInvoiceDate;
    }
  } else {
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toISOString();
  }
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

        if (options.updateBy === "email" && options.userEmail) {
          await supabaseAdmin
            .from("profiles")
            .update(updateData)
            .eq("email", options.userEmail);
        } else if (options.updateBy === "id" && options.userId) {
          const { error } = await supabaseAdmin
            .from("profiles")
            .update(updateData)
            .eq("id", options.userId);
          
          if (error) {
            console.error("❌ Failed to update profile billing_next_date during self-healing:", error.message);
          }
        }
      }

      return renewalDate;
    }
  } catch (err) {
    console.warn(`⚠️ Failed to self-heal next billing date via Stripe in ${options.logContext}:`, err);
  }

  return null;
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
      selfHealBillingDate(stripeCustomerId, stripeSubscriptionId, input.selfHeal).catch(err => {
        console.error("❌ Unhandled rejection in billing self-healing:", err);
      });
    } else {
      nextInvoiceDate = await selfHealBillingDate(stripeCustomerId, stripeSubscriptionId, input.selfHeal);
    }
  } else if (input.profile?.billing_next_date) {
    nextInvoiceDate = input.profile.billing_next_date;
  }

  nextInvoiceDate = calculateNextInvoiceDate(nextInvoiceDate, input.profile?.billing_interval || null, input.now);

  return {
    resetDate: calculateResetDate(nextInvoiceDate, input.now),
    nextInvoiceDate,
  };
}

export async function getStripePaymentDisplay(
  stripeCustomerId: string | null | undefined,
  options: { requireActiveCustomer?: boolean } = {}
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
    if (customer.deleted && options.requireActiveCustomer !== false) {
      return { paymentMethods: [], customerBalance: 0 };
    }

    const defaultMethodId = customer.deleted ? undefined : customer.invoice_settings?.default_payment_method;
    const customerBalance = customer.deleted ? 0 : customer.balance || 0;

    return {
      customerBalance,
      paymentMethods: methods.data.map((pm, idx) => ({
        id: pm.id,
        brand: pm.card?.brand || "Card",
        last4: pm.card?.last4 || "****",
        expiry: pm.card ? `${pm.card.exp_month}/${pm.card.exp_year}` : "N/A",
        isDefault: defaultMethodId ? pm.id === defaultMethodId : idx === 0
      })),
    };
  } catch {
    return { paymentMethods: [], customerBalance: 0 };
  }
}
