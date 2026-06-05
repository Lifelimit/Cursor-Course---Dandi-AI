import React from "react";
import { PlanDetail, BillingDetails } from "@/types";

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
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">Included in your plan</p>
        <ul className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          {currentPlan.features.map((feature, i) => (
            <li key={i} className="flex items-center gap-3 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 dark:text-emerald-400">
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
        <div className="rounded-[32px] border border-zinc-100 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-8 shadow-sm dark:shadow-black/20">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="h-3 w-3 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor">
                  <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Renewal</p>
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {nextBillingDate 
                    ? new Date(nextBillingDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                    : currentPlan.nextBilling}
                </p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 italic mt-1">Next charge date</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="h-3 w-3 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor">
                  <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Billing To</p>
              </div>
              <div className="space-y-3">
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-zinc-300 dark:text-zinc-600">Street</span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{formValues.street || cardData.street}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-zinc-300 dark:text-zinc-600">Locality</span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                    {formValues.city || cardData.city}, {formValues.state || cardData.state}<br/>
                    {formValues.zip || cardData.zip}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-zinc-300 dark:text-zinc-600">Country</span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{formValues.country || cardData.country}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="h-3 w-3 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor">
                  <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Charging</p>
              </div>
              <div>
                <p className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">{cardData.number || "•••• •••• •••• 4242"}</p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 italic mt-1">{cardData.number ? `${cardData.brand} • Primary method` : "visa • Primary method"}</p>
                
                {cardData.number && (
                  <button 
                    onClick={handleRemoveCard}
                    disabled={isLoading}
                    className="mt-6 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 hover:text-rose-500 dark:hover:text-rose-400 underline underline-offset-8 transition-colors disabled:opacity-50 block"
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
              onClick={() => setView("update-payment")}
              className="flex-1 rounded-full bg-[#18181b] dark:bg-zinc-100 py-4 text-[10px] font-black uppercase tracking-widest text-white dark:text-zinc-950 transition hover:bg-black dark:hover:bg-zinc-200 shadow-xl shadow-zinc-900/10 dark:shadow-black/20"
            >
              Update Payment
            </button>
          )}
          <button 
            onClick={() => setView("change-plan")}
            className="flex-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 transition hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            {planName === "Hobby" ? "Upgrade Plan" : "Change Plan"}
          </button>
        </div>
        
        <button 
          onClick={onCancelSubscription}
          disabled={isLoading || planName === "Hobby"}
          className="w-full text-center font-mono text-[9px] font-bold uppercase tracking-widest text-zinc-300 dark:text-zinc-600 hover:text-rose-500 dark:hover:text-rose-400 transition-colors disabled:opacity-50"
        >
          {planName === "Hobby" ? "No active paid subscription" : "Cancel Subscription"}
        </button>
      </div>
    </div>
  );
}
