import React, { useState } from "react";
import { COUNTRIES, LOCATION_DATA, PLAN_RANKS } from "@/lib/constants";
import { BillingDetails } from "@/types";
import { CardNumberElement, CardExpiryElement, CardCvcElement } from "@stripe/react-stripe-js";

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

const ELEMENT_OPTIONS = {
  style: {
    base: {
      color: "#18181b", // zinc-900
      fontFamily: "Outfit, sans-serif",
      fontSize: "14px",
      "::placeholder": {
        color: "#a1a1aa", // zinc-400
      },
      "@media (prefers-color-scheme: dark)": {
        color: "#f4f4f5", // zinc-100
        "::placeholder": {
          color: "#71717a", // zinc-500
        },
      },
    },
    invalid: {
      color: "#ef4444", // red-500
    },
  },
};

export function PaymentForm({
  formValues,
  handleInputChange,
  setFormValues,
  handleSavePayment,
  isLoading,
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
  const [brand, setBrand] = useState("");

  const renderBrandBadge = (brandName: string) => {
    switch (brandName.toLowerCase()) {
      case "visa":
        return <span className="text-blue-600 font-black">VISA</span>;
      case "mastercard":
        return <span className="text-orange-500 font-black">MASTERCARD</span>;
      case "amex":
        return <span className="text-cyan-600 font-black">AMEX</span>;
      case "discover":
        return <span className="text-orange-600 font-black">DISCOVER</span>;
      case "jcb":
        return <span className="text-red-600 font-black">JCB</span>;
      case "unionpay":
        return <span className="text-emerald-600 font-black">UNIONPAY</span>;
      default:
        return <span className="text-zinc-400 dark:text-zinc-500 font-black">{brandName.toUpperCase()}</span>;
    }
  };

  return (
    <form onSubmit={handleSavePayment} className="flex-1 space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Cardholder Name</label>
          <input 
            type="text" 
            name="name"
            required
            value={formValues.name}
            onChange={handleInputChange}
            placeholder="Enter full name"
            className="w-full rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors"
          />
        </div>
        
        <div className="space-y-2 sm:col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Card Number</label>
          <div className="relative rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-[13px] transition-colors focus-within:border-zinc-900 dark:focus-within:border-zinc-100 focus-within:ring-1 focus-within:ring-zinc-900 dark:focus-within:ring-zinc-100">
            <CardNumberElement 
               options={ELEMENT_OPTIONS}
              onChange={(e) => {
                if (e.brand) {
                  setBrand(e.brand);
                } else {
                  setBrand("");
                }
              }}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center text-[9px] tracking-widest">
              {brand ? renderBrandBadge(brand) : <span className="text-zinc-300 dark:text-zinc-600 font-black">CARD</span>}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Expiry</label>
          <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-[13px] transition-colors focus-within:border-zinc-900 dark:focus-within:border-zinc-100 focus-within:ring-1 focus-within:ring-zinc-900 dark:focus-within:ring-zinc-100">
            <CardExpiryElement options={ELEMENT_OPTIONS} />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">CVC</label>
          <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-[13px] transition-colors focus-within:border-zinc-900 dark:focus-within:border-zinc-100 focus-within:ring-1 focus-within:ring-zinc-900 dark:focus-within:ring-zinc-100">
            <CardCvcElement options={ELEMENT_OPTIONS} />
          </div>
        </div>
      </div>

      {/* Sequential Address Reveal / Summary */}
      <div className="space-y-4 pt-4">
        {!showAddressForm ? (
          <div className="rounded-xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/60 p-4 flex items-center justify-between group animate-in fade-in duration-300">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Billing Address</p>
              <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 line-clamp-1">
                {formValues.street || cardData.street || "No address saved"}, {formValues.city || cardData.city || ""}
              </p>
            </div>
            <button 
              type="button"
              onClick={() => setShowAddressForm(true)}
              className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 underline underline-offset-4 transition-opacity"
            >
              Change
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
            {/* 1. Country */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Country</label>
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
                className="w-full rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors appearance-none"
              >
                <option value="">Select Country</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {formValues.country && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">State / Province</label>
                  <select 
                    name="state"
                    required
                    value={formValues.state}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors appearance-none"
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
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">City</label>
                    <select 
                      name="city"
                      required
                      value={formValues.city}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors appearance-none"
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
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                    {LOCATION_DATA[formValues.country as keyof typeof LOCATION_DATA].zipLabel}
                  </label>
                  <input 
                    type="text" 
                    name="zip"
                    required
                    value={formValues.zip}
                    onChange={handleInputChange}
                    placeholder={LOCATION_DATA[formValues.country as keyof typeof LOCATION_DATA].zipPlaceholder}
                    className="w-full rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Street Address</label>
                  <input 
                    type="text" 
                    name="street"
                    required
                    value={formValues.street}
                    onChange={handleInputChange}
                    placeholder="123 Main St"
                    className="w-full rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors"
                  />
                </div>
              </div>
            )}
            
            <button 
              type="button"
              onClick={() => setShowAddressForm(false)}
              className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 pt-2 text-left animate-in fade-in"
            >
              ← Back to Summary
            </button>
          </div>
        )}
      </div>

      {/* Payment Security Badge */}
      <div className="flex items-center gap-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 p-4 border border-emerald-100 dark:border-emerald-900/60">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
            <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Secure Transaction</p>
          <p className="text-[9px] text-emerald-600/70 dark:text-emerald-500/70">Your payment information is encrypted and never stored on our servers.</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-4">
        <button 
          type="submit"
          disabled={isLoading}
          className="w-full rounded-full bg-zinc-900 dark:bg-zinc-50 py-4 text-[10px] font-black uppercase tracking-widest text-white dark:text-zinc-950 transition hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-xl shadow-zinc-900/10 dark:shadow-black/20"
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
          className="w-full rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 transition hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Go Back
        </button>
      </div>
    </form>
  );
}
