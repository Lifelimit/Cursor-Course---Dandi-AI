import React from "react";
import { PLANS } from "@/lib/constants";

type PlanSelectionProps = {
  planName: string;
  isLoading: boolean;
  billingInterval: "month" | "year";
  setBillingInterval: (interval: "month" | "year") => void;
  onSelectPlan: (planId: string) => void;
  onGoBack: () => void;
};

export function PlanSelection({ 
  planName, 
  isLoading, 
  billingInterval,
  setBillingInterval,
  onSelectPlan, 
  onGoBack 
}: PlanSelectionProps) {
  return (
    <div className="space-y-10">
      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-6 py-4">
        <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.2em] transition-colors ${billingInterval === "month" ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-300 dark:text-zinc-600"}`}>Monthly</span>
        <button 
          onClick={() => setBillingInterval(billingInterval === "month" ? "year" : "month")}
          className="relative h-6 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 p-1 transition-all hover:bg-zinc-200 dark:hover:bg-zinc-700"
        >
          <div className={`h-4 w-4 rounded-full bg-white dark:bg-zinc-900 shadow-md transition-all duration-300 ${billingInterval === "year" ? "translate-x-6" : "translate-x-0"}`} />
        </button>
        <div className="flex items-center gap-3">
          <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.2em] transition-colors ${billingInterval === "year" ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-300 dark:text-zinc-600"}`}>Annual</span>
          <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 px-3 py-1 text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest animate-pulse">20% OFF</span>
        </div>
      </div>

      <div className="space-y-4">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === planName;
          const displayPrice = billingInterval === "year" && plan.yearlyPrice ? plan.yearlyPrice : plan.price;
          
          return (
            <button
              key={plan.id}
              onClick={() => onSelectPlan(plan.id)}
              disabled={isLoading || isCurrent}
              className={`group flex w-full items-center justify-between rounded-[32px] border p-8 transition-all duration-300 ${
                isCurrent 
                  ? "border-emerald-400 dark:border-emerald-500 bg-white dark:bg-zinc-900 shadow-xl shadow-emerald-500/10 dark:shadow-black/50 ring-1 ring-emerald-400 dark:ring-emerald-500" 
                  : "border-zinc-100 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 hover:shadow-lg hover:shadow-zinc-200/50 dark:hover:shadow-black/40"
              }`}
            >
              <div className="text-left">
                <div className="flex items-center gap-3">
                  <p className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{plan.id}</p>
                  {plan.recommended && !isCurrent && (
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">Best Value</span>
                  )}
                </div>
                <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500 mt-1">
                  {displayPrice} / month 
                </p>
              </div>
              
              {isCurrent ? (
                <div className="flex items-center gap-2 rounded-full bg-emerald-100/50 dark:bg-emerald-950/40 px-4 py-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Current</span>
                </div>
              ) : (
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-900 group-hover:dark:text-zinc-100 transition-colors">Select</span>
              )}
            </button>
          );
        })}
      </div>
      
      <button 
        onClick={onGoBack}
        className="w-full font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-300 dark:text-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors py-4"
      >
        Go Back
      </button>
    </div>
  );
}
