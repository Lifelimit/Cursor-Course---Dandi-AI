import React from "react";
import { COUNTRIES, LOCATION_DATA, PLAN_RANKS } from "@/lib/constants";
import { BillingDetails } from "@/types";

type PaymentFormProps = {
  formValues: BillingDetails & { number: string; expiry: string; cvc: string };
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  setFormValues: React.Dispatch<React.SetStateAction<BillingDetails & { number: string; expiry: string; cvc: string }>>;
  handleSavePayment: (e: React.FormEvent) => void;
  isLoading: boolean;
  showCvc: boolean;
  setShowCvc: (show: boolean) => void;
  showAddressForm: boolean;
  setShowAddressForm: (show: boolean) => void;
  pendingPlan: string | null;
  planName: string;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setView: (view: any) => void;
  setPendingPlan: (plan: string | null) => void;
  initialView?: string;
  cardData: BillingDetails & { number: string; brand: string; expiry: string };
};

export function PaymentForm({
  formValues,
  handleInputChange,
  setFormValues,
  handleSavePayment,
  isLoading,
  showCvc,
  setShowCvc,
  showAddressForm,
  setShowAddressForm,
  pendingPlan,
  planName,
  onClose,
  setView,
  setPendingPlan,
  initialView,
  cardData
}: PaymentFormProps) {
  return (
    <form onSubmit={handleSavePayment} className="flex-1 space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Cardholder Name</label>
          <input 
            type="text" 
            name="name"
            required
            value={formValues.name}
            onChange={handleInputChange}
            placeholder="Enter full name"
            className="w-full rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-medium outline-none focus:border-zinc-900 transition-colors"
          />
        </div>
        
        <div className="space-y-2 sm:col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Card Number</label>
          <div className="relative">
            <input 
              type="text" 
              name="number"
              required
              value={formValues.number}
              onChange={handleInputChange}
              placeholder="0000 0000 0000 0000"
              className="w-full rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-medium outline-none focus:border-zinc-900 transition-colors pr-28 tracking-tight"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1">
              <div className="h-4 w-6 rounded bg-zinc-200" />
              <div className="h-4 w-6 rounded bg-zinc-300" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Expiry</label>
          <input 
            type="text" 
            name="expiry"
            required
            value={formValues.expiry}
            onChange={handleInputChange}
            placeholder="MM/YY"
            className="w-full rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-medium outline-none focus:border-zinc-900 transition-colors"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">CVC</label>
          <div className="relative">
            <input 
              type={showCvc ? "text" : "password"}
              name="cvc"
              required
              value={formValues.cvc}
              onChange={handleInputChange}
              placeholder="•••"
              className="w-full rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-medium outline-none focus:border-zinc-900 transition-colors pr-10"
            />
            <button 
              type="button"
              onClick={() => setShowCvc(!showCvc)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900 transition-colors"
            >
              {showCvc ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
                  <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.643-9.943-6.442a5.08 5.08 0 012.16-3.192m3.033-4.446A9.01 9.01 0 0112 5c4.478 0 8.268 2.643 9.943 6.442a5.08 5.08 0 01-1.602 2.454M3 3l18 18M10.477 10.477a3 3 0 004.046 4.046" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
                  <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Sequential Address Reveal / Summary */}
      <div className="space-y-4 pt-4">
        {!showAddressForm ? (
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 flex items-center justify-between group animate-in fade-in duration-300">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Billing Address</p>
              <p className="text-xs font-medium text-zinc-900 line-clamp-1">
                {formValues.street || cardData.street}, {formValues.city || cardData.city}
              </p>
            </div>
            <button 
              type="button"
              onClick={() => setShowAddressForm(true)}
              className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 hover:text-emerald-700 underline underline-offset-4 transition-opacity"
            >
              Change
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
            {/* 1. Country */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Country</label>
              <select 
                name="country"
                required
                value={formValues.country}
                onChange={(e) => {
                  const newCountry = e.target.value;
                  setFormValues((prev) => ({ 
                    ...prev, 
                    country: newCountry,
                    state: "",
                    city: "",
                    zip: "",
                    street: ""
                  }));
                }}
                className="w-full rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-medium outline-none focus:border-zinc-900 transition-colors appearance-none"
              >
                <option value="">Select Country</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {formValues.country && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">State / Province</label>
                  <select 
                    name="state"
                    required
                    value={formValues.state}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-medium outline-none focus:border-zinc-900 transition-colors appearance-none"
                  >
                    <option value="">Select State</option>
                    {formValues.country && LOCATION_DATA[formValues.country as keyof typeof LOCATION_DATA].states && 
                      Object.keys(LOCATION_DATA[formValues.country as keyof typeof LOCATION_DATA].states).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))
                    }
                  </select>
                </div>

                {formValues.state && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-left-2 duration-300">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">City</label>
                    <select 
                      name="city"
                      required
                      value={formValues.city}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-medium outline-none focus:border-zinc-900 transition-colors appearance-none"
                    >
                      <option value="">Select City</option>
                      {formValues.state && LOCATION_DATA[formValues.country as keyof typeof LOCATION_DATA].states[formValues.state].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {formValues.city && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                    {LOCATION_DATA[formValues.country as keyof typeof LOCATION_DATA].zipLabel}
                  </label>
                  <input 
                    type="text" 
                    name="zip"
                    required
                    value={formValues.zip}
                    onChange={handleInputChange}
                    placeholder={LOCATION_DATA[formValues.country as keyof typeof LOCATION_DATA].zipPlaceholder}
                    className="w-full rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-medium outline-none focus:border-zinc-900 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Street Address</label>
                  <input 
                    type="text" 
                    name="street"
                    required
                    value={formValues.street}
                    onChange={handleInputChange}
                    placeholder="123 Main St"
                    className="w-full rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-medium outline-none focus:border-zinc-900 transition-colors"
                  />
                </div>
              </div>
            )}
            
            <button 
              type="button"
              onClick={() => setShowAddressForm(false)}
              className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-900 pt-2 text-left"
            >
              ← Back to Summary
            </button>
          </div>
        )}
      </div>

      {/* Payment Security Badge */}
      <div className="flex items-center gap-3 rounded-2xl bg-emerald-50/50 p-4 border border-emerald-100">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
            <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Secure Transaction</p>
          <p className="text-[9px] text-emerald-600/70">Your payment information is encrypted and never stored on our servers.</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-4">
        <button 
          type="submit"
          disabled={isLoading}
          className="w-full rounded-full bg-zinc-900 py-4 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-zinc-800 shadow-xl shadow-zinc-900/10"
        >
          {isLoading ? "Validating..." : (pendingPlan ? (PLAN_RANKS[pendingPlan as keyof typeof PLAN_RANKS] > PLAN_RANKS[planName as keyof typeof PLAN_RANKS] ? `Upgrade to ${pendingPlan}` : `Downgrade to ${pendingPlan}`) : "Save Payment Method")}
        </button>
        <button 
          type="button"
          onClick={() => {
            if (initialView === "update-payment") {
              onClose();
            } else if (pendingPlan) {
              setView("change-plan");
              setPendingPlan(null);
            } else {
              setView("overview");
            }
          }}
          className="w-full rounded-full border border-zinc-200 bg-white py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-900"
        >
          Go Back
        </button>
      </div>
    </form>
  );
}
