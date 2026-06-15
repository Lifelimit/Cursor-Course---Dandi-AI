"use client";

import React from "react";
import { CommandPanel, StatusPill } from "@/components/command";

type PlanHeroProps = {
  plan: string;
  limit: number;
  usage: number;
  nextBillingDate: string | null;
  isUnlimited?: boolean;
  billingInterval?: "month" | "year";
  customerBalance?: number | null;
  scheduledPlan?: string | null;
  scheduledPlanDate?: string | null;
};

export function PlanHero({ plan, limit, usage, nextBillingDate, isUnlimited, billingInterval = "month", customerBalance, scheduledPlan, scheduledPlanDate }: PlanHeroProps) {
  const pct = isUnlimited ? 0 : Math.min((usage / limit) * 100, 100);
  
  return (
    <CommandPanel padding="none" className="relative overflow-hidden p-5 sm:p-8 flex flex-col gap-6">
      {/* Background Accent */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-400/10 blur-[80px]" />
      <div className="pointer-events-none absolute -left-24 -bottom-24 h-64 w-64 rounded-full bg-cyan-400/5 blur-[80px]" />

      {scheduledPlan && scheduledPlan !== plan && (
        <div className="relative z-10 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">Scheduled Plan Change</p>
            <p className="mt-1 text-sm font-medium text-cyan-100">
              Your subscription will switch to <strong>{scheduledPlan}</strong> on {scheduledPlanDate ? new Date(scheduledPlanDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'the end of your billing cycle'}.
            </p>
          </div>
        </div>
      )}
 
      <div className="relative z-10 flex min-w-0 flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-4">
          <div className="space-y-1">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-300/75">Current Subscription</p>
            <h2 className="font-serif text-4xl font-bold tracking-tight italic text-white">{plan}</h2>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Status</p>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-xs font-bold text-slate-100 uppercase">Active</span>
              </div>
            </div>
            
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Billing Cycle</p>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-100 capitalize">{billingInterval}ly</span>
                {billingInterval === "year" && (
                  <StatusPill tone="success" compact>Saved 20%</StatusPill>
                )}
              </div>
            </div>
 
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Next Invoice</p>
              <p className="text-xs font-bold text-slate-100">
                {nextBillingDate ? new Date(nextBillingDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}
              </p>
            </div>

            {typeof customerBalance === "number" && customerBalance < 0 && (
              <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-2">
                <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-300">Available Credit</p>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                  <span className="text-xs font-bold text-emerald-200">
                    ${(Math.abs(customerBalance) / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
 
        <div className="w-full min-w-0 max-w-md space-y-4">
          <div className="flex items-end justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Request Usage This Period</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-serif font-bold italic text-white">{usage.toLocaleString()}</span>
                <span className="text-[10px] font-bold text-slate-500">/ {isUnlimited ? '∞' : limit.toLocaleString()} requests</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-black text-white">{Math.round(pct)}%</span>
            </div>
          </div>
          
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div 
              className="h-full rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.35)] transition-all duration-1000 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          
          <p className="text-[10px] text-slate-500">
            Your usage resets on {nextBillingDate ? new Date(nextBillingDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'the next cycle'}.
          </p>
        </div>
      </div>
    </CommandPanel>
  );
}
