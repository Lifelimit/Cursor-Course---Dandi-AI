import React from "react";
import { PLANS } from "@/lib/constants";

export function PlanComparison({ currentPlan, onUpgrade }: { currentPlan: string, onUpgrade: (plan: string) => void }) {
  return (
    <div className="space-y-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-2">
        <h3 className="font-serif text-3xl font-bold tracking-tight">Choose your path</h3>
        <div className="flex items-center gap-2 rounded-full bg-zinc-100 p-1">
          <button className="rounded-full bg-white px-5 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-900 shadow-sm">Monthly</button>
          <button className="px-5 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">Annual (Save 20%)</button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan.toLowerCase() === plan.id.toLowerCase();
          const isPremium = plan.id === "Premium";
          
          return (
            <div 
              key={plan.id}
              className={`relative flex flex-col rounded-[40px] border p-10 transition-all hover:scale-[1.02] ${plan.className}`}
            >
              {plan.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-4 py-1 text-[8px] font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20">
                  Most Popular
                </div>
              )}

              <div className="mb-10 space-y-3">
                <h4 className="font-serif text-2xl font-bold">{plan.id}</h4>
                <div className="flex items-baseline gap-1">
                  <span className={`font-serif text-5xl font-bold italic ${plan.priceColor}`}>{plan.price}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${plan.labelColor}`}>/ month</span>
                </div>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${isPremium ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  {plan.credits}
                </p>
              </div>

              <div className="mb-12 flex-1 space-y-5">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor">
                      <path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className={`text-xs font-medium ${plan.textColor}`}>{feature}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => !isCurrent && onUpgrade(plan.id)}
                disabled={isCurrent}
                className={`w-full rounded-full py-4 text-[10px] font-black uppercase tracking-widest transition-all ${
                  isCurrent
                    ? 'cursor-default bg-zinc-100 text-zinc-400 border-transparent'
                    : isPremium
                      ? 'bg-white text-zinc-900 hover:bg-zinc-200 shadow-xl shadow-white/10'
                      : 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-xl shadow-zinc-900/10'
                }`}
              >
                {isCurrent ? 'Active Plan' : plan.cta}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
