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

  return (
    <div className="flex flex-col gap-8 md:flex-row">
      <div className="flex-1 space-y-6">
        <div className="rounded-[24px] border border-zinc-100 bg-white p-8 shadow-sm space-y-8">
          <div className="grid gap-8 sm:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" className="h-3 w-3 text-zinc-400" fill="none" stroke="currentColor">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Target Plan</span>
                </div>
                <p className="text-sm font-bold text-zinc-900">{pendingPlan} Tier</p>
              </div>
              <div className="h-px bg-zinc-200" />
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" className="h-3 w-3 text-zinc-400" fill="none" stroke="currentColor">
                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Billing Cycle</span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-zinc-900 capitalize">{billingInterval}ly</p>
                  {billingInterval === "year" && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[8px] font-black text-emerald-600 uppercase tracking-widest">20% Savings</span>
                  )}
                </div>
              </div>
              <div className="h-px bg-zinc-200" />
              <div className="space-y-3">
                 <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Checkout Security</p>
                 <p className="text-xs text-zinc-500 leading-relaxed">
                   You will be redirected to Stripe&apos;s secure hosted payment page to finalize your subscription. Dandi AI does not store your card details.
                 </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full rounded-full bg-zinc-900 py-5 text-[10px] font-black uppercase tracking-widest text-white transition shadow-xl hover:bg-zinc-800 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="mx-auto h-3 w-3 animate-spin rounded-full border-2 border-zinc-400 border-t-white" />
            ) : `Proceed to Secure Checkout`}
          </button>
          <button 
            onClick={onBack}
            className="w-full rounded-full border border-zinc-200 bg-white py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-900"
          >
            Change Selection
          </button>
        </div>
      </div>

      {/* Right Column: Order Summary */}
      <div className="w-full md:w-80 rounded-2xl bg-[#18181b] p-6 text-white h-fit space-y-6 shadow-2xl">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/40">Checkout Summary</h4>
        
        <div className="space-y-4">
          <div className="flex items-start justify-between pb-2">
            <div className="space-y-1.5">
              <p className="text-lg font-bold tracking-tight">{pendingPlan}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">{billingInterval === 'year' ? 'Billed Annually' : 'Billed Monthly'}</p>
            </div>
            <p className="text-xl font-bold">{displayPrice}</p>
          </div>

          <div className="h-px bg-white/10" />

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-white/60">
              <span>Billing Basis</span>
              <span className="capitalize">{billingInterval}ly</span>
            </div>
            <div className="flex justify-between text-xs font-medium text-white/60">
              <span>Full Term Amount</span>
              <span>
                {billingInterval === 'year' 
                  ? `$${(parseFloat(displayPrice.replace("$", "")) * 12).toFixed(2)}`
                  : displayPrice}
              </span>
            </div>
            {billingInterval === 'year' && (
              <div className="flex justify-between text-xs font-medium text-emerald-400">
                <span>Annual Discount</span>
                <span>- 20%</span>
              </div>
            )}
          </div>

          <div className="h-px bg-white/10" />

          <div className="flex justify-between items-center pt-6 border-t border-white/10 mt-2">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Effective</span>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Monthly</p>
            </div>
            <span className="text-4xl font-bold text-emerald-400 tracking-tight">
              {displayPrice}.00
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
