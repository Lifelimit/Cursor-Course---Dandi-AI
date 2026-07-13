import React from "react";
import { PLANS } from "@/lib/constants";

type PlanReviewProps = {
  pendingPlan: string | null;
  isLoading: boolean;
  billingInterval: "month" | "year";
  onConfirm: () => void;
  onBack: () => void;
};

export function PlanReview({
  pendingPlan,
  isLoading,
  billingInterval,
  onConfirm,
  onBack
}: PlanReviewProps) {
  if (!pendingPlan) return null;

  const plan = PLANS.find(p => p.id === pendingPlan);

  if (!plan) return null;

  const displayPrice = billingInterval === "year" && plan.yearlyPrice ? plan.yearlyPrice : plan.price;
  const priceValue = parseFloat(displayPrice.replace("$", ""));
  const fullTermAmount = billingInterval === "year" ? priceValue * 12 : priceValue;

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] lg:gap-5">
        <div className="rounded-[24px] border border-white/5 bg-slate-950/40 p-5 sm:p-6">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="h-3 w-3 text-slate-400" fill="none" stroke="currentColor" aria-hidden="true">
                  <path d="M9 12l2 2 4-4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Target Plan</span>
              </div>
              <p className="text-base font-bold text-white">{pendingPlan} Tier</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="h-3 w-3 text-slate-400" fill="none" stroke="currentColor" aria-hidden="true">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Billing Cycle</span>
              </div>
              <p className="text-base font-bold text-white capitalize">{billingInterval}</p>
            </div>
          </div>

          <div className="mt-5 border-t border-white/5 pt-5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Checkout Security</span>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-400">
              Your payment is handled by Stripe Elements. Dandi does not store your full card details.
            </p>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-slate-950/80 p-5 text-white sm:p-6">
          <h4 className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">Checkout Summary</h4>

          <div className="mt-5 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xl font-bold tracking-tight sm:text-2xl">{pendingPlan}</p>
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-white/40">{billingInterval === "year" ? "Billed Annually" : "Billed Monthly"}</p>
              </div>
              <p className="text-xl font-bold sm:text-2xl">${priceValue}</p>
            </div>

            <div className="h-px bg-white/10" />

            <div className="space-y-3">
              <div className="flex justify-between text-xs font-medium text-white/50">
                <span>Billing Basis</span>
                <span className="capitalize">{billingInterval}</span>
              </div>
              <div className="flex justify-between text-xs font-medium text-white/50">
                <span>Full Term Amount</span>
                <span>${fullTermAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="h-px bg-white/10" />

            <div className="flex items-end justify-between gap-4">
              <div>
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">Effective Monthly</span>
              </div>
              <span className="text-4xl font-bold tracking-tighter text-emerald-400 sm:text-[2.5rem]">
                ${priceValue.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 border-t border-white/5 pt-4">
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className="w-full rounded-full bg-slate-100 py-4 text-[10px] font-black uppercase tracking-widest text-slate-950 transition hover:bg-slate-200 shadow-xl disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          {isLoading ? "Processing..." : "Confirm plan change"}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="w-full rounded-full border border-white/10 bg-slate-950/40 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 transition hover:border-white/20 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 cursor-pointer"
        >
          Change Selection
        </button>
      </div>
    </div>
  );
}
