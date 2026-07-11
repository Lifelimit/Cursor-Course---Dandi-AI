"use client";

import { useState } from "react";
import { ANNUAL_SAVINGS_PERCENT, getPlanAnnualTotal, PLAN_DETAILS, PLANS, PLAN_RANKS } from "@/lib/constants";
import { CommandPanel, StatusPill } from "@/components/command";

export function PlanComparison({
  currentPlan,
  scheduledPlan,
  onUpgrade,
  billingInterval: initialInterval = "month",
}: {
  currentPlan: string;
  scheduledPlan?: string | null;
  onUpgrade: (plan: string, interval: "month" | "year") => void;
  billingInterval?: "month" | "year";
}) {
  const [selectedInterval, setSelectedInterval] = useState<"month" | "year">(initialInterval);
  const normalizedCurrentPlan = currentPlan.toLowerCase();

  return (
    <div className="space-y-7 sm:space-y-9">
      <div className="flex flex-col gap-5 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300/70">Plan architecture</p>
          <h3 className="mt-2 font-serif text-3xl font-bold tracking-tight text-white">Choose your operating range</h3>
          <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-slate-400">Compare the three Dandi plans. Final timing and billing details are confirmed securely in the subscription flow.</p>
        </div>
        <div className="inline-flex self-start rounded-full border border-white/10 bg-slate-950/75 p-1" role="group" aria-label="Billing interval">
          <button type="button" aria-pressed={selectedInterval === "month"} onClick={() => setSelectedInterval("month")} className={`rounded-full px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.14em] transition ${selectedInterval === "month" ? "bg-white text-slate-950" : "text-slate-500 hover:text-white"}`}>Monthly</button>
          <button type="button" aria-pressed={selectedInterval === "year"} onClick={() => setSelectedInterval("year")} className={`rounded-full px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.14em] transition ${selectedInterval === "year" ? "bg-emerald-300 text-slate-950" : "text-slate-500 hover:text-white"}`}>Annual <span className="ml-1 text-[9px]">save {ANNUAL_SAVINGS_PERCENT}%</span></button>
        </div>
      </div>

      <div className="grid items-stretch gap-4 xl:grid-cols-3">
        {PLANS.map((plan) => {
          const details = PLAN_DETAILS[plan.id];
          const isCurrent = normalizedCurrentPlan === plan.id.toLowerCase();
          const isScheduled = Boolean(scheduledPlan && scheduledPlan.toLowerCase() === plan.id.toLowerCase() && !isCurrent);
          const currentRank = PLAN_RANKS[Object.keys(PLAN_RANKS).find((key) => key.toLowerCase() === normalizedCurrentPlan) || "Hobby"] ?? PLAN_RANKS.Hobby;
          const isUpgrade = PLAN_RANKS[plan.id] > currentRank;
          const displayPrice = selectedInterval === "year" && plan.yearlyPrice ? plan.yearlyPrice : plan.price;
          const annualTotal = selectedInterval === "year" ? getPlanAnnualTotal(plan) : null;
          const capacity = details.monthlyLimit === null ? "Unlimited requests" : `${details.monthlyLimit.toLocaleString()} requests / month`;
          const keys = details.keyLimit === null ? "Unlimited API keys" : `${details.keyLimit} active API keys`;

          return (
            <CommandPanel key={plan.id} padding="none" className={`relative flex min-w-0 flex-col p-5 transition-[border-color,box-shadow,transform] motion-reduce:transition-none sm:p-6 ${isCurrent ? "border-emerald-300/45 bg-emerald-300/[0.055] shadow-[0_24px_80px_rgba(52,211,153,0.1)]" : plan.recommended ? "border-cyan-300/25" : "border-white/10"}`}>
              {plan.recommended && <div className="absolute right-5 top-5"><StatusPill tone="info" compact>Best fit</StatusPill></div>}
              <div className="min-h-[104px] pr-20">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">{plan.name}</p>
                  {isCurrent && <StatusPill tone="success" compact>Current</StatusPill>}
                  {isScheduled && <StatusPill tone="info" compact>Scheduled</StatusPill>}
                </div>
                <p className="mt-3 text-sm font-medium leading-6 text-slate-400">{plan.credits}</p>
              </div>

              <div className="border-y border-white/10 py-5">
                <div className="flex items-baseline gap-1">
                  <span className={`text-4xl font-bold tracking-[-0.06em] ${isCurrent ? "text-emerald-200" : "text-white"}`}>{displayPrice}</span>
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">/ month</span>
                </div>
                <p className="mt-2 min-h-5 text-[10px] font-bold uppercase tracking-[0.13em] text-emerald-200/75">{annualTotal ? `Billed annually at ${annualTotal}` : plan.id === "Hobby" ? "No card required" : "Billed monthly"}</p>
              </div>

              <div className="flex-1 py-5">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Included</p>
                <ul className="mt-4 space-y-3">
                  <Feature>{capacity}</Feature>
                  <Feature>{keys}</Feature>
                  {plan.features.slice(0, 3).map((feature) => <Feature key={feature}>{feature}</Feature>)}
                </ul>
              </div>

              <button type="button" disabled={isCurrent || isScheduled} onClick={() => onUpgrade(plan.id, selectedInterval)} className={`min-h-12 w-full rounded-2xl px-4 text-[10px] font-black uppercase tracking-[0.15em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${isCurrent ? "cursor-not-allowed bg-white/10 text-slate-500" : isScheduled ? "cursor-not-allowed border border-cyan-300/20 bg-cyan-300/10 text-cyan-100" : isUpgrade ? "bg-emerald-300 text-slate-950 shadow-[0_12px_30px_rgba(52,211,153,0.16)] hover:bg-emerald-200" : "border border-white/15 bg-white/[0.05] text-slate-200 hover:border-emerald-300/35 hover:text-emerald-100"}`}>
                {isCurrent ? "Current plan" : isScheduled ? "Scheduled" : isUpgrade ? `Upgrade to ${plan.name}` : `Switch to ${plan.name}`}
              </button>
            </CommandPanel>
          );
        })}
      </div>
    </div>
  );
}

function Feature({ children }: { children: string }) {
  return <li className="flex items-start gap-3 text-sm font-medium text-slate-300"><span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-300/10 text-emerald-200" aria-hidden="true">✓</span><span>{children}</span></li>;
}
