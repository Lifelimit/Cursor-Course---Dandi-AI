import React from "react";
import { PLAN_DETAILS, PLAN_RANKS } from "@/lib/constants";
import { BillingDetails } from "@/types";

type PlanReviewProps = {
  pendingPlan: string | null;
  planName: string;
  isLoading: boolean;
  formValues: BillingDetails;
  cardData: { number: string; street: string; city: string; state: string; zip: string; country: string };
  onConfirm: () => void;
  onBack: () => void;
};

export function PlanReview({
  pendingPlan,
  planName,
  isLoading,
  formValues,
  cardData,
  onConfirm,
  onBack
}: PlanReviewProps) {
  if (!pendingPlan) return null;

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
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Selected Plan</span>
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
                <p className="text-sm font-bold text-zinc-900">Monthly</p>
              </div>
              <div className="h-px bg-zinc-200" />
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" className="h-3 w-3 text-zinc-400" fill="none" stroke="currentColor">
                    <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Billing To</span>
                </div>
                <div className="space-y-3 pt-1">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Street</span>
                    <span className="text-sm font-bold text-zinc-900">{formValues.street || cardData.street}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Locality</span>
                    <span className="text-sm font-bold text-zinc-900">
                      {formValues.city || cardData.city}, {formValues.state || cardData.state} {formValues.zip || cardData.zip}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Country</span>
                    <span className="text-sm font-bold text-zinc-900">{formValues.country || cardData.country}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            onClick={onConfirm}
            disabled={isLoading || !cardData.number}
            className={`w-full rounded-full py-5 text-[10px] font-black uppercase tracking-widest text-white transition shadow-xl ${
              !cardData.number ? 'bg-zinc-300 cursor-not-allowed opacity-50' : 'bg-zinc-900 hover:bg-zinc-800'
            }`}
          >
            {isLoading ? "Processing Switch..." : !cardData.number ? "Payment Method Required" : `Confirm Switch to ${pendingPlan}`}
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
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/40">New Plan Summary</h4>
        
        <div className="space-y-4">
          <div className="flex items-start justify-between pb-2">
            <div className="space-y-1.5">
              <p className="text-lg font-bold tracking-tight">{pendingPlan} Plan</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/80 bg-emerald-400/10 px-2 py-0.5 rounded-md w-fit">VAT inclusive</p>
            </div>
            <p className="text-xl font-bold">{PLAN_DETAILS[pendingPlan as keyof typeof PLAN_DETAILS].price}</p>
          </div>

          <div className="h-px bg-white/10" />

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-white/60">
              <span>Price Change</span>
              <span>
                {PLAN_RANKS[pendingPlan as keyof typeof PLAN_RANKS] > PLAN_RANKS[planName as keyof typeof PLAN_RANKS] ? "+" : "-"} 
                ${Math.abs(parseFloat(PLAN_DETAILS[pendingPlan as keyof typeof PLAN_DETAILS].price.replace("$", "")) - parseFloat(PLAN_DETAILS[planName as keyof typeof PLAN_DETAILS].price.replace("$", ""))).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-xs font-medium text-white/60">
              <span>Original Price</span>
              <span>${(parseFloat(PLAN_DETAILS[pendingPlan as keyof typeof PLAN_DETAILS].price.replace("$", "")) / 1.2).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs font-medium text-white/60">
              <span>VAT (20%)</span>
              <span>${(parseFloat(PLAN_DETAILS[pendingPlan as keyof typeof PLAN_DETAILS].price.replace("$", "")) - (parseFloat(PLAN_DETAILS[pendingPlan as keyof typeof PLAN_DETAILS].price.replace("$", "")) / 1.2)).toFixed(2)}</span>
            </div>
          </div>

          <div className="h-px bg-white/10" />

          <div className="flex justify-between items-center pt-6 border-t border-white/10 mt-2">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Total</span>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Amount</p>
            </div>
            <span className="text-4xl font-bold text-emerald-400 tracking-tight">
              {PLAN_DETAILS[pendingPlan as keyof typeof PLAN_DETAILS].price}.00
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
