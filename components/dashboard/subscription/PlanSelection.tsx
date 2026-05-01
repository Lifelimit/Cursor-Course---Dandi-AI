import React from "react";
import { PLAN_DETAILS } from "@/lib/constants";

type PlanSelectionProps = {
  planName: string;
  isLoading: boolean;
  onSelectPlan: (planId: string) => void;
  onGoBack: () => void;
};

export function PlanSelection({ planName, isLoading, onSelectPlan, onGoBack }: PlanSelectionProps) {
  return (
    <div className="space-y-4">
      {Object.values(PLAN_DETAILS).map((plan) => (
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
            <p className="text-sm font-bold text-zinc-900">{plan.id}</p>
            <p className="text-[10px] text-zinc-500">{plan.price} / month</p>
          </div>
          {plan.id === planName ? (
            <span className="text-[10px] font-black uppercase text-emerald-600">Current</span>
          ) : (
            <span className="text-[10px] font-black uppercase text-zinc-400">Select</span>
          )}
        </button>
      ))}
      <button 
        onClick={onGoBack}
        className="w-full text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-900 mt-4"
      >
        Go Back
      </button>
    </div>
  );
}
