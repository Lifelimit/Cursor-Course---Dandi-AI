import React, { useState } from "react";
import { PLANS, PLAN_RANKS } from "@/lib/constants";

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
        <h3 className="font-serif text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Choose your path</h3>
        <div className="flex w-full max-w-sm items-stretch justify-center gap-2 rounded-full bg-zinc-100 p-1 dark:bg-zinc-800 sm:w-auto">
          <button 
            onClick={() => setSelectedInterval("month")}
            className={`flex-1 rounded-full px-5 py-2 text-[10px] font-black uppercase tracking-widest transition-all sm:flex-none flex items-center justify-center whitespace-nowrap ${selectedInterval === "month" ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm" : "text-zinc-400 dark:text-zinc-500"}`}
          >
            Monthly
          </button>
          <button 
            onClick={() => setSelectedInterval("year")}
            className={`flex-1 rounded-full px-5 py-2 text-[10px] font-black uppercase tracking-widest transition-all sm:flex-none flex items-center justify-center whitespace-nowrap ${selectedInterval === "year" ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm" : "text-zinc-400 dark:text-zinc-500"}`}
          >
            Annual (-20%)
          </button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan.toLowerCase() === plan.id.toLowerCase();
          const isUpgrade = !isCurrent && (PLAN_RANKS[plan.id as keyof typeof PLAN_RANKS] > PLAN_RANKS[currentPlan as keyof typeof PLAN_RANKS]);
          const displayPrice = selectedInterval === "year" && plan.yearlyPrice ? plan.yearlyPrice : plan.price;

          const baseCardStyles = plan.id === "Hobby"
            ? "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
            : plan.id === "Premium"
            ? "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xl"
            : "border-zinc-200 dark:border-zinc-800 bg-[#18181b] text-white";
          const cardStyles = isCurrent
            ? "border-2 border-emerald-400 dark:border-emerald-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xl shadow-emerald-500/10 ring-1 ring-emerald-400 dark:ring-emerald-500"
            : baseCardStyles;
          const priceColor = isCurrent ? "text-zinc-900 dark:text-zinc-100" : `${plan.priceColor} ${!plan.dark ? "dark:text-zinc-100" : ""}`;
          const labelColor = isCurrent ? "text-zinc-400 dark:text-zinc-500" : `${plan.labelColor} ${!plan.dark ? "dark:text-zinc-400" : ""}`;
          const textColor = isCurrent ? "text-zinc-500 dark:text-zinc-400" : (plan.dark ? "text-zinc-300" : "text-zinc-500 dark:text-zinc-400");
          const featureTextColor = isCurrent ? "text-zinc-600 dark:text-zinc-400" : (plan.dark ? "text-zinc-400" : "text-zinc-600 dark:text-zinc-400");
          const checkStyles = isCurrent ? "bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100" : (plan.dark ? "bg-white/10 text-white" : "bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100");

          return (
            <div 
              key={plan.id}
              className={`group relative flex min-w-0 flex-col rounded-[32px] border p-6 transition-all hover:scale-[1.02] sm:p-10 md:rounded-[40px] ${cardStyles}`}
            >
              {(isCurrent || plan.recommended) && (
                <div className="mb-6 flex min-h-6 flex-wrap gap-2">
                  {isCurrent && (
                    <span className="inline-flex items-center justify-center rounded-full bg-emerald-100 px-3 py-1 text-center text-[8px] font-black uppercase tracking-widest text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                      Active Plan
                    </span>
                  )}
                  {plan.recommended && (
                    <div className="flex flex-col gap-1">
                      <span className="inline-flex items-center justify-center rounded-full bg-zinc-100 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
                        Most Popular
                      </span>
                      <span className="px-0.5 text-[10px] font-medium leading-tight text-zinc-500 dark:text-zinc-400">
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

              <div className="mb-10 flex-1 border-t border-zinc-100 dark:border-zinc-800 pt-8 space-y-4">
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
                onClick={() => !isCurrent && onUpgrade(plan.id, selectedInterval)}
                disabled={isCurrent}
                className={`w-full rounded-full py-4 text-[10px] font-black uppercase tracking-widest transition-all ${
                  isCurrent 
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
                    : plan.dark
                    ? "bg-white text-zinc-900 hover:bg-zinc-100 shadow-xl shadow-white/5"
                    : "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-xl shadow-zinc-900/10"
                }`}
              >
                {isCurrent ? "Active Plan" : isUpgrade ? "Upgrade Now" : "Downgrade"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
