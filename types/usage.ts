import type { PaymentMethodDisplay } from "@/types/billing";

export type UsageLog = {
  status: string;
  latencyMs: number;
  keyId?: string;
  repoUrl?: string;
  repo_url?: string;
  usedAt: string;
  ip?: string | null;
  userAgent?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
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
  activeRepositoryCount?: number;
  resetDate: string | null;
  nextInvoiceDate: string | null;
  avgLatency?: number;
  successRate?: number;
  dailyAnalytics?: DailyUsageTrend[];
  plan?: string;
  paymentMethods?: PaymentMethodDisplay[] | null;
  customerBalance?: number | null;
  stripeCustomerId?: string | null;
  scheduledPlan?: string | null;
  scheduledPlanDate?: string | null;
  billingInterval?: "month" | "year" | null;
  subscriptionStatus?: "active" | "trialing" | "past_due" | "unpaid" | "incomplete" | "incomplete_expired" | "canceled" | "paused" | null;
  cancelAtPeriodEnd?: boolean;
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
