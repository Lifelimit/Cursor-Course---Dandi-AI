import React from "react";
import { PlanDetail, BillingDetails } from "@/types";
import { formatLongDate } from "@/lib/format";

type OverviewProps = {
  planName: string;
  currentPlan: PlanDetail;
  nextBillingDate?: string | null;
  formValues: BillingDetails;
  cardData: BillingDetails & { number: string; brand: string };
  isLoading: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setView: (view: any) => void;
  handleRemoveCard: () => void;
  onCancelSubscription: () => void;
};

export function Overview({
  planName,
  currentPlan,
  nextBillingDate,
  formValues,
  cardData,
  isLoading,
  setView,
  handleRemoveCard,
  onCancelSubscription
}: OverviewProps) {
  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Included in your plan</p>
        <ul className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          {currentPlan.features.map((feature, i) => (
            <li key={i} className="flex items-center gap-3 text-xs font-medium text-slate-300">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-950/40 text-emerald-400">
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
                  <path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {planName !== "Hobby" && (
        <div className="rounded-[32px] border border-white/5 bg-slate-950/40 p-8 shadow-black/20">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="h-3 w-3 text-slate-400" fill="none" stroke="currentColor">
                  <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400">Renewal</p>
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  {nextBillingDate 
                    ? formatLongDate(nextBillingDate)
                    : currentPlan.nextBilling}
                </p>
                <p className="text-[10px] text-slate-400 italic mt-1">Next charge date</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="h-3 w-3 text-slate-400" fill="none" stroke="currentColor">
                  <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400">Billing To</p>
              </div>
              <div className="space-y-3">
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500">Street</span>
                  <span className="text-sm font-bold text-white">{formValues.street || cardData.street}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500">Locality</span>
                  <span className="text-sm font-bold text-white leading-snug">
                    {formValues.city || cardData.city}, {formValues.state || cardData.state}<br/>
                    {formValues.zip || cardData.zip}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500">Country</span>
                  <span className="text-sm font-bold text-white">{formValues.country || cardData.country}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="h-3 w-3 text-slate-400" fill="none" stroke="currentColor">
                  <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400">Charging</p>
              </div>
              <div>
                <p className="font-mono text-sm font-bold text-white">{cardData.number || "•••• •••• •••• 4242"}</p>
                <p className="text-[10px] text-slate-400 italic mt-1">{cardData.number ? `${cardData.brand} • Primary method` : "visa • Primary method"}</p>
                
                {cardData.number && (
                  <button 
                    type="button"
                    onClick={handleRemoveCard}
                    disabled={isLoading}
                    className="mt-6 rounded-full font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-rose-400 underline underline-offset-8 transition-colors disabled:opacity-50 block cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                  >
                    Remove Card
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          {planName !== "Hobby" && (
            <button 
              type="button"
              onClick={() => setView("update-payment")}
              className="flex-1 rounded-full bg-slate-100 py-4 text-[10px] font-black uppercase tracking-widest text-slate-950 transition hover:bg-slate-200 shadow-xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Update Payment
            </button>
          )}
          <button 
            type="button"
            onClick={() => setView("change-plan")}
            className="flex-1 rounded-full border border-white/10 bg-slate-950/40 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition hover:border-white/20 hover:bg-white/5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            {planName === "Hobby" ? "Upgrade Plan" : "Change Plan"}
          </button>
        </div>
        
        <button 
          type="button"
          onClick={onCancelSubscription}
          disabled={isLoading || planName === "Hobby"}
          className="w-full rounded-full text-center font-mono text-[9px] font-bold uppercase tracking-widest text-slate-500 hover:text-rose-400 transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          {planName === "Hobby" ? "No active paid subscription" : "Cancel Subscription"}
        </button>
      </div>
    </div>
  );
}
