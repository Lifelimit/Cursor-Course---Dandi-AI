export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const STRIPE_PAYMENT_METHOD_RE = /^pm_[A-Za-z0-9_]+$/;

export const PLAN_IDS = ["Hobby", "Premium", "Researcher"] as const;
export const PAID_PLAN_IDS = ["Premium", "Researcher"] as const;
export const BILLING_INTERVALS = ["month", "year"] as const;
export const ALERT_CHANNELS = ["email", "in-page", "phone"] as const;

export type PlanId = (typeof PLAN_IDS)[number];
export type PaidPlanId = (typeof PAID_PLAN_IDS)[number];
export type BillingInterval = (typeof BILLING_INTERVALS)[number];
export type AlertChannel = (typeof ALERT_CHANNELS)[number];

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function isStripePaymentMethodId(value: unknown): value is string {
  return typeof value === "string" && STRIPE_PAYMENT_METHOD_RE.test(value);
}

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && PLAN_IDS.includes(value as PlanId);
}

export function isPaidPlanId(value: unknown): value is PaidPlanId {
  return typeof value === "string" && PAID_PLAN_IDS.includes(value as PaidPlanId);
}

export function isBillingInterval(value: unknown): value is BillingInterval {
  return typeof value === "string" && BILLING_INTERVALS.includes(value as BillingInterval);
}

export function normalizeAlertChannels(value: unknown): AlertChannel[] {
  if (!Array.isArray(value)) return ["in-page"];

  const channels = value.filter((channel): channel is AlertChannel =>
    typeof channel === "string" && ALERT_CHANNELS.includes(channel as AlertChannel)
  );

  return Array.from(new Set(channels.length > 0 ? channels : ["in-page"]));
}

export function normalizeGitHubRepoUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > 500) {
    return null;
  }

  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== "https:" || parsed.hostname.toLowerCase() !== "github.com") {
      return null;
    }

    const [owner, repo] = parsed.pathname.split("/").filter(Boolean);
    if (!owner || !repo || owner.startsWith(".") || repo.startsWith(".")) {
      return null;
    }

    return `https://github.com/${owner}/${repo.replace(/\.git$/i, "")}`;
  } catch {
    return null;
  }
}

export function clampInteger(value: unknown, options: { min: number; max?: number }) {
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value)) {
    return null;
  }

  if (value < options.min) return null;
  if (options.max !== undefined && value > options.max) return null;
  return value;
}
