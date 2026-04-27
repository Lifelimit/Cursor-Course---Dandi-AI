import React, { useState, useEffect } from "react";
import { updatePlanAction } from "@/lib/auth-actions";
import { useRouter } from "next/navigation";

type SubscriptionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
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

export function SubscriptionModal({ isOpen, onClose, planName, onSuccess, onError }: SubscriptionModalProps) {
  const router = useRouter();
  const [view, setView] = useState<"overview" | "change-plan" | "cancel-confirm" | "update-payment">("overview");
  const [isLoading, setIsLoading] = useState(false);
  const [showCvc, setShowCvc] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);
  
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
    cvc: ""
  });

  // Reset to overview whenever the modal is opened
  useEffect(() => {
    if (isOpen) {
      setView("overview");
      setPendingPlan(null);
      setFormValues({
        name: "",
        number: "",
        expiry: "",
        cvc: ""
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPlan = PLAN_DETAILS[planName as keyof typeof PLAN_DETAILS] || PLAN_DETAILS.Hobby;

  const handleCancelAction = async () => {
    setIsLoading(true);
    try {
      await updatePlanAction("Hobby");
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
          router.refresh();
          onSuccess?.(`Successfully upgraded to ${pendingPlan} plan.`);
          setView("overview");
          setPendingPlan(null);
          onClose();
        } catch (error) {
          onError?.("Failed to upgrade plan.");
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === "number") {
      setFormValues(prev => ({ ...prev, number: formatCardNumber(value).substring(0, 19) }));
    } else if (name === "expiry") {
      setFormValues(prev => ({ ...prev, expiry: formatExpiry(value, prev.expiry).substring(0, 5) }));
    } else if (name === "cvc") {
      setFormValues(prev => ({ ...prev, cvc: value.replace(/[^0-9]/gi, "").substring(0, 4) }));
    } else {
      setFormValues(prev => ({ ...prev, [name]: value }));
    }
  };

  const handlePlanSelection = (newPlan: string) => {
    if (newPlan === planName) return;
    if (newPlan === "Hobby") {
      setView("cancel-confirm");
      return;
    }
    setPendingPlan(newPlan);
    setView("update-payment");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-lg overflow-hidden rounded-[32px] border border-zinc-200 bg-white shadow-2xl animate-in zoom-in-95 duration-300">
        
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
              {view === "overview" ? "Active Subscription" : view === "change-plan" ? "Select New Tier" : view === "update-payment" ? (pendingPlan ? "Complete Upgrade" : "Secure Billing") : "Confirm Cancellation"}
            </p>
            <h3 className="font-serif text-4xl font-bold italic">
              {view === "overview" ? planName : view === "change-plan" ? "Choose a Plan" : view === "update-payment" ? (pendingPlan ? "Payment Details" : "Payment Info") : "Wait! Are you sure?"}
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
            <form onSubmit={handleSavePayment} className="flex flex-col flex-1 justify-between gap-8">
              <div className="space-y-6">
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

                <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-full bg-zinc-900 py-4 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-zinc-800 shadow-xl shadow-zinc-900/10"
                >
                  {isLoading ? "Validating Card..." : (pendingPlan ? `Upgrade to ${pendingPlan}` : "Save Payment Method")}
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    if (pendingPlan) {
                      setView("change-plan");
                      setPendingPlan(null);
                    } else {
                      setView("overview");
                    }
                  }}
                  className="w-full rounded-full border border-zinc-200 bg-white py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-900"
                >
                  {pendingPlan ? "Go Back" : "Cancel"}
                </button>
              </div>
            </form>
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
