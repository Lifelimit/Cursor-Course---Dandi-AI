"use client";

import Link from "next/link";
import { CommandPanel, StatusPill } from "@/components/command";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ANNUAL_SAVINGS_PERCENT, getPlanAnnualTotal, PLANS, PLAN_DETAILS } from "@/lib/constants";
import { formatCurrencyFromCents, formatLongDate, formatLongDateWithoutYear, formatRequestCount } from "@/lib/format";
import type { BillingData } from "@/types/billing";

type PlanHeroProps = {
  plan: string;
  limit: number;
  usage: number;
  resetDate: string | null;
  nextBillingDate: string | null;
  isUnlimited?: boolean;
  billingInterval?: "month" | "year";
  customerBalance?: number | null;
  scheduledPlan?: string | null;
  scheduledPlanDate?: string | null;
  subscriptionStatus?: BillingData["subscriptionStatus"];
  cancelAtPeriodEnd?: boolean;
  onManageSubscription: () => void;
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  trialing: "Trialing",
  past_due: "Past due",
  unpaid: "Unpaid",
  incomplete: "Incomplete",
  incomplete_expired: "Incomplete / expired",
  canceled: "Canceled",
  paused: "Paused",
};

function getStatusTone(status: BillingData["subscriptionStatus"]) {
  if (status === "active" || status === "trialing") return "success" as const;
  if (status === "past_due" || status === "unpaid" || status === "incomplete") return "warning" as const;
  if (status === "canceled" || status === "incomplete_expired") return "danger" as const;
  return "neutral" as const;
}

export function PlanHero({
  plan,
  limit,
  usage,
  resetDate,
  nextBillingDate,
  isUnlimited,
  billingInterval = "month",
  customerBalance,
  scheduledPlan,
  scheduledPlanDate,
  subscriptionStatus,
  cancelAtPeriodEnd,
  onManageSubscription,
}: PlanHeroProps) {
  const planConfig = PLANS.find((candidate) => candidate.id.toLowerCase() === plan.toLowerCase()) || PLANS[0];
  const planDetails = PLAN_DETAILS[planConfig.id];
  const displayPrice = billingInterval === "year" && planConfig.yearlyPrice ? planConfig.yearlyPrice : planConfig.price;
  const annualTotal = billingInterval === "year" ? getPlanAnnualTotal(planConfig) : null;
  const pct = isUnlimited ? 0 : Math.min((usage / Math.max(limit, 1)) * 100, 100);
  const isHobby = planConfig.id === "Hobby";
  const statusLabel = isHobby ? "Free plan" : subscriptionStatus ? STATUS_LABELS[subscriptionStatus] || subscriptionStatus : "Billing status unavailable";
  const statusTone = isHobby ? "info" : getStatusTone(subscriptionStatus);
  const fitMessage = isUnlimited
    ? "This plan does not have a fixed request allowance."
    : pct >= 100
      ? "The current cycle has reached the included request allowance."
      : pct >= 80
        ? `You have used ${Math.round(pct)}% of the included capacity this cycle.`
        : "Your current plan comfortably supports this cycle’s usage.";

  return (
    <CommandPanel padding="none" className="relative isolate overflow-hidden border-emerald-300/20 bg-[radial-gradient(circle_at_82%_0%,rgba(45,212,191,0.14),transparent_30%),linear-gradient(135deg,rgba(7,19,27,0.98),rgba(5,11,20,0.92))] shadow-[0_30px_100px_rgba(16,185,129,0.08)]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(52,211,153,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(52,211,153,0.12)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:linear-gradient(120deg,black,transparent_70%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-cyan-300/10 blur-[90px]" />

      <div className="relative grid gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:gap-12 lg:p-10">
        <div className="min-w-0 space-y-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-300/75">Active subscription</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <h2 className="font-serif text-4xl font-bold tracking-tight text-white sm:text-5xl">{planConfig.name}</h2>
                <StatusPill tone={statusTone} compact>{statusLabel}</StatusPill>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onManageSubscription} className="rounded-full border border-white/15 bg-white/[0.05] px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-200 transition hover:border-emerald-300/40 hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
                Manage
              </button>
              <Link href="/usage" className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100 transition hover:bg-emerald-300/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
                View usage
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Billing cadence" value={isHobby ? "Free plan" : billingInterval === "year" ? "Annual" : "Monthly"} detail={!isHobby && billingInterval === "year" ? `Save ${ANNUAL_SAVINGS_PERCENT}%` : undefined} />
            <Metric label={isHobby ? "Plan capacity" : "Plan price"} value={isHobby ? `${formatRequestCount(planDetails.monthlyLimit || 0)} requests` : `${displayPrice} / month`} detail={annualTotal ? `Billed annually at ${annualTotal}` : undefined} />
            <Metric label={cancelAtPeriodEnd ? "Access ends" : isHobby ? "Next reset" : "Next renewal"} value={cancelAtPeriodEnd ? (nextBillingDate ? formatLongDate(nextBillingDate) : "End of current term") : nextBillingDate ? formatLongDate(nextBillingDate) : "Not scheduled"} />
            <BalanceMetric balance={customerBalance} />
          </div>

          {scheduledPlan && scheduledPlan !== planConfig.id && (
            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.08] p-4 sm:flex sm:items-center sm:justify-between sm:gap-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">Scheduled change</p>
                <p className="mt-1 text-sm font-medium text-cyan-50">{planConfig.name} → {scheduledPlan} {scheduledPlanDate ? `on ${formatLongDate(scheduledPlanDate)}` : "at the end of your term"}</p>
                <p className="mt-1 text-xs text-cyan-100/65">Your current benefits remain active until the change takes effect.</p>
              </div>
              <button type="button" onClick={onManageSubscription} className="mt-3 shrink-0 text-left text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200 underline decoration-cyan-200/30 underline-offset-4 hover:text-white sm:mt-0">Review change</button>
            </div>
          )}

          {cancelAtPeriodEnd && !scheduledPlan && (
            <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.08] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">Cancellation scheduled</p>
              <p className="mt-1 text-sm font-medium text-amber-50">Your current benefits remain active until {nextBillingDate ? formatLongDate(nextBillingDate) : "the end of your current term"}.</p>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col justify-between rounded-[24px] border border-white/10 bg-black/20 p-5 sm:p-6">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Current cycle</p>
                <p className="mt-3 font-serif text-4xl font-bold tracking-tight text-white">{formatRequestCount(usage)}</p>
              </div>
              <p className="pt-2 text-right text-sm font-bold tabular-nums text-emerald-200">{isUnlimited ? "∞" : `${Math.round(pct)}%`}</p>
            </div>
            <p className="mt-1 text-xs text-slate-400">of {isUnlimited ? "unlimited" : `${formatRequestCount(limit)} included`} requests used</p>
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10" role={isUnlimited ? "group" : "meter"} aria-label={isUnlimited ? `${formatRequestCount(usage)} requests used on an unlimited plan` : "Request usage this billing cycle"} aria-valuemin={isUnlimited ? undefined : 0} aria-valuemax={isUnlimited ? undefined : 100} aria-valuenow={isUnlimited ? undefined : Math.round(pct)} aria-valuetext={isUnlimited ? undefined : `${formatRequestCount(usage)} of ${formatRequestCount(limit)} requests used`}>
              <ProgressBar
                value={isUnlimited ? 100 : Math.max(pct, usage > 0 ? 2 : 0)}
                indicatorClassName={pct >= 80 ? "text-amber-300" : "text-emerald-300"}
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-400">{fitMessage}</p>
          </div>
          <div className="mt-8 border-t border-white/10 pt-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Cycle timing</p>
            <p className="mt-2 text-sm font-semibold text-slate-200">{resetDate ? `Usage resets ${formatLongDateWithoutYear(resetDate)}` : "Reset date unavailable"}</p>
            <Link href="/usage" className="mt-3 inline-flex text-xs font-bold text-emerald-200 underline decoration-emerald-200/30 underline-offset-4 hover:text-white">Open Usage Intelligence →</Link>
          </div>
        </div>
      </div>
    </CommandPanel>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3"><p className="truncate text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p><p className="mt-2 truncate text-sm font-bold text-slate-100">{value}</p>{detail && <p className="mt-1 truncate text-[10px] font-medium text-emerald-200/75">{detail}</p>}</div>;
}

function BalanceMetric({ balance }: { balance?: number | null }) {
  if (typeof balance !== "number" || balance === 0) return <Metric label="Account balance" value="No balance due" />;
  const isCredit = balance < 0;
  return <Metric label={isCredit ? "Account credit" : "Amount owed"} value={formatCurrencyFromCents(Math.abs(balance))} detail={isCredit ? "Applied to eligible invoices" : "Due on the next billing event"} />;
}
