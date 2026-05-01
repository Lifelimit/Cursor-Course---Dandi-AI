import React, { useState, useEffect } from "react";
import { updatePlanAction, removePaymentMethodAction } from "@/lib/auth-actions";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type SubscriptionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  initialView?: "overview" | "change-plan" | "cancel-confirm" | "update-payment" | "success" | "plan-change-review" | "remove-card-confirm";
  initialPendingPlan?: string | null;
};

const PLAN_DETAILS = {
  Hobby: {
    id: "Hobby",
    price: "$0",
    features: ["1,000 requests / mo", "3 Active API Keys"],
    nextBilling: "N/A",
  },
  Premium: {
    id: "Premium",
    price: "$20",
    features: ["5,000 requests / mo", "Unlimited Active Keys", "Priority Support"],
    nextBilling: "May 24, 2026",
  },
  Researcher: {
    id: "Researcher",
    price: "$99",
    features: ["Unlimited requests / mo", "Unlimited Active Keys", "Custom Branding", "Priority Support"],
    nextBilling: "May 24, 2026",
  }
};

const PLAN_RANKS = { Hobby: 0, Premium: 1, Researcher: 2 };

type CountryData = {
  states: Record<string, string[]>;
  zipLabel: string;
  zipPlaceholder: string;
};

const LOCATION_DATA: Record<string, CountryData> = {
  "United States": {
    states: {
      "California": ["Los Angeles", "San Diego", "San Jose", "San Francisco"],
      "New York": ["New York City", "Buffalo", "Rochester"],
      "Texas": ["Houston", "San Antonio", "Dallas", "Austin"]
    },
    zipLabel: "Zip Code",
    zipPlaceholder: "12345"
  },
  "United Kingdom": {
    states: {
      "England": ["London", "Birmingham", "Manchester", "Liverpool", "Leeds", "Sheffield", "Bristol", "Leicester"],
      "Scotland": ["Glasgow", "Edinburgh"]
    },
    zipLabel: "Postcode",
    zipPlaceholder: "SW1A 1AA"
  },
  "Canada": {
    states: {
      "Ontario": ["Toronto", "Ottawa", "Hamilton", "Kitchener"],
      "Quebec": ["Montreal", "Quebec City"],
      "British Columbia": ["Vancouver", "Victoria"],
      "Alberta": ["Calgary", "Edmonton"]
    },
    zipLabel: "Postal Code",
    zipPlaceholder: "A1B 2C3"
  },
  "Germany": {
    states: {
      "Bavaria": ["Munich", "Nuremberg", "Augsburg"],
      "Berlin": ["Berlin"],
      "Hamburg": ["Hamburg"],
      "Hesse": ["Frankfurt", "Wiesbaden"],
      "North Rhine-Westphalia": ["Cologne", "Düsseldorf", "Dortmund"]
    },
    zipLabel: "Postleitzahl",
    zipPlaceholder: "10115"
  },
  "Australia": {
    states: {
      "NSW": ["Sydney", "Newcastle", "Wollongong"],
      "Victoria": ["Melbourne", "Geelong"],
      "Queensland": ["Brisbane", "Gold Coast", "Sunshine Coast"],
      "Western Australia": ["Perth"],
      "South Australia": ["Adelaide"]
    },
    zipLabel: "Postcode",
    zipPlaceholder: "2000"
  }
};

const COUNTRIES = Object.keys(LOCATION_DATA);

export function SubscriptionModal({ isOpen, onClose, planName, onSuccess, onError, initialView, initialPendingPlan }: SubscriptionModalProps) {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [transactionId] = useState(() => Math.random().toString(36).substring(2, 9).toUpperCase());
  const [view, setView] = useState<"overview" | "change-plan" | "cancel-confirm" | "update-payment" | "success" | "plan-change-review" | "remove-card-confirm">(initialView || "overview");
  const [isLoading, setIsLoading] = useState(false);
  const [showCvc, setShowCvc] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<string | null>(initialPendingPlan || null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  
  // State for card details
  const [cardData, setCardData] = useState({
    name: "",
    number: "",
    brand: "",
    expiry: "",
    cvc: "•••",
    street: "",
    city: "",
    state: "",
    zip: "",
    country: ""
  });

  // Temp state for the form inputs
  const [formValues, setFormValues] = useState({
    name: "",
    number: "",
    expiry: "",
    cvc: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    country: ""
  });

  // Reset to overview or initial state whenever the modal is opened
  useEffect(() => {
    if (isOpen) {
      setView(initialView || "overview");
      setPendingPlan(initialPendingPlan || null);
      
      const s = session?.user as any;
      if (s) {
        setCardData(prev => ({
          ...prev,
          name: s.full_name || prev.name,
          number: s.payment_method_last4 ? `•••• •••• •••• ${s.payment_method_last4}` : "",
          brand: s.payment_method_brand || "",
          expiry: s.payment_method_expiry || "",
          street: s.billing_street || prev.street,
          city: s.billing_city || prev.city,
          state: s.billing_state || prev.state,
          zip: s.billing_zip || prev.zip,
          country: s.billing_country || prev.country
        }));
        setShowAddressForm(!s.billing_street);
        
        setFormValues({
          name: s.full_name || "",
          number: "",
          expiry: s.payment_method_expiry || "",
          cvc: "",
          street: s.billing_street || "",
          city: s.billing_city || "",
          state: s.billing_state || "",
          zip: s.billing_zip || "",
          country: s.billing_country || ""
        });
      } else {
        setFormValues({
          name: "",
          number: "",
          expiry: "",
          cvc: "",
          street: "",
          city: "",
          state: "",
          zip: "",
          country: ""
        });
      }
    }
  }, [isOpen, session]);

  useEffect(() => {
    if (view === "success" && isOpen) {
      const timer = setTimeout(() => {
        setPendingPlan(null);
        setView("overview");
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [view, isOpen, onClose]);

  if (!isOpen) return null;

  const currentPlan = PLAN_DETAILS[planName as keyof typeof PLAN_DETAILS] || PLAN_DETAILS.Hobby;

  const handleCancelAction = async () => {
    setIsLoading(true);
    try {
      await updatePlanAction("Hobby");
      await update();
      router.refresh();
      onSuccess?.("Subscription cancelled successfully.");
      onClose();
    } catch (error) {
      onError?.("Failed to cancel subscription.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final Validation
    const cleanNumber = formValues.number.replace(/\s/g, "");
    if (cleanNumber.length < 13) {
      onError?.("Please enter a valid card number.");
      return;
    }

    setIsLoading(true);
    // Detect Brand
    const brand = cleanNumber.startsWith("4") ? "Visa" : cleanNumber.startsWith("5") ? "Mastercard" : "Card";
    
    // Simulate API call for card validation
    setTimeout(async () => {
      const paymentMetadata = {
        last4: cleanNumber.slice(-4),
        brand: brand,
        expiry: formValues.expiry
      };

      setCardData({
        name: formValues.name,
        number: `•••• •••• •••• ${paymentMetadata.last4}`,
        brand: paymentMetadata.brand,
        expiry: paymentMetadata.expiry,
        cvc: formValues.cvc,
        street: formValues.street,
        city: formValues.city,
        state: formValues.state,
        zip: formValues.zip,
        country: formValues.country
      });

      if (pendingPlan) {
        try {
          await updatePlanAction(pendingPlan, {
            street: formValues.street,
            city: formValues.city,
            state: formValues.state,
            zip: formValues.zip,
            country: formValues.country
          }, paymentMetadata);
          await update();
          router.refresh();
          const actionText = PLAN_RANKS[pendingPlan as keyof typeof PLAN_RANKS] > PLAN_RANKS[planName as keyof typeof PLAN_RANKS] ? "upgraded" : "downgraded";
          onSuccess?.(`Successfully ${actionText} to ${pendingPlan} plan.`);
          
          // Close modal immediately on success to avoid re-mount state issues
          onClose();
        } catch (error) {
          onError?.(`Failed to change plan.`);
        } finally {
          setIsLoading(false);
        }
      } else {
        try {
          // If just updating payment, still use updatePlanAction but with current plan
          await updatePlanAction(planName, {
            street: formValues.street,
            city: formValues.city,
            state: formValues.state,
            zip: formValues.zip,
            country: formValues.country
          }, paymentMetadata);
          await update();
          router.refresh();
          setIsLoading(false);
          onSuccess?.("Payment method updated and saved.");
          setView("overview");
        } catch (error) {
          onError?.("Failed to save payment method.");
          setIsLoading(false);
        }
      }
    }, 1500);
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(" ");
    } else {
      return v;
    }
  };

  const formatExpiry = (value: string, prevValue: string) => {
    // Handle backspace over the slash
    if (prevValue.endsWith('/') && value.length === prevValue.length - 1) {
      return value.slice(0, -1);
    }

    let v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    
    if (v.length >= 1) {
      if (parseInt(v[0], 10) > 1) {
        v = "0" + v;
      }
    }
    
    if (v.length >= 2) {
      const month = parseInt(v.substring(0, 2), 10);
      if (month > 12) {
        v = "12" + v.substring(2);
      } else if (month === 0) {
        v = "01" + v.substring(2);
      }
      return v.substring(0, 2) + "/" + v.substring(2, 4);
    }
    return v;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === "number") {
      setFormValues(prev => ({ ...prev, number: formatCardNumber(value).substring(0, 19) }));
    } else if (name === "expiry") {
      setFormValues(prev => ({ ...prev, expiry: formatExpiry(value, prev.expiry).substring(0, 5) }));
    } else if (name === "cvc") {
      setFormValues(prev => {
        const isAmex = prev.number.startsWith("34") || prev.number.startsWith("37");
        return { ...prev, cvc: value.replace(/[^0-9]/gi, "").substring(0, isAmex ? 4 : 3) };
      });
    } else {
      setFormValues(prev => ({ ...prev, [name]: value }));
    }
  };

  const handlePlanSelection = async (newPlan: string) => {
    if (newPlan === planName) return;
    
    if (newPlan === "Hobby") {
      setView("cancel-confirm");
      return;
    }

    // If already on a paid plan, show review screen
    if (planName !== "Hobby") {
      setPendingPlan(newPlan);
      setView("plan-change-review");
      return;
    }

    // Otherwise (upgrading from Hobby), require payment details
    setPendingPlan(newPlan);
    setView("update-payment");
  };

  const handleExecutePlanChange = async () => {
    if (!pendingPlan) return;
    setIsLoading(true);
    try {
      await updatePlanAction(pendingPlan, {
        street: formValues.street || cardData.street,
        city: formValues.city || cardData.city,
        state: formValues.state || cardData.state,
        zip: formValues.zip || cardData.zip,
        country: formValues.country || cardData.country
      }, cardData.number ? {
        last4: cardData.number.slice(-4),
        brand: cardData.brand,
        expiry: cardData.expiry
      } : undefined);
      await update();
      router.refresh();
      const actionText = PLAN_RANKS[pendingPlan as keyof typeof PLAN_RANKS] > PLAN_RANKS[planName as keyof typeof PLAN_RANKS] ? "upgraded" : "downgraded";
      onSuccess?.(`Successfully ${actionText} to ${pendingPlan} plan.`);
      onClose();
    } catch (error) {
      onError?.(`Failed to change plan.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveCard = () => {
    setView("remove-card-confirm");
  };

  const executeRemoveCard = async () => {
    setIsLoading(true);
    try {
      await removePaymentMethodAction();
      await update();
      router.refresh();
      setCardData(prev => ({ ...prev, number: "", brand: "", expiry: "" }));
      onSuccess?.("Payment method removed successfully.");
      setView("overview");
    } catch (error) {
      onError?.("Failed to remove payment method.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className={`w-full overflow-hidden rounded-[32px] border border-zinc-200 bg-white shadow-2xl animate-in zoom-in-95 duration-300 transition-all duration-500 ${(view === 'update-payment' || view === 'success' || view === 'plan-change-review') ? 'max-w-4xl' : 'max-w-lg'}`}>
        
        {/* Header Section */}
        <div className={`relative p-8 transition-colors duration-500 ${(view === 'cancel-confirm' || view === 'remove-card-confirm') ? 'bg-rose-600 text-white' : 'bg-[#18181b] text-white'}`}>
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor">
              <path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/50 italic">
              {view === "overview" ? "Active Subscription" : view === "change-plan" ? "Select New Tier" : view === "update-payment" ? (pendingPlan ? (PLAN_RANKS[pendingPlan as keyof typeof PLAN_RANKS] > PLAN_RANKS[planName as keyof typeof PLAN_RANKS] ? "Complete Upgrade" : "Complete Downgrade") : "Secure Billing") : view === "success" ? "Purchase Confirmed" : view === "plan-change-review" ? "Review Plan Change" : view === "remove-card-confirm" ? "Confirm Removal" : "Confirm Cancellation"}
            </p>
            <h3 className="font-serif text-4xl font-bold italic">
              {view === "overview" ? planName : view === "change-plan" ? "Choose a Plan" : view === "update-payment" ? (pendingPlan ? "Payment Details" : "Payment Info") : view === "success" ? "Thank You!" : view === "plan-change-review" ? "Confirm Switch" : view === "remove-card-confirm" ? "Remove Card?" : "Wait! Are you sure?"}
            </h3>
          </div>

          {view === "overview" && (
            <div className="mt-8 flex items-end gap-2">
              <span className="text-5xl font-bold">{currentPlan.price}</span>
              <span className="mb-1 text-sm font-medium text-white/50">/ per month</span>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-8 space-y-8 min-h-[350px] flex flex-col">
          {view === "change-plan" ? (
            <div className="space-y-4">
              {Object.values(PLAN_DETAILS).map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => handlePlanSelection(plan.id)}
                  disabled={isLoading || plan.id === planName}
                  className={`flex w-full items-center justify-between rounded-2xl border p-4 transition-all ${
                    plan.id === planName 
                      ? "border-emerald-200 bg-emerald-50 cursor-default" 
                      : "border-zinc-100 bg-zinc-50 hover:border-zinc-200 hover:bg-zinc-100"
                  }`}
                >
                  <div className="text-left">
                    <p className="text-sm font-bold text-zinc-900">{plan.id}</p>
                    <p className="text-[10px] text-zinc-500">{plan.price} / month</p>
                  </div>
                  {plan.id === planName ? (
                    <span className="text-[10px] font-black uppercase text-emerald-600">Current</span>
                  ) : (
                    <span className="text-[10px] font-black uppercase text-zinc-400">Select</span>
                  )}
                </button>
              ))}
              <button 
                onClick={() => setView("overview")}
                className="w-full text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-900 mt-4"
              >
                Go Back
              </button>
            </div>
          ) : view === "update-payment" ? (
            <div className="flex flex-col gap-8 md:flex-row">
              {/* Left Column: Payment Form */}
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
                            setFormValues(prev => ({ 
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
                              onChange={(e) => {
                                const newState = e.target.value;
                                setFormValues(prev => ({ ...prev, state: newState, city: "", zip: "", street: "" }));
                              }}
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
                                onChange={(e) => {
                                  const newCity = e.target.value;
                                  setFormValues(prev => ({ ...prev, city: newCity, zip: "", street: "" }));
                                }}
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

              {/* Right Column: Order Summary */}
              <div className="w-full md:w-80 rounded-2xl bg-zinc-50 p-6 border border-zinc-100 h-fit space-y-6">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Order Summary</h4>
                
                {pendingPlan && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-zinc-900">{pendingPlan} Plan</p>
                        <p className="text-[10px] text-zinc-400">Monthly subscription</p>
                      </div>
                      <p className="text-sm font-bold text-zinc-900">{PLAN_DETAILS[pendingPlan as keyof typeof PLAN_DETAILS].price}</p>
                    </div>

                    <div className="h-px bg-zinc-200" />

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-medium text-zinc-500">
                        <span>Subtotal</span>
                        <span>${(parseFloat(PLAN_DETAILS[pendingPlan as keyof typeof PLAN_DETAILS].price.replace("$", "")) / 1.2).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-medium text-zinc-500">
                        <span>VAT (20%)</span>
                        <span>${(parseFloat(PLAN_DETAILS[pendingPlan as keyof typeof PLAN_DETAILS].price.replace("$", "")) - (parseFloat(PLAN_DETAILS[pendingPlan as keyof typeof PLAN_DETAILS].price.replace("$", "")) / 1.2)).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="h-px bg-zinc-200" />

                    <div className="flex justify-between items-center pt-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-900">Total</span>
                      <span className="text-xl font-bold text-emerald-600">
                        {PLAN_DETAILS[pendingPlan as keyof typeof PLAN_DETAILS].price}.00
                      </span>
                    </div>
                  </div>
                )}

                <div className="rounded-xl bg-white p-4 border border-zinc-100">
                  <div className="flex gap-3">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-500 mt-0.5">
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
                        <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <p className="text-[10px] font-medium leading-relaxed text-zinc-500 italic">
                      Your plan will be active immediately after the transaction is confirmed.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : view === "success" ? (
            <div className="flex flex-col gap-8 md:flex-row animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex-1 space-y-8">
                <div className="space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl shadow-emerald-500/20">
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor">
                      <path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <h2 className="font-serif text-3xl font-bold">Thank you for your purchase, {session?.user?.name || session?.user?.email}!</h2>
                    <p className="text-sm font-medium text-zinc-500 italic">Your {pendingPlan} subscription is now active and ready for orchestration.</p>
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-6 space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 italic">What&apos;s included</h4>
                    <ul className="space-y-3">
                      {pendingPlan && PLAN_DETAILS[pendingPlan as keyof typeof PLAN_DETAILS].features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-3 text-xs font-bold text-zinc-600 uppercase tracking-tighter">
                          <div className="h-1 w-1 rounded-full bg-emerald-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-6 space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 italic">Next Steps</h4>
                    <div className="space-y-4">
                      <button 
                        onClick={() => { onClose(); router.push("/playground"); }}
                        className="group flex w-full items-center justify-between text-left transition-colors hover:text-emerald-600"
                      >
                        <span className="text-xs font-bold uppercase tracking-widest">API Playground</span>
                        <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor">
                          <path d="M9 5l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => { onClose(); }}
                        className="group flex w-full items-center justify-between text-left transition-colors hover:text-emerald-600"
                      >
                        <span className="text-xs font-bold uppercase tracking-widest">Create New Key</span>
                        <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor">
                          <path d="M9 5l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => { setPendingPlan(null); setView("overview"); onClose(); }}
                  className="w-full rounded-full bg-[#18181b] py-5 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-zinc-800 shadow-xl"
                >
                  Return to Dashboard
                </button>
              </div>

              <div className="w-full md:w-80 space-y-6">
                <div className="rounded-2xl border border-dashed border-zinc-200 p-6 space-y-6 bg-white/50">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Order Receipt</h4>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Transaction ID</span>
                      <span className="text-[10px] font-mono font-bold text-zinc-900">#TXN-{transactionId}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Billing Date</span>
                      <span className="text-[10px] font-bold text-zinc-900">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-900">Total Charged</span>
                      <span className="text-lg font-black text-emerald-600">
                        {PLAN_DETAILS[pendingPlan as keyof typeof PLAN_DETAILS].price}.00
                      </span>
                    </div>
                  </div>
                  
                  <div className="rounded-xl bg-zinc-900 p-4 text-white">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 italic underline underline-offset-4">Billing To</p>
                    <div className="text-[10px] font-medium leading-relaxed opacity-70 space-y-0.5">
                      <p>{formValues.street}</p>
                      <p>{formValues.city}, {formValues.state} {formValues.zip}</p>
                      <p>{formValues.country}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : view === "plan-change-review" ? (
            <div className="flex flex-col gap-8 md:flex-row animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex-1 space-y-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-8">
                    <div className="flex-1 space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Current Plan</p>
                      <p className="text-xl font-bold text-zinc-900">{planName}</p>
                    </div>
                    <div className="h-8 w-px bg-zinc-200" />
                    <div className="flex-1 space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">New Plan</p>
                      <p className="text-xl font-bold text-zinc-900">{pendingPlan}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-6 space-y-6">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Billing Information</h4>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <svg viewBox="0 0 24 24" className="h-3 w-3 text-zinc-400" fill="none" stroke="currentColor">
                            <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Charging</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <p className="text-sm font-bold text-zinc-900">
                              {cardData.number ? `Card ending in ${cardData.number.slice(-4)}` : "No payment method saved"}
                            </p>
                            <p className="text-[9px] text-zinc-400 italic">
                              {cardData.number ? `${cardData.brand} • Primary method` : "Please add a card to continue"}
                            </p>
                          </div>
                          <button 
                            onClick={() => setView("update-payment")}
                            className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 hover:text-emerald-700 underline underline-offset-4"
                          >
                            {cardData.number ? "Change" : "Add Card"}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <svg viewBox="0 0 24 24" className="h-3 w-3 text-zinc-400" fill="none" stroke="currentColor">
                            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
                    onClick={handleExecutePlanChange}
                    disabled={isLoading || !cardData.number}
                    className={`w-full rounded-full py-5 text-[10px] font-black uppercase tracking-widest text-white transition shadow-xl ${
                      !cardData.number ? 'bg-zinc-300 cursor-not-allowed opacity-50' : 'bg-zinc-900 hover:bg-zinc-800'
                    }`}
                  >
                    {isLoading ? "Processing Switch..." : !cardData.number ? "Payment Method Required" : `Confirm Switch to ${pendingPlan}`}
                  </button>
                  <button 
                    onClick={() => { setView("change-plan"); setPendingPlan(null); }}
                    className="w-full rounded-full border border-zinc-200 bg-white py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-900"
                  >
                    Change Selection
                  </button>
                </div>
              </div>

              {/* Right Column: Order Summary */}
              <div className="w-full md:w-80 rounded-2xl bg-[#18181b] p-6 text-white h-fit space-y-6 shadow-2xl">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/40">New Plan Summary</h4>
                
                {pendingPlan && (
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
                )}
              </div>
            </div>
          ) : view === "cancel-confirm" ? (
            <div className="flex flex-col flex-1 justify-between py-4">
              <div className="space-y-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                  <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor">
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-bold text-zinc-900">Downgrading to Hobby</p>
                  <p className="text-sm text-zinc-500 max-w-xs mx-auto">
                    You&apos;ll lose access to premium features like priority support and higher request limits.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-12">
                <button 
                  onClick={handleCancelAction}
                  disabled={isLoading}
                  className="w-full rounded-full bg-rose-600 py-4 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-rose-700 shadow-xl shadow-rose-900/10"
                >
                  {isLoading ? "Processing..." : "Confirm Downgrade"}
                </button>
                <button 
                  onClick={() => setView("overview")}
                  className="w-full rounded-full border border-zinc-200 bg-white py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-900"
                >
                  Keep My Plan
                </button>
              </div>
            </div>
          ) : view === "remove-card-confirm" ? (
            <div className="flex flex-col flex-1 justify-between py-4">
              <div className="space-y-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                  <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-bold text-zinc-900">Remove Payment Method?</p>
                  <p className="text-sm text-zinc-500 max-w-xs mx-auto">
                    You&apos;ll need to add a new card if you want to upgrade or renew your subscription in the future.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-12">
                <button 
                  onClick={executeRemoveCard}
                  disabled={isLoading}
                  className="w-full rounded-full bg-rose-600 py-4 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-rose-700 shadow-xl shadow-rose-900/10"
                >
                  {isLoading ? "Processing..." : "Remove Card"}
                </button>
                <button 
                  onClick={() => setView("overview")}
                  className="w-full rounded-full border border-zinc-200 bg-white py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-900"
                >
                  Keep Card
                </button>
              </div>
            </div>
          ) : (
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
                onClick={() => setView("cancel-confirm")}
                disabled={isLoading || planName === "Hobby"}
                className="w-full text-center text-[9px] font-bold uppercase tracking-widest text-zinc-300 hover:text-rose-500 transition-colors disabled:opacity-50 disabled:hover:text-zinc-300"
              >
                {planName === "Hobby" ? "No active paid subscription" : "Cancel Subscription"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
