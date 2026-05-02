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
    <div className="space-y-6">
      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4 py-2 bg-zinc-50 rounded-2xl border border-zinc-100">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${billingInterval === "month" ? "text-zinc-900" : "text-zinc-400"}`}>Monthly</span>
        <button 
          onClick={() => setBillingInterval(billingInterval === "month" ? "year" : "month")}
          className="relative h-5 w-10 rounded-full bg-zinc-200 p-1 transition-colors hover:bg-zinc-300"
        >
          <div className={`h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${billingInterval === "year" ? "translate-x-5" : "translate-x-0"}`} />
        </button>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-widest ${billingInterval === "year" ? "text-zinc-900" : "text-zinc-400"}`}>Annual</span>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[8px] font-black text-emerald-600 uppercase tracking-widest">20% OFF</span>
        </div>
      </div>

      <div className="space-y-4">
        {PLANS.map((plan) => {
          const displayPrice = billingInterval === "year" && plan.yearlyPrice ? plan.yearlyPrice : plan.price;
          
          return (
            <button
              key={plan.id}
              onClick={() => onSelectPlan(plan.id)}
              disabled={isLoading || plan.id === planName}
              className={`flex w-full items-center justify-between rounded-2xl border p-4 transition-all ${
                plan.id === planName 
                  ? "border-emerald-200 bg-emerald-50 cursor-default" 
                  : "border-zinc-100 bg-zinc-50 hover:border-zinc-200 hover:bg-zinc-100"
              }`}
            >
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-zinc-900">{plan.id}</p>
                  {plan.recommended && (
                    <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">Best Value</span>
                  )}
                </div>
                <p className="text-[10px] text-zinc-500">
                  {displayPrice} / month 
                  {billingInterval === "year" && plan.id !== "Hobby" && " (billed annually)"}
                </p>
              </div>
              {plan.id === planName ? (
                <span className="text-[10px] font-black uppercase text-emerald-600">Current</span>
              ) : (
                <span className="text-[10px] font-black uppercase text-zinc-400">Select</span>
              )}
            </button>
          );
        })}
      </div>
      
      <button 
        onClick={onGoBack}
        className="w-full text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-900 mt-2"
      >
        Go Back
      </button>
    </div>
  );
}
