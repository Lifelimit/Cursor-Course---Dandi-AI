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
        <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.2em] transition-colors ${billingInterval === "month" ? "text-white" : "text-slate-500"}`}>Monthly</span>
        <button 
          onClick={() => setBillingInterval(billingInterval === "month" ? "year" : "month")}
          className="relative h-6 w-12 rounded-full bg-slate-800 p-1 transition-all hover:bg-slate-700 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          role="switch"
          aria-checked={billingInterval === "year"}
          aria-label="Billing Interval Toggle"
        >
          <div className={`h-4 w-4 rounded-full bg-white shadow-md transition-all duration-300 ${billingInterval === "year" ? "translate-x-6" : "translate-x-0"}`} />
        </button>
        <div className="flex items-center gap-3">
          <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.2em] transition-colors ${billingInterval === "year" ? "text-white" : "text-slate-500"}`}>Annual</span>
          <span className="rounded-full bg-emerald-950 px-3 py-1 text-[9px] font-black text-emerald-400 uppercase tracking-widest animate-pulse">20% OFF</span>
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
              className={`group flex w-full items-center justify-between rounded-[32px] border p-8 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                isCurrent 
                  ? "border-emerald-500/50 bg-emerald-950/10 shadow-emerald-500/5 ring-1 ring-emerald-500/40" 
                  : "border-white/5 bg-slate-950/30 hover:border-white/10 hover:bg-slate-950/60 cursor-pointer"
              }`}
            >
              <div className="text-left">
                <div className="flex items-center gap-3">
                  <p className="text-xl font-bold tracking-tight text-white">{plan.id}</p>
                  {plan.recommended && !isCurrent && (
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-full">Best Value</span>
                  )}
                </div>
                <p className="text-xs font-medium text-slate-400 mt-1">
                  {displayPrice} / month 
                </p>
              </div>
              
              {isCurrent ? (
                <div className="flex items-center gap-2 rounded-full bg-emerald-950/40 px-4 py-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Current</span>
                </div>
              ) : (
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-white transition-colors">Select</span>
              )}
            </button>
          );
        })}
      </div>
      
      <button 
        onClick={onGoBack}
        className="w-full font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500 hover:text-white transition-colors py-4 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
      >
        Go Back
      </button>
    </div>
  );
}
