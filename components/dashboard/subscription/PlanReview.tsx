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
        <div className="flex-1 rounded-[32px] border border-zinc-100 bg-white p-10 shadow-sm space-y-10">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="h-3 w-3 text-zinc-400" fill="none" stroke="currentColor">
                  <path d="M9 12l2 2 4-4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Target Plan</span>
              </div>
              <p className="text-base font-bold text-zinc-900">{pendingPlan} Tier</p>
            </div>

            <div className="h-px bg-zinc-100" />

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="h-3 w-3 text-zinc-400" fill="none" stroke="currentColor">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Billing Cycle</span>
              </div>
              <p className="text-base font-bold text-zinc-900 capitalize">{billingInterval}</p>
            </div>

            <div className="h-px bg-zinc-100" />

            <div className="space-y-4">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Checkout Security</span>
              <p className="text-xs text-zinc-500 leading-relaxed max-w-xs">
                Your payment will be processed securely inline via Stripe Elements. Your card credentials are encrypted and processed safely without ever leaving your browser.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary */}
        <div className="w-full lg:w-96 rounded-[32px] bg-[#18181b] p-10 text-white shadow-2xl space-y-10">
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
          onClick={onConfirm}
          disabled={isLoading}
          className="w-full rounded-full bg-[#18181b] py-5 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-black shadow-xl shadow-zinc-900/10 disabled:opacity-50"
        >
          {isLoading ? "Processing..." : "Proceed to Inline Payment"}
        </button>
        <button 
          onClick={onBack}
          className="w-full rounded-full border border-zinc-200 bg-white py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-900"
        >
          Change Selection
        </button>
      </div>
    </div>
  );
}
