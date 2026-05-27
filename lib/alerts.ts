export interface SidebarAlert {
  id: string;
  keyName: string;
  pct: number;
  threshold: number;
  currentLimit: number;
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

/**
 * Computes list of active keys that have crossed their configured alert threshold percentages.
 */
export function computeSidebarAlerts(keys: AlertableKey[]): SidebarAlert[] {
  return (keys || [])
    .filter(k => k.is_active && k.alert_threshold !== null && k.alert_channels?.includes('in-page'))
    .map(k => {
      const pct = k.monthly_limit ? (k.usage_count / k.monthly_limit) * 100 : 0;
      return { 
        id: k.id, 
        keyName: k.name, 
        pct, 
        threshold: k.alert_threshold!,
        currentLimit: k.monthly_limit || 1000,
        dailyTrend: k.dailyTrend || []
      };
    })
    .filter(a => a.pct >= a.threshold);
}
