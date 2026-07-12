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
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-8 lg:flex-row items-start">
        {/* Left Column: Security & Info */}
        <div className="flex-1 rounded-[32px] border border-white/5 bg-slate-950/40 p-10 space-y-10">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="h-3 w-3 text-slate-400" fill="none" stroke="currentColor">
                  <path d="M9 12l2 2 4-4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Target Plan</span>
              </div>
              <p className="text-base font-bold text-white">{pendingPlan} Tier</p>
            </div>

            <div className="h-px bg-white/5" />

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="h-3 w-3 text-slate-400" fill="none" stroke="currentColor">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Billing Cycle</span>
              </div>
              <p className="text-base font-bold text-white capitalize">{billingInterval}</p>
            </div>

            <div className="h-px bg-white/5" />

            <div className="space-y-4">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Checkout Security</span>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
                Your payment is handled by Stripe Elements. Dandi does not store your full card details.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary */}
        <div className="w-full lg:w-96 rounded-[32px] bg-slate-950/80 p-10 text-white border border-white/10 space-y-10">
          <h4 className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">Checkout Summary</h4>
          
          <div className="space-y-8">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-2xl font-bold tracking-tight">{pendingPlan}</p>
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-white/40">{billingInterval === 'year' ? 'Billed Annually' : 'Billed Monthly'}</p>
              </div>
              <p className="text-2xl font-bold">${priceValue}</p>
            </div>

            <div className="h-px bg-white/10" />

            <div className="space-y-4">
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

            <div className="flex justify-between items-center pt-4">
              <div className="space-y-1">
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-white/40 block">Effective</span>
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-white/40 block">Monthly</span>
              </div>
              <span className="text-5xl font-bold text-emerald-400 tracking-tighter">
                ${priceValue.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-4">
        <button 
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className="w-full rounded-full bg-slate-100 py-5 text-[10px] font-black uppercase tracking-widest text-slate-950 transition hover:bg-slate-200 shadow-xl disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          {isLoading ? "Processing..." : "Confirm plan change"}
        </button>
        <button 
          type="button"
          onClick={onBack}
          className="w-full rounded-full border border-white/10 bg-slate-950/40 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition hover:border-white/20 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 cursor-pointer"
        >
          Change Selection
        </button>
      </div>
    </div>
  );
}
