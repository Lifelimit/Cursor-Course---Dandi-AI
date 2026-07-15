import React, { useState } from "react";
import { COUNTRIES, LOCATION_DATA, PLAN_RANKS } from "@/lib/constants";
import { BillingDetails } from "@/types";
import { GhostButton } from "@/components/ui/ActionButtons";
import { FieldInput, FieldSelect } from "@/components/ui/FieldInput";
import { CardNumberElement, CardExpiryElement, CardCvcElement } from "@stripe/react-stripe-js";

type PaymentFormProps = {
  formValues: BillingDetails;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  setFormValues: React.Dispatch<React.SetStateAction<BillingDetails>>;
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
  hasDefaultPaymentMethod: boolean;
  makeDefault: boolean;
  setMakeDefault: (makeDefault: boolean) => void;
};

const ELEMENT_OPTIONS = {
  style: {
    base: {
      color: "#ffffff",
      fontFamily: "Outfit, sans-serif",
      fontSize: "14px",
      "::placeholder": {
        color: "#52525b", // zinc-600
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
  cardData,
  hasDefaultPaymentMethod,
  makeDefault,
  setMakeDefault,
}: PaymentFormProps) {
  const [brand, setBrand] = useState("");

  const renderBrandBadge = (brandName: string) => {
    switch (brandName.toLowerCase()) {
      case "visa":
        return <span className="text-blue-450 font-black">VISA</span>;
      case "mastercard":
        return <span className="text-orange-400 font-black">MASTERCARD</span>;
      case "amex":
        return <span className="text-cyan-405 font-black">AMEX</span>;
      case "discover":
        return <span className="text-orange-500 font-black">DISCOVER</span>;
      case "jcb":
        return <span className="text-red-400 font-black">JCB</span>;
      case "unionpay":
        return <span className="text-emerald-450 font-black">UNIONPAY</span>;
      default:
        return <span className="text-slate-400 font-black">{brandName.toUpperCase()}</span>;
    }
  };

  return (
    <form onSubmit={handleSavePayment} className="flex-1 space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Cardholder Name</label>
          <FieldInput
            type="text" 
            name="name"
            required
            value={formValues.name}
            onChange={handleInputChange}
            placeholder="Enter full name"
          />
        </div>
        
        <div className="space-y-2 sm:col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Card Number</label>
          <div className="relative rounded-xl border border-white/10 bg-slate-950/70 px-4 py-[13px] transition-all focus-within:border-emerald-500/40 focus-within:ring-4 focus-within:ring-emerald-500/10">
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
              {brand ? renderBrandBadge(brand) : <span className="text-slate-500 font-black">CARD</span>}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Expiry</label>
          <div className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-[13px] transition-all focus-within:border-emerald-500/40 focus-within:ring-4 focus-within:ring-emerald-500/10">
            <CardExpiryElement options={ELEMENT_OPTIONS} />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">CVC</label>
          <div className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-[13px] transition-all focus-within:border-emerald-500/40 focus-within:ring-4 focus-within:ring-emerald-500/10">
            <CardCvcElement options={ELEMENT_OPTIONS} />
          </div>
        </div>
      </div>

      {/* Sequential Address Reveal / Summary */}
      <div className="space-y-4 pt-4">
        {!showAddressForm ? (
          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4 flex items-center justify-between group animate-in fade-in duration-300">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Billing Address</p>
              <p className="text-xs font-medium text-white line-clamp-1">
                {formValues.street || cardData.street || "No address saved"}, {formValues.city || cardData.city || ""}
              </p>
            </div>
            <button 
              type="button"
              onClick={() => setShowAddressForm(true)}
              className="rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-400 hover:text-emerald-300 underline underline-offset-4 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Change
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
            {/* 1. Country */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Country</label>
              <FieldSelect
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
              >
                <option value="" className="bg-slate-950 text-slate-400">Select Country</option>
                {COUNTRIES.map(c => <option key={c} value={c} className="bg-slate-950 text-white">{c}</option>)}
              </FieldSelect>
            </div>

            {formValues.country && (
              <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-top-2 duration-300 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">State / Province</label>
                  <FieldSelect
                    name="state"
                    required
                    value={formValues.state}
                    onChange={handleInputChange}
                  >
                    <option value="" className="bg-slate-950 text-slate-400">Select State</option>
                    {formValues.country && LOCATION_DATA[formValues.country as keyof typeof LOCATION_DATA].states && 
                      Object.keys(LOCATION_DATA[formValues.country as keyof typeof LOCATION_DATA].states).map(s => (
                        <option key={s} value={s} className="bg-slate-950 text-white">{s}</option>
                      ))
                    }
                  </FieldSelect>
                </div>

                {formValues.state && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-left-2 duration-300">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">City</label>
                    <FieldSelect
                      name="city"
                      required
                      value={formValues.city}
                      onChange={handleInputChange}
                    >
                      <option value="" className="bg-slate-950 text-slate-400">Select City</option>
                      {formValues.state && LOCATION_DATA[formValues.country as keyof typeof LOCATION_DATA].states[formValues.state].map(c => (
                        <option key={c} value={c} className="bg-slate-950 text-white">{c}</option>
                      ))}
                    </FieldSelect>
                  </div>
                )}
              </div>
            )}

            {formValues.city && (
              <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-top-2 duration-300 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {LOCATION_DATA[formValues.country as keyof typeof LOCATION_DATA].zipLabel}
                  </label>
                  <FieldInput
                    type="text" 
                    name="zip"
                    required
                    value={formValues.zip}
                    onChange={handleInputChange}
                    placeholder={LOCATION_DATA[formValues.country as keyof typeof LOCATION_DATA].zipPlaceholder}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Street Address</label>
                  <FieldInput
                    type="text" 
                    name="street"
                    required
                    value={formValues.street}
                    onChange={handleInputChange}
                    placeholder="123 Main St"
                  />
                </div>
              </div>
            )}
            
            <button 
              type="button"
              onClick={() => setShowAddressForm(false)}
              className="rounded-full pt-2 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white animate-in fade-in cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              ← Back to Summary
            </button>
          </div>
        )}
      </div>

      {/* Payment Security Badge */}
      <div className="flex items-center gap-3 rounded-2xl bg-emerald-950/20 p-4 border border-emerald-900/30">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-950/50 text-emerald-400">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
            <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Stripe Elements</p>
          <p className="text-[9px] text-emerald-500/70">Card details are handled by Stripe. Dandi does not store full card numbers.</p>
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-emerald-300/25">
        <input
          type="checkbox"
          checked={makeDefault}
          onChange={(event) => setMakeDefault(event.target.checked)}
          className="mt-0.5 h-4 w-4 accent-emerald-400"
        />
        <span className="space-y-1">
          <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-200">Make this my default payment method</span>
          <span className="block text-xs leading-5 text-slate-500">
            {makeDefault
              ? "This card will be used for future billing and renewals."
              : hasDefaultPaymentMethod
                ? "This card will be saved as a secondary method."
                : "This card will be saved without a default until you choose one."}
          </span>
        </span>
      </label>

      <div className="flex flex-col gap-3 pt-4">
        <button 
          type="submit"
          disabled={isLoading}
          className="w-full rounded-full bg-slate-100 py-4 text-[10px] font-black uppercase tracking-widest text-slate-950 transition hover:bg-slate-200 shadow-xl disabled:opacity-35 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          {isLoading ? "Validating..." : (pendingPlan ? (PLAN_RANKS[pendingPlan as keyof typeof PLAN_RANKS] > PLAN_RANKS[planName as keyof typeof PLAN_RANKS] ? `Upgrade to ${pendingPlan}` : `Downgrade to ${pendingPlan}`) : "Save Payment Method")}
        </button>
        <GhostButton
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
          className="w-full py-4"
        >
          Go Back
        </GhostButton>
      </div>
    </form>
  );
}
