"use client";

import React from "react";

type PlanHeroProps = {
  plan: string;
  limit: number;
  usage: number;
  nextBillingDate: string | null;
  isUnlimited?: boolean;
  billingInterval?: "month" | "year";
};

export function PlanHero({ plan, limit, usage, nextBillingDate, isUnlimited, billingInterval = "month" }: PlanHeroProps) {
  const pct = isUnlimited ? 0 : Math.min((usage / limit) * 100, 100);
  
  return (
    <div className="relative overflow-hidden rounded-[32px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 shadow-sm">
      {/* Background Accent */}
      <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-500/5 blur-[80px]" />
      <div className="absolute -left-24 -bottom-24 h-64 w-64 rounded-full bg-zinc-900/5 dark:bg-zinc-100/5 blur-[80px]" />
 
      <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 dark:text-zinc-500">Current Subscription</p>
            <h2 className="font-serif text-4xl font-bold tracking-tight italic text-zinc-900 dark:text-zinc-100">{plan}</h2>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-2">
              <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Status</p>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase">Active</span>
              </div>
            </div>
            
            <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-2">
              <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Billing Cycle</p>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 capitalize">{billingInterval}ly</span>
                {billingInterval === "year" && (
                  <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/50 px-1.5 py-0.5 text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Saved 20%</span>
                )}
              </div>
            </div>
 
            <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-2">
              <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Next Invoice</p>
              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                {nextBillingDate ? new Date(nextBillingDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}
              </p>
            </div>
          </div>
        </div>
 
        <div className="w-full max-w-md space-y-4">
          <div className="flex items-end justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Usage this Period</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-serif font-bold italic text-zinc-900 dark:text-zinc-100">{usage.toLocaleString()}</span>
                <span className="text-[10px] font-bold text-zinc-400">/ {isUnlimited ? '∞' : limit.toLocaleString()} credits</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-black text-zinc-900 dark:text-zinc-100">{Math.round(pct)}%</span>
            </div>
          </div>
          
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div 
              className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-1000 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          
          <p className="text-[10px] text-zinc-400">
            Your usage resets on {nextBillingDate ? new Date(nextBillingDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'the next cycle'}.
          </p>
        </div>
      </div>
    </div>
  );
}
