import type { PaymentMethodDisplay } from "@/types/billing";

export type UsageLog = {
  status: string;
  latencyMs: number;
  keyId?: string;
  repoUrl?: string;
  repo_url?: string;
  usedAt: string;
};

export type DailyUsageTrend = {
  date: string;
  count: number;
  success: number;
  error: number;
  avgLatency: number;
};

export type DailyUsageSummary = DailyUsageTrend;

export type CountOnlyDailyUsageTrend = {
  date: string;
  count: number;
};

export type TopRepositoryUsage = {
  repo_url: string;
  count: number;
};

export type UsageKeySummary<TTrend = DailyUsageTrend> = {
  id: string;
  name: string;
  key_type: string;
  usage_count: number;
  monthly_limit: number | null;
  is_active: boolean;
  alert_threshold: number | null;
  alert_channels: string[] | null;
  alert_phone: string | null;
  pct: number;
  dailyTrend: TTrend[];
  topRepos?: TopRepositoryUsage[];
  created_at?: string;
  key_value?: string;
};

export type UsageData = {
  totalUsage: number;
  keys: UsageKeySummary[];
  globalTopRepos: TopRepositoryUsage[];
  resetDate: string | null;
  nextInvoiceDate: string | null;
  avgLatency?: number;
  successRate?: number;
  dailyAnalytics?: DailyUsageTrend[];
  plan?: string;
  billingInterval?: "month" | "year";
  paymentMethods?: PaymentMethodDisplay[] | null;
  customerBalance?: number | null;
  stripeCustomerId?: string | null;
  scheduledPlan?: string | null;
  scheduledPlanDate?: string | null;
};

export type ServerUsageData = UsageData & {
  plan: string;
  paymentMethods: PaymentMethodDisplay[];
  stripeCustomerId?: string | null;
  customerBalance: number;
};

export type AccountUsageData = {
  totalUsage: number;
  keys: UsageKeySummary<CountOnlyDailyUsageTrend>[];
  resetDate: string | null;
};
