import React, { useState, useEffect } from "react";
import { updatePlanAction } from "@/lib/auth-actions";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type SubscriptionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  initialView?: "overview" | "change-plan" | "cancel-confirm" | "update-payment" | "success" | "plan-change-review";
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

const PLAN_RANKS: Record<string, number> = {
  "Hobby": 0,
  "Premium": 1,
  "Researcher": 2
};

export function SubscriptionModal({ isOpen, onClose, planName, onSuccess, onError, initialView, initialPendingPlan }: SubscriptionModalProps) {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [view, setView] = useState<"overview" | "change-plan" | "cancel-confirm" | "update-payment" | "success" | "plan-change-review">(initialView || "overview");
  const [isLoading, setIsLoading] = useState(false);
  const [showCvc, setShowCvc] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<string | null>(initialPendingPlan || null);
  
  // State for card details
  const [cardData, setCardData] = useState({
    name: "",
    number: "•••• •••• •••• 4242",
    expiry: "12/26",
    cvc: "•••"
  });

  // Temp state for the form inputs
  const [formValues, setFormValues] = useState({
    name: "",
    number: "",
    expiry: "",
    cvc: "",
    street: "",
    city: "",
    zip: "",
    country: ""
  });

  // Reset to overview or initial state whenever the modal is opened
  useEffect(() => {
    if (isOpen) {
      setView(initialView || "overview");
      setPendingPlan(initialPendingPlan || null);
      setFormValues({
        name: "",
        number: "",
        expiry: "",
        cvc: "",
        street: "",
        city: "",
        zip: "",
        country: ""
      });
    }
  }, [isOpen]);

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
    // Simulate API call for card validation
    setTimeout(async () => {
      setCardData({
        name: formValues.name,
        number: `•••• •••• •••• ${cleanNumber.slice(-4)}`,
        expiry: formValues.expiry,
        cvc: formValues.cvc
      });

      if (pendingPlan) {
        try {
          await updatePlanAction(pendingPlan);
          await update();
          router.refresh();
          const actionText = PLAN_RANKS[pendingPlan] > PLAN_RANKS[planName] ? "upgraded" : "downgraded";
          onSuccess?.(`Successfully ${actionText} to ${pendingPlan} plan.`);
          setView("success");
          // setPendingPlan(null); // Keep pendingPlan for the success view to show details
        } catch (error) {
          onError?.(`Failed to change plan.`);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
        onSuccess?.("Payment method updated successfully.");
        setView("overview");
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
      let month = parseInt(v.substring(0, 2), 10);
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
      await updatePlanAction(pendingPlan);
      await update();
      router.refresh();
      const actionText = PLAN_RANKS[pendingPlan] > PLAN_RANKS[planName] ? "upgraded" : "downgraded";
      onSuccess?.(`Successfully ${actionText} to ${pendingPlan} plan.`);
      setView("success");
    } catch (error) {
      onError?.(`Failed to change plan.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className={`w-full overflow-hidden rounded-[32px] border border-zinc-200 bg-white shadow-2xl animate-in zoom-in-95 duration-300 transition-all duration-500 ${(view === 'update-payment' || view === 'success') ? 'max-w-4xl' : 'max-w-lg'}`}>
        
        {/* Header Section */}
        <div className={`relative p-8 transition-colors duration-500 ${view === 'cancel-confirm' ? 'bg-rose-600 text-white' : 'bg-[#18181b] text-white'}`}>
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
              {view === "overview" ? "Active Subscription" : view === "change-plan" ? "Select New Tier" : view === "update-payment" ? (pendingPlan ? (PLAN_RANKS[pendingPlan] > PLAN_RANKS[planName] ? "Complete Upgrade" : "Complete Downgrade") : "Secure Billing") : view === "success" ? "Purchase Confirmed" : view === "plan-change-review" ? "Review Plan Change" : "Confirm Cancellation"}
            </p>
            <h3 className="font-serif text-4xl font-bold italic">
              {view === "overview" ? planName : view === "change-plan" ? "Choose a Plan" : view === "update-payment" ? (pendingPlan ? "Payment Details" : "Payment Info") : view === "success" ? "Thank You!" : view === "plan-change-review" ? "Confirm Switch" : "Wait! Are you sure?"}
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
                  <div className="space-y-2">
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
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Card Number</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        name="number"
                        required
                        value={formValues.number}
                        onChange={handleInputChange}
                        placeholder="0000 0000 0000 0000"
                        className="w-full rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-medium outline-none focus:border-zinc-900 transition-colors pr-12"
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

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Street Address</label>
                    <input 
                      type="text" 
                      name="street"
                      required
                      value={formValues.street}
                      onChange={handleInputChange}
                      placeholder="123 AI Avenue"
                      className="w-full rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-medium outline-none focus:border-zinc-900 transition-colors"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">City</label>
                      <input 
                        type="text" 
                        name="city"
                        required
                        value={formValues.city}
                        onChange={handleInputChange}
                        placeholder="San Francisco"
                        className="w-full rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-medium outline-none focus:border-zinc-900 transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Postal Code</label>
                      <input 
                        type="text" 
                        name="zip"
                        required
                        value={formValues.zip}
                        onChange={handleInputChange}
                        placeholder="94103"
                        className="w-full rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-medium outline-none focus:border-zinc-900 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Country</label>
                    <input 
                      type="text" 
                      name="country"
                      required
                      value={formValues.country}
                      onChange={handleInputChange}
                      placeholder="United States"
                      className="w-full rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-medium outline-none focus:border-zinc-900 transition-colors"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-full bg-zinc-900 py-4 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-zinc-800 shadow-xl shadow-zinc-900/10"
                  >
                    {isLoading ? "Validating..." : (pendingPlan ? (PLAN_RANKS[pendingPlan] > PLAN_RANKS[planName] ? `Upgrade to ${pendingPlan}` : `Downgrade to ${pendingPlan}`) : "Save Payment Method")}
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
                    <h2 className="font-serif text-3xl font-bold">Thank you for your purchase, {(session?.user as any)?.full_name || session?.user?.name || session?.user?.email}!</h2>
                    <p className="text-sm font-medium text-zinc-500 italic">Your {pendingPlan} subscription is now active and ready for orchestration.</p>
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-6 space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 italic">What's included</h4>
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
                      <span className="text-[10px] font-mono font-bold text-zinc-900">#TXN-{Math.random().toString(36).substring(2, 9).toUpperCase()}</span>
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
                    <div className="text-[10px] font-medium leading-relaxed opacity-70">
                      <p>{formValues.street}</p>
                      <p>{formValues.city}, {formValues.zip}</p>
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
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-zinc-500">Payment Method</span>
                        <span className="text-sm font-bold text-zinc-900">Card ending in {cardData.number.slice(-4)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-zinc-500">Billing Cycle</span>
                        <span className="text-sm font-bold text-zinc-900">Monthly</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleExecutePlanChange}
                    disabled={isLoading}
                    className="w-full rounded-full bg-zinc-900 py-5 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-zinc-800 shadow-xl"
                  >
                    {isLoading ? "Processing Switch..." : `Confirm Switch to ${pendingPlan}`}
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
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-bold">{pendingPlan} Plan</p>
                        <p className="text-[10px] text-white/40 italic">VAT inclusive</p>
                      </div>
                      <p className="text-sm font-bold">{PLAN_DETAILS[pendingPlan as keyof typeof PLAN_DETAILS].price}</p>
                    </div>

                    <div className="h-px bg-white/10" />

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-medium text-white/60">
                        <span>Price Change</span>
                        <span>
                          {PLAN_RANKS[pendingPlan] > PLAN_RANKS[planName] ? "+" : "-"} 
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

                    <div className="flex justify-between items-center pt-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest">Total Price</span>
                      <span className="text-xl font-bold text-emerald-400">
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
                    You'll lose access to premium features like priority support and higher request limits.
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
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Next Billing Date</p>
                      <p className="text-sm font-bold text-zinc-900">{currentPlan.nextBilling}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Payment Method</p>
                      <p className="text-sm font-bold text-zinc-900">{cardData.number}</p>
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
