import React from "react";
import { PlanDetail, BillingDetails } from "@/types";

type OverviewProps = {
  planName: string;
  currentPlan: PlanDetail;
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
  formValues,
  cardData,
  isLoading,
  setView,
  handleRemoveCard,
  onCancelSubscription
}: OverviewProps) {
  return (
    <>
      <div className="space-y-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Included in your plan</p>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {currentPlan.features.map((feature, i) => (
            <li key={i} className="flex items-center gap-3 text-sm font-medium text-zinc-600">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
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
        <div className="rounded-2xl bg-zinc-50 p-6 space-y-4 border border-zinc-100">
          <div className="grid grid-cols-3 gap-6 pt-2">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" className="h-3 w-3 text-zinc-400" fill="none" stroke="currentColor">
                  <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Renewal</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-zinc-900">{currentPlan.nextBilling}</p>
                <p className="text-[9px] text-zinc-400 italic">Next charge date</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" className="h-3 w-3 text-zinc-400" fill="none" stroke="currentColor">
                  <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Billing To</p>
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

            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" className="h-3 w-3 text-zinc-400" fill="none" stroke="currentColor">
                  <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Charging</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-zinc-900">{cardData.number || "No card saved"}</p>
                <p className="text-[9px] text-zinc-400 italic">{cardData.number ? `${cardData.brand} • Primary method` : "Add a payment method to upgrade"}</p>
                
                {!cardData.number ? (
                  <div className="pt-3">
                    <button 
                      onClick={() => setView("update-payment")}
                      className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 hover:text-emerald-700 underline underline-offset-4 transition-colors"
                    >
                      Add Card
                    </button>
                  </div>
                ) : (
                  <div className="pt-3">
                    <button 
                      onClick={handleRemoveCard}
                      disabled={isLoading}
                      className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 hover:text-rose-500 underline underline-offset-4 transition-colors disabled:opacity-50"
                    >
                      Remove Card
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        {planName !== "Hobby" && (
          <button 
            onClick={() => setView("update-payment")}
            className="flex-1 rounded-full bg-zinc-900 py-4 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-zinc-800 shadow-xl shadow-zinc-900/10"
          >
            Update Payment
          </button>
        )}
        <button 
          onClick={() => setView("change-plan")}
          className={`flex-1 rounded-full border border-zinc-200 bg-white py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-900 ${planName === "Hobby" ? "w-full" : ""}`}
        >
          {planName === "Hobby" ? "Upgrade Plan" : "Change Plan"}
        </button>
      </div>
      
      <button 
        onClick={onCancelSubscription}
        disabled={isLoading || planName === "Hobby"}
        className="w-full text-center text-[9px] font-bold uppercase tracking-widest text-zinc-300 hover:text-rose-500 transition-colors disabled:opacity-50 disabled:hover:text-zinc-300"
      >
        {planName === "Hobby" ? "No active paid subscription" : "Cancel Subscription"}
      </button>
    </>
  );
}
