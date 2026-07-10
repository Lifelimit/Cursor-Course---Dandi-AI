import React, { useState } from "react";
import { PLANS, PLAN_RANKS } from "@/lib/constants";
import { CommandPanel, StatusPill } from "@/components/command";

export function PlanComparison({ 
  currentPlan, 
  onUpgrade,
  billingInterval: initialInterval = "month"
}: { 
  currentPlan: string, 
  onUpgrade: (plan: string, interval: "month" | "year") => void,
  billingInterval?: "month" | "year"
}) {
  const [selectedInterval, setSelectedInterval] = useState<"month" | "year">(initialInterval);

  return (
    <div className="space-y-8 sm:space-y-12">
      <div className="flex flex-col items-center gap-4 px-2 text-center">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300/70">Plan options</p>
          <h3 className="mt-2 font-serif text-3xl font-bold tracking-tight text-white">Compare plans</h3>
          <p className="mt-2 text-sm font-medium text-slate-400">Plan changes take effect as shown in the confirmation step.</p>
        </div>
        <div className="flex w-full max-w-sm items-stretch justify-center gap-2 rounded-full border border-white/10 bg-slate-950/70 p-1 sm:w-auto">
          <button 
            type="button"
            onClick={() => setSelectedInterval("month")}
            className={`flex-1 rounded-full px-5 py-2 text-[10px] font-black uppercase tracking-widest transition-all sm:flex-none flex items-center justify-center whitespace-nowrap ${selectedInterval === "month" ? "bg-emerald-300 text-slate-950 shadow-sm" : "text-slate-500"}`}
          >
            Monthly
          </button>
          <button 
            type="button"
            onClick={() => setSelectedInterval("year")}
            className={`flex-1 rounded-full px-5 py-2 text-[10px] font-black uppercase tracking-widest transition-all sm:flex-none flex items-center justify-center whitespace-nowrap ${selectedInterval === "year" ? "bg-emerald-300 text-slate-950 shadow-sm" : "text-slate-500"}`}
          >
            Annual (-20%)
          </button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan.toLowerCase() === plan.id.toLowerCase();
          const currentPlanRank = PLAN_RANKS[currentPlan as keyof typeof PLAN_RANKS] ?? PLAN_RANKS.Hobby;
          const isUpgrade = !isCurrent && PLAN_RANKS[plan.id as keyof typeof PLAN_RANKS] > currentPlanRank;
          const displayPrice = selectedInterval === "year" && plan.yearlyPrice ? plan.yearlyPrice : plan.price;

          const cardStyles = isCurrent
            ? "border-emerald-300/45 shadow-[0_24px_90px_rgba(52,211,153,0.12)] ring-1 ring-emerald-300/30"
            : plan.recommended
              ? "border-cyan-300/25"
              : "border-white/10";
          const priceColor = isCurrent ? "text-emerald-200" : "text-white";
          const labelColor = "text-slate-500";
          const textColor = "text-slate-400";
          const featureTextColor = "text-slate-300";
          const checkStyles = isCurrent ? "bg-emerald-300/10 text-emerald-300" : "bg-white/10 text-slate-200";

          return (
            <CommandPanel
              key={plan.id}
              padding="none"
              className={`group relative flex min-w-0 flex-col p-6 transition-all hover:-translate-y-1 sm:p-10 ${cardStyles}`}
            >
              {(isCurrent || plan.recommended) && (
                <div className="mb-6 flex min-h-6 flex-wrap gap-2">
                  {isCurrent && (
                    <StatusPill tone="success" pulse compact>Current Plan</StatusPill>
                  )}
                  {plan.recommended && (
                    <div className="flex flex-col gap-1">
                      <StatusPill tone="info" compact>Most Popular</StatusPill>
                      <span className="px-0.5 text-[10px] font-medium leading-tight text-slate-500">
                        Best fit for most users
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              <div className="mb-8 space-y-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className={`text-4xl font-bold tracking-tighter sm:text-5xl ${priceColor}`}>{displayPrice}</span>
                  <span className={`text-xs font-medium uppercase tracking-widest ${labelColor}`}>/ mo</span>
                </div>
                {selectedInterval === "year" && plan.id !== "Hobby" && (
                  <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-500 italic">Billed annually</p>
                )}
                <p className={`text-sm font-medium ${textColor}`}>{plan.credits}</p>
              </div>

              <div className="mb-10 flex-1 border-t border-white/10 pt-8 space-y-4">
                <ul className="space-y-4">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm font-medium">
                      <div className={`flex h-5 w-5 items-center justify-center rounded-full ${checkStyles}`}>
                        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
                          <path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <span className={featureTextColor}>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => !isCurrent && onUpgrade(plan.id, selectedInterval)}
                disabled={isCurrent}
                className={`w-full rounded-full py-4 text-[10px] font-black uppercase tracking-widest transition-all ${
                  isCurrent 
                    ? "bg-white/10 text-slate-500 cursor-not-allowed"
                    : "bg-emerald-300 text-slate-950 hover:bg-emerald-200 shadow-xl shadow-emerald-950/10"
                }`}
              >
                {isCurrent ? "Current Plan" : isUpgrade ? "Upgrade" : "Downgrade"}
              </button>
            </CommandPanel>
          );
        })}
      </div>
    </div>
  );
}
