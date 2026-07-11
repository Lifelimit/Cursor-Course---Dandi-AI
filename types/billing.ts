import type { CountOnlyDailyUsageTrend } from "@/types/usage";

export type InvoiceStatus = "paid" | "pending" | "failed" | "unpaid" | "draft" | "open" | "void" | "uncollectible";

export type Invoice = {
  id: string;
  date: string;
  amount: number;
  status: InvoiceStatus;
  currency?: string;
  description?: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  receiptUrl?: string;
  pdfUrl?: string;
};

export type PaymentMethodDisplay = {
  id: string;
  brand: string;
  last4: string;
  expiry: string;
  isDefault: boolean;
};

export type BillingUsageKey = {
  id: string;
  name: string;
  is_active: boolean;
  usage_count: number;
  monthly_limit: number | null;
  alert_threshold: number | null;
  alert_channels: string[] | null;
  dailyTrend?: CountOnlyDailyUsageTrend[];
};

export type BillingData = {
  plan: string;
  totalUsage: number;
  resetDate: string | null;
  nextInvoiceDate: string | null;
  keys: BillingUsageKey[];
  paymentMethods: PaymentMethodDisplay[] | null;
  customerBalance?: number | null;
  scheduledPlan?: string | null;
  scheduledPlanDate?: string | null;
  billingInterval?: "month" | "year" | null;
  subscriptionStatus?: "active" | "trialing" | "past_due" | "unpaid" | "incomplete" | "incomplete_expired" | "canceled" | "paused" | null;
  cancelAtPeriodEnd?: boolean;
};
