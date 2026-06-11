export interface SidebarAlert {
  id: string;
  keyName: string;
  pct: number;
  threshold: number;
  currentLimit: number;
  usageCount: number;
  dailyTrend: { date: string; count: number }[];
}

export interface AlertableKey {
  id: string;
  name: string;
  is_active: boolean;
  usage_count: number;
  monthly_limit: number | null;
  alert_threshold: number | null;
  alert_channels: string[] | null;
  dailyTrend?: { date: string; count: number }[];
}

export function getAlertTriggerCount(limit: number | null, threshold: number | null) {
  if (limit === null || threshold === null) return null;
  if (limit <= 0) return null;

  if (limit <= 20) {
    return Math.max(1, Math.round((threshold / 100) * limit));
  }

  return Math.floor((threshold / 100) * limit);
}

export function getEffectiveAlertThresholdPct(limit: number | null, threshold: number | null) {
  const triggerCount = getAlertTriggerCount(limit, threshold);
  if (limit === null || triggerCount === null) return threshold;
  return Math.round((triggerCount / limit) * 100);
}

export function hasCrossedAlertThreshold(key: AlertableKey) {
  if (!key.is_active || key.alert_threshold === null || key.monthly_limit === null) return false;

  const triggerCount = getAlertTriggerCount(key.monthly_limit, key.alert_threshold);
  return triggerCount !== null && key.usage_count >= triggerCount;
}

/**
 * Computes list of active keys that have crossed their configured alert threshold.
 * Small limits are evaluated by whole request count so UI labels like 75% (3 req)
 * match alert-state behavior for limits such as 3/4.
 */
export function computeSidebarAlerts(keys: AlertableKey[]): SidebarAlert[] {
  return (keys || [])
    .filter(k => k.alert_channels?.includes('in-page') && hasCrossedAlertThreshold(k))
    .map(k => {
      const pct = k.monthly_limit ? (k.usage_count / k.monthly_limit) * 100 : 0;
      const threshold = getEffectiveAlertThresholdPct(k.monthly_limit, k.alert_threshold) ?? k.alert_threshold!;
      return { 
        id: k.id, 
        keyName: k.name, 
        pct, 
        threshold,
        currentLimit: k.monthly_limit || 1000,
        usageCount: k.usage_count,
        dailyTrend: k.dailyTrend || []
      };
    });
}
