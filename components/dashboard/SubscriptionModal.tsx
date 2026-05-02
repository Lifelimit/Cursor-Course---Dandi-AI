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
  initialView?: "overview" | "change-plan" | "cancel-confirm" | "update-payment" | "success" | "plan-change-review" | "remove-card-confirm" | "key-downgrade-selector";
  initialPendingPlan?: string | null;
};

import { PLAN_DETAILS, PLAN_RANKS } from "@/lib/constants";
import { PlanSelection } from "./subscription/PlanSelection";
import { OrderSummary } from "./subscription/OrderSummary";
import { SuccessView } from "./subscription/SuccessView";
import { PaymentForm } from "./subscription/PaymentForm";
import { CancelConfirmation, RemoveCardConfirmation } from "./subscription/ConfirmationViews";
import { PlanReview } from "./subscription/PlanReview";
import { Overview } from "./subscription/Overview";
import { KeyDowngradeSelector } from "./subscription/KeyDowngradeSelector";

export function SubscriptionModal({ isOpen, onClose, planName, onSuccess, onError, initialView, initialPendingPlan }: SubscriptionModalProps) {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [transactionId] = useState(() => Math.random().toString(36).substring(2, 9).toUpperCase());
  const [view, setView] = useState<"overview" | "change-plan" | "cancel-confirm" | "update-payment" | "success" | "plan-change-review" | "remove-card-confirm" | "key-downgrade-selector">(initialView || "overview");
  const [isLoading, setIsLoading] = useState(false);
  const [showCvc, setShowCvc] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<string | null>(initialPendingPlan || null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [isInitializing, setIsInitializing] = useState(initialPendingPlan === "Hobby");
  
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
    const initializeState = async () => {
      if (isOpen) {
        let targetView = initialView || "overview";
        const finalPendingPlan = initialPendingPlan || null;

        // Unified Downgrade Audit
        if (finalPendingPlan === "Hobby") {
          setIsInitializing(true);
          try {
            const res = await fetch("/api/keys");
            const keys = await res.json();
            if (Array.isArray(keys) && keys.length > 3) {
              targetView = "key-downgrade-selector";
            } else {
              targetView = "cancel-confirm";
            }
          } catch {
            targetView = "cancel-confirm";
          }
        }

        setView(targetView);
        setPendingPlan(finalPendingPlan);
        
        const s = session?.user;
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
        setIsInitializing(false);
      }
    };
    initializeState();
  }, [isOpen, session, initialView, initialPendingPlan]);

  // Remove the old state scrub to allow key-based mounting to handle it

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

  const handleCancelAction = async (keepCard: boolean) => {
    setIsLoading(true);
    try {
      if (!keepCard) {
        await removePaymentMethodAction();
      }
      await updatePlanAction("Hobby");
      await update();
      router.refresh();
      onSuccess?.("Subscription cancelled successfully.");
      onClose();
    } catch {
      onError?.("Failed to cancel subscription.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitiateDowngrade = async () => {
    try {
      const res = await fetch("/api/keys");
      const keys = await res.json();
      if (Array.isArray(keys) && keys.length > 3) {
        setView("key-downgrade-selector");
        return;
      }
    } catch { /* Fallback to cancel-confirm */ }
    setView("cancel-confirm");
  };

  const reEnableDisabledKeys = async () => {
    try {
      const keysRes = await fetch("/api/keys");
      const allKeys = await keysRes.json();
      const disabledIds = Array.isArray(allKeys)
        ? allKeys.filter((k: { is_active: boolean }) => !k.is_active).map((k: { id: string }) => k.id)
        : [];
      if (disabledIds.length > 0) {
        await fetch("/api/keys/bulk-delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: disabledIds, action: "enable" }),
        });
      }
    } catch { /* Best-effort — do not block the upgrade */ }
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
          // If upgrading from Hobby, re-enable any disabled keys
          if (PLAN_RANKS[pendingPlan as keyof typeof PLAN_RANKS] > PLAN_RANKS[planName as keyof typeof PLAN_RANKS]) {
            await reEnableDisabledKeys();
          }
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
        } catch {
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
        } catch {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
      // Check if the user has more than 3 keys — if so, show the key selector step
      try {
        const res = await fetch("/api/keys");
        const keys = await res.json();
        if (Array.isArray(keys) && keys.length > 3) {
          setView("key-downgrade-selector");
          return;
        }
      } catch { /* Fallback to normal cancel flow if fetch fails */ }
      setView("cancel-confirm");
      return;
    }
    // If already on a paid plan, show review screen
    if (planName !== "Hobby") {
      setPendingPlan(newPlan);
      setView("plan-change-review");
      return;
    }

    // Otherwise (upgrading from Hobby): if card is already on file, go to review; else collect payment
    setPendingPlan(newPlan);
    if (cardData.number) {
      setView("plan-change-review");
    } else {
      setView("update-payment");
    }
  };

  const handleKeyDowngradeConfirm = async (idsToDelete: string[], keepCard: boolean) => {
    setIsLoading(true);
    try {
      if (idsToDelete.length > 0) {
        const res = await fetch("/api/keys/bulk-delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: idsToDelete, action: "disable" }),
        });
        if (!res.ok) throw new Error("Failed to disable excess keys.");
      }
      if (!keepCard) {
        await removePaymentMethodAction();
      }
      await updatePlanAction("Hobby");
      await update();
      router.refresh();
      onSuccess?.("Downgraded to Hobby. Excess keys disabled.");
      onClose();
    } catch {
      onError?.("Failed to downgrade plan. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecutePlanChange = async () => {
    if (!pendingPlan) return;
    setIsLoading(true);
    try {
      // If upgrading FROM Hobby, re-enable any keys that were disabled during a previous downgrade
      if (planName === "Hobby" || PLAN_RANKS[pendingPlan as keyof typeof PLAN_RANKS] > PLAN_RANKS[planName as keyof typeof PLAN_RANKS]) {
        await reEnableDisabledKeys();
      }
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
    } catch {
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
    } catch {
      onError?.("Failed to remove payment method.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6"
    >
      {/* Decisive Backdrop - Blocks all background interaction */}
      <div 
        className="fixed inset-0 bg-zinc-900/60 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div className={`relative z-10 w-full overflow-hidden rounded-[40px] border border-zinc-200 bg-white shadow-2xl animate-in zoom-in-95 duration-300 transition-all duration-500 ${(view === 'update-payment' || view === 'success' || view === 'plan-change-review') ? 'max-w-4xl' : view === 'key-downgrade-selector' ? 'max-w-xl' : 'max-w-lg'}`}>
        
        {/* Header Section */}
        <div className={`relative p-8 transition-colors duration-500 ${(view === 'cancel-confirm' || view === 'remove-card-confirm' || view === 'key-downgrade-selector') ? 'bg-rose-600 text-white' : 'bg-[#18181b] text-white'}`}>
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
              {view === "overview" ? "Active Subscription" : view === "change-plan" ? "Select New Tier" : view === "update-payment" ? (pendingPlan ? (PLAN_RANKS[pendingPlan as keyof typeof PLAN_RANKS] > PLAN_RANKS[planName as keyof typeof PLAN_RANKS] ? "Complete Upgrade" : "Complete Downgrade") : "Secure Billing") : view === "success" ? "Purchase Confirmed" : view === "plan-change-review" ? "Review Plan Change" : view === "remove-card-confirm" ? "Confirm Removal" : view === "key-downgrade-selector" ? "Hobby Plan Limit" : "Confirm Cancellation"}
            </p>
            <h3 className="font-serif text-4xl font-bold italic">
              {view === "overview" ? planName : view === "change-plan" ? "Choose a Plan" : view === "update-payment" ? (pendingPlan ? "Payment Details" : "Payment Info") : view === "success" ? "Thank You!" : view === "plan-change-review" ? "Confirm Switch" : view === "remove-card-confirm" ? "Remove Card?" : view === "key-downgrade-selector" ? "Select Keys to Keep" : "Wait! Are you sure?"}
            </h3>
          </div>

          {view === "overview" && (
            <div className="mt-8 flex items-end gap-2">
              <span className="text-5xl font-bold">{currentPlan.price}</span>
              <span className="mb-1 text-sm font-medium text-white/50">/ per month</span>
            </div>
          )}
        </div>

        {/* Body Section */}
        <div className="p-8">
          {isInitializing ? (
            <div className="flex flex-col items-center justify-center gap-4 py-24">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-100 border-t-zinc-900" />
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">Verifying Operational Status...</p>
            </div>
          ) : view === "change-plan" ? (
            <PlanSelection 
              planName={planName}
              isLoading={isLoading}
              onSelectPlan={handlePlanSelection}
              onGoBack={() => setView("overview")}
            />
          ) : view === "update-payment" ? (
            <div className="flex flex-col gap-8 md:flex-row">
              <PaymentForm 
                formValues={formValues}
                setFormValues={setFormValues}
                handleInputChange={handleInputChange}
                handleSavePayment={handleSavePayment}
                isLoading={isLoading}
                showCvc={showCvc}
                setShowCvc={setShowCvc}
                showAddressForm={showAddressForm}
                setShowAddressForm={setShowAddressForm}
                pendingPlan={pendingPlan}
                planName={planName}
                onClose={onClose}
                setView={setView}
                setPendingPlan={setPendingPlan}
                initialView={initialView}
                cardData={cardData}
              />
              <OrderSummary pendingPlan={pendingPlan} />
            </div>
          ) : view === "success" ? (
            <SuccessView 
              pendingPlan={pendingPlan} 
              transactionId={transactionId} 
              session={session} 
              onClose={onClose}
            />
          ) : view === "plan-change-review" ? (
            <PlanReview 
              pendingPlan={pendingPlan}
              planName={planName}
              isLoading={isLoading}
              formValues={formValues}
              cardData={cardData}
              setView={setView}
              onConfirm={handleExecutePlanChange}
              onBack={() => { setView("change-plan"); setPendingPlan(null); }}
            />
          ) : view === "key-downgrade-selector" ? (
            <KeyDowngradeSelector
              isLoading={isLoading}
              hasCard={!!cardData.number}
              onConfirm={handleKeyDowngradeConfirm}
              onBack={onClose}
            />
          ) : view === "cancel-confirm" ? (
            <CancelConfirmation 
              isLoading={isLoading}
              hasCard={!!cardData.number}
              onConfirm={handleCancelAction}
              onCancel={onClose}
            />
          ) : view === "remove-card-confirm" ? (
            <RemoveCardConfirmation 
              isLoading={isLoading}
              onConfirm={executeRemoveCard}
              onCancel={() => setView("overview")}
            />
          ) : (
            <Overview 
              planName={planName}
              currentPlan={currentPlan}
              formValues={formValues}
              cardData={cardData}
              isLoading={isLoading}
              setView={setView}
              handleRemoveCard={handleRemoveCard}
              onCancelSubscription={handleInitiateDowngrade}
            />
          )}
        </div>
      </div>
    </div>
  );
}
