export type UsagePeriod = {
  key: string;
  startsAt: string;
  resetsAt: string;
};

/**
 * Quotas use one UTC calendar-month authority everywhere. Stripe renewal dates
 * are billing information and must never change these boundaries.
 */
export function getUsagePeriod(now = new Date()): UsagePeriod {
  const year = now.getUTCFullYear();
  const monthIndex = now.getUTCMonth();
  const month = String(monthIndex + 1).padStart(2, "0");

  return {
    key: `${year}-${month}`,
    startsAt: new Date(Date.UTC(year, monthIndex, 1)).toISOString(),
    resetsAt: new Date(Date.UTC(year, monthIndex + 1, 1)).toISOString(),
  };
}

export function getRecentUsageDatesUtc(now = new Date(), days = 30) {
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  return Array.from({ length: days }, (_, index) => {
    const offset = days - index - 1;
    return new Date(end - offset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  });
}

export function getUsageCounterTtlSeconds(now = new Date()) {
  const reset = new Date(getUsagePeriod(now).resetsAt).getTime();
  const secondsUntilReset = Math.max(1, Math.ceil((reset - now.getTime()) / 1000));

  // Keep the completed period briefly for delayed telemetry and support checks.
  return secondsUntilReset + 7 * 24 * 60 * 60;
}

export function getRecentUsagePeriodKeys(now = new Date(), count = 4) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1));
    return getUsagePeriod(date).key;
  });
}
