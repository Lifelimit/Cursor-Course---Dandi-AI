"use client";

import React from "react";

type Plan = {
  name: string;
  price: string;
  credits: string;
  features: string[];
  cta: string;
  isCurrent?: boolean;
  isPremium?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Hobby",
    price: "$0",
    credits: "1,000 credits / mo",
    features: ["Standard Summaries", "Basic Analytics", "3 Active Keys", "Community Support"],
    cta: "Downgrade",
  },
  {
    name: "Premium",
    price: "$19",
    credits: "5,000 credits / mo",
    features: ["Advanced AI Context", "Detailed Analytics", "10 Active Keys", "Priority Email Support", "CSV Data Export"],
    cta: "Switch to Premium",
    isPremium: true,
  },
  {
    name: "Researcher",
    price: "$49",
    credits: "Unlimited credits",
    features: ["Deep Insight Engine", "Global Top Trends", "Unlimited Keys", "24/7 Phone Support", "Custom Alert Rules"],
    cta: "Go Researcher",
  }
];

export function PlanComparison({ currentPlan, onUpgrade }: { currentPlan: string, onUpgrade: (plan: string) => void }) {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-serif text-2xl font-bold">Choose your path</h3>
        <div className="flex items-center gap-2 rounded-full bg-zinc-100 p-1">
          <button className="rounded-full bg-white px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-900 shadow-sm">Monthly</button>
          <button className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Annual (Save 20%)</button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan.toLowerCase() === plan.name.toLowerCase();
          
          return (
            <div 
              key={plan.name}
              className={`relative flex flex-col rounded-[32px] border p-8 transition-all hover:shadow-xl ${
                plan.isPremium 
                  ? 'border-zinc-900 bg-[#18181b] text-white shadow-2xl shadow-zinc-900/20' 
                  : 'border-zinc-200 bg-white'
              }`}
            >
              {plan.isPremium && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-1 text-[8px] font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20">
                  Most Popular
                </div>
              )}

              <div className="mb-8 space-y-2">
                <h4 className="font-serif text-xl font-bold">{plan.name}</h4>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-serif font-bold italic">{plan.price}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${plan.isPremium ? 'text-white/40' : 'text-zinc-400'}`}>/ month</span>
                </div>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${plan.isPremium ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  {plan.credits}
                </p>
              </div>

              <div className="mb-12 flex-1 space-y-4">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <svg viewBox="0 0 24 24" className={`h-4 w-4 ${plan.isPremium ? 'text-emerald-400' : 'text-emerald-500'}`} fill="none" stroke="currentColor">
                      <path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className={`text-xs font-medium ${plan.isPremium ? 'text-white/70' : 'text-zinc-600'}`}>{feature}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => !isCurrent && onUpgrade(plan.name)}
                disabled={isCurrent}
                className={`w-full rounded-full py-4 text-[10px] font-black uppercase tracking-widest transition-all ${
                  isCurrent
                    ? 'cursor-default border border-zinc-200 bg-zinc-50 text-zinc-400'
                    : plan.isPremium
                      ? 'bg-white text-zinc-900 hover:bg-zinc-200'
                      : 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-lg shadow-zinc-900/10'
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
