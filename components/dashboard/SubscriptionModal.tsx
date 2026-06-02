import React, { useState, useEffect } from "react";
import { updatePlanAction, removePaymentMethodAction } from "@/lib/auth-actions";
import { publicEnv } from "@/lib/env";
import { ModalCloseButton } from "@/components/ui/ModalCloseButton";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, useStripe, useElements, CardNumberElement } from "@stripe/react-stripe-js";

import type { Session } from "@supabase/supabase-js";

const stripePromise = loadStripe(publicEnv.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

type SubscriptionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  nextBillingDate?: string | null;
  initialView?: "overview" | "change-plan" | "cancel-confirm" | "update-payment" | "success" | "plan-change-review" | "remove-card-confirm" | "key-downgrade-selector";
  initialPendingPlan?: string | null;
  initialBillingInterval?: "month" | "year";
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  onDowngrade?: () => void;
  session?: Session | null;
};

import { PLAN_DETAILS, PLAN_RANKS, PLANS } from "@/lib/constants";
import { PlanSelection } from "./subscription/PlanSelection";
import { OrderSummary } from "./subscription/OrderSummary";
import { SuccessView } from "./subscription/SuccessView";
import { PaymentForm } from "./subscription/PaymentForm";
import { CancelConfirmation, RemoveCardConfirmation } from "./subscription/ConfirmationViews";
import { PlanReview } from "./subscription/PlanReview";
import { Overview } from "./subscription/Overview";
import { KeyDowngradeSelector } from "./subscription/KeyDowngradeSelector";

export function SubscriptionModal(props: SubscriptionModalProps) {
  if (!props.isOpen) return null;
  return (
    <Elements stripe={stripePromise}>
      <SubscriptionModalContent {...props} />
    </Elements>
  );
}

function SubscriptionModalContent({ isOpen, onClose, planName, nextBillingDate, onSuccess, onError, initialView, initialPendingPlan, initialBillingInterval, session }: SubscriptionModalProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [transactionId] = useState(() => Math.random().toString(36).substring(2, 9).toUpperCase());
  const [view, setView] = useState<"overview" | "change-plan" | "cancel-confirm" | "update-payment" | "success" | "plan-change-review" | "remove-card-confirm" | "key-downgrade-selector">(initialView || "overview");
  const [isLoading, setIsLoading] = useState(false);
  const [showCvc, setShowCvc] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<string | null>(initialPendingPlan || null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [isInitializing, setIsInitializing] = useState(initialPendingPlan === "Hobby");
  const [billingInterval, setBillingInterval] = useState<"month" | "year">(initialBillingInterval || "month");
  const hasInitializedRef = React.useRef(false);
  
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
    street: "",
    city: "",
    state: "",
    zip: "",
    country: ""
  });

  // Reset to overview or initial state whenever the modal is opened
  useEffect(() => {
    if (!isOpen) {
      hasInitializedRef.current = false;
      return;
    }

    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

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
        setBillingInterval(initialBillingInterval || "month");
        
        const s = session?.user;
        if (s) {
          const meta = s.user_metadata || {};
          setCardData(prev => ({
            ...prev,
            name: meta.full_name || prev.name,
            number: meta.payment_method_last4 ? `•••• •••• •••• ${meta.payment_method_last4}` : "",
            brand: meta.payment_method_brand || "",
            expiry: meta.payment_method_expiry || "",
            street: meta.billing_street || prev.street,
            city: meta.billing_city || prev.city,
            state: meta.billing_state || prev.state,
            zip: meta.billing_zip || prev.zip,
            country: meta.billing_country || prev.country
          }));
          setShowAddressForm(!meta.billing_street);
          
          setFormValues({
            name: meta.full_name || "",
            street: meta.billing_street || "",
            city: meta.billing_city || "",
            state: meta.billing_state || "",
            zip: meta.billing_zip || "",
            country: meta.billing_country || ""
          });
        } else {
          setFormValues({
            name: "",
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
  }, [isOpen, session, initialView, initialPendingPlan, initialBillingInterval]);

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
      // Before cancelling, check if we need to show the key selection selector
      const res = await fetch("/api/keys");
      const keys = await res.json();
      if (Array.isArray(keys) && keys.length > 3) {
        // Switch to the key selector instead of finishing the cancellation
        setView("key-downgrade-selector");
        setIsLoading(false);
        return;
      }

      if (!keepCard) {
        await removePaymentMethodAction();
      }
      await updatePlanAction("Hobby");
      await router.refresh();
      router.refresh();
      onSuccess?.("Subscription scheduled for cancellation.");
      onClose();
    } catch {
      onError?.("Failed to process cancellation. Please try again.");
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

  /**
   * Handles saving the payment method using Stripe Elements.
   * Note: We no longer need manual formatters (formatCardNumber, formatExpiry)
   * because Stripe handles card input formatting internally via its Elements iframe.
   * This function covers two scenarios:
   * 1. Saving a new payment method without changing the plan.
   * 2. Upgrading to a paid plan and entering a new credit card.
   * It also handles SCA / 3D Secure verification natively if requested by the card's bank.
   */
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      onError?.("Stripe is not fully initialized yet.");
      return;
    }

    const cardElement = elements.getElement(CardNumberElement);
    if (!cardElement) {
      onError?.("Credit card input fields not found.");
      return;
    }

    setIsLoading(true);

    try {
      const billingDetails = {
        street: formValues.street || null,
        city: formValues.city || null,
        state: formValues.state || null,
        zip: formValues.zip || null,
        country: formValues.country || null,
      };

      if (!pendingPlan) {
        // SCENARIO 1: Just saving a payment method / adding card without changing plan
        // 1. Create a SetupIntent on server
        const res = await fetch("/api/stripe/create-setup-intent", { method: "POST" });
        const { clientSecret, error: serverError } = await res.json();

        if (serverError || !clientSecret) {
          throw new Error(serverError || "Failed to create setup intent.");
        }

        // 2. Confirm the SetupIntent on the client using the CardNumberElement frame
        const { setupIntent, error: stripeError } = await stripe.confirmCardSetup(clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: formValues.name,
            },
          },
        });

        if (stripeError) {
          throw new Error(stripeError.message || "Failed to authorize credit card.");
        }

        if (!setupIntent || setupIntent.status !== "succeeded") {
          throw new Error("Setup authorization failed.");
        }

        // 3. Attach the payment method default, update DB and auth metadata
        const saveRes = await fetch("/api/stripe/save-payment-method", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentMethodId: setupIntent.payment_method,
            billingDetails,
          }),
        });

        const saveResult = await saveRes.json();
        if (saveResult.error) {
          throw new Error(saveResult.error);
        }

        // 4. Update local state
        setCardData({
          name: formValues.name,
          number: `•••• •••• •••• ${saveResult.paymentMethod?.payment_method_last4 || "••••"}`,
          brand: saveResult.paymentMethod?.payment_method_brand || "Card",
          expiry: saveResult.paymentMethod?.payment_method_expiry || "",
          cvc: "•••",
          street: formValues.street,
          city: formValues.city,
          state: formValues.state,
          zip: formValues.zip,
          country: formValues.country,
        });

        await router.refresh();
        router.refresh();
        onSuccess?.("Payment method updated and saved.");
        setView("overview");
      } else {
        // SCENARIO 2: Upgrading to a paid plan and entering a new credit card
        // 1. First, create a PaymentMethod client-side securely
        const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
          type: "card",
          card: cardElement,
          billing_details: {
            name: formValues.name,
          },
        });

        if (pmError) {
          throw new Error(pmError.message || "Failed to process card details.");
        }

        if (!paymentMethod) {
          throw new Error("Failed to generate secure payment token.");
        }

        // 2. Call re-enable on keys before plan change
        if (PLAN_RANKS[pendingPlan as keyof typeof PLAN_RANKS] > PLAN_RANKS[planName as keyof typeof PLAN_RANKS]) {
          await reEnableDisabledKeys();
        }

        // 3. Initiate the subscription with the new payment method
        const plan = PLANS.find(p => p.id === pendingPlan);
        const priceId = billingInterval === "year" ? plan?.yearlyPriceId : plan?.monthlyPriceId;

        if (!priceId) {
          throw new Error("Missing Price ID for this plan.");
        }

        const subRes = await fetch("/api/stripe/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            priceId,
            planId: pendingPlan,
            paymentMethodId: paymentMethod.id,
            billingDetails,
          }),
        });

        const subResult = await subRes.json();
        if (subResult.error) {
          throw new Error(subResult.error);
        }

        // 4. Natively handle SCA / 3D Secure verification if requested by card bank
        if (subResult.requires_action && subResult.client_secret) {
          const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(subResult.client_secret);
          if (confirmError) {
            throw new Error(confirmError.message || "3D Secure authentication failed.");
          }

          if (paymentIntent && paymentIntent.status === "succeeded") {
            // Re-sync with server to finalize state update in profile/auth metadata
            const finalSync = await fetch("/api/stripe/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                priceId,
                planId: pendingPlan,
                billingDetails,
              }),
            });
            const syncRes = await finalSync.json();
            if (syncRes.error) {
              throw new Error(syncRes.error);
            }
          } else {
            throw new Error("SCA payment authorization failed.");
          }
        }

        // 5. Success! Populate details and trigger success view
        setCardData({
          name: formValues.name,
          number: `•••• •••• •••• ${paymentMethod.card?.last4 || "••••"}`,
          brand: paymentMethod.card?.brand || "Card",
          expiry: `${paymentMethod.card?.exp_month}/${paymentMethod.card?.exp_year}`,
          cvc: "•••",
          street: formValues.street,
          city: formValues.city,
          state: formValues.state,
          zip: formValues.zip,
          country: formValues.country,
        });

        await router.refresh();
        router.refresh();
        const actionText = PLAN_RANKS[pendingPlan as keyof typeof PLAN_RANKS] > PLAN_RANKS[planName as keyof typeof PLAN_RANKS] ? "upgraded" : "downgraded";
        onSuccess?.(`Successfully ${actionText} to ${pendingPlan} plan.`);
        setView("success");
      }
    } catch (err) {
      console.error("Save payment process failed:", err);
      const message = err instanceof Error ? err.message : "Failed to save card and process transaction.";
      onError?.(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormValues(prev => ({ ...prev, [name]: value }));
  };

  const handlePlanSelection = async (newPlan: string) => {
    if (newPlan === planName) return;
    
    if (newPlan === "Hobby") {
      setPendingPlan("Hobby");
      handleInitiateDowngrade();
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
      await router.refresh();
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
      // 1. If upgrading, re-enable any keys that were disabled during a previous downgrade
      if (planName === "Hobby" || (pendingPlan !== "Hobby" && PLAN_RANKS[pendingPlan as keyof typeof PLAN_RANKS] > PLAN_RANKS[planName as keyof typeof PLAN_RANKS])) {
        await reEnableDisabledKeys();
      }

      // 2. Get the correct price ID for Stripe
      const plan = PLANS.find(p => p.id === pendingPlan);
      const priceId = billingInterval === "year" ? plan?.yearlyPriceId : plan?.monthlyPriceId;

      if (!priceId && pendingPlan !== "Hobby") {
        throw new Error("Missing Price ID for this plan");
      }

      // 3. If it's a downgrade to Hobby, handle it via server action
      if (pendingPlan === "Hobby") {
        await updatePlanAction("Hobby");
        await router.refresh();
        onSuccess?.("Successfully downgraded to Hobby plan.");
        onClose();
        router.refresh();
        return;
      }

      // 4. For paid plans, trigger local native subscription process using /api/stripe/subscribe
      const response = await fetch("/api/stripe/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          priceId,
          planId: pendingPlan
        }),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      // Natively handle SCA challenge in-app
      if (data.requires_action && data.client_secret) {
        if (!stripe) {
          throw new Error("Stripe.js is required for 3D Secure verification.");
        }
        const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(data.client_secret);
        if (confirmError) {
          throw new Error(confirmError.message || "3D Secure authentication failed.");
        }

        if (paymentIntent && paymentIntent.status === "succeeded") {
          // Re-sync final status with server
          const finalSync = await fetch("/api/stripe/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              priceId,
              planId: pendingPlan
            }),
          });
          const syncRes = await finalSync.json();
          if (syncRes.error) {
            throw new Error(syncRes.error);
          }
        } else {
          throw new Error("SCA payment authorization failed.");
        }
      }

      await router.refresh();
      router.refresh();
      const actionText = PLAN_RANKS[pendingPlan as keyof typeof PLAN_RANKS] > PLAN_RANKS[planName as keyof typeof PLAN_RANKS] ? "upgraded" : "downgraded";
      onSuccess?.(`Successfully ${actionText} to ${pendingPlan} plan.`);
      setView("success");
    } catch (error) {
      console.error("Plan change error:", error);
      const message = error instanceof Error ? error.message : "An error occurred. Please try again.";
      onError?.(message);
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
      await router.refresh();
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
      className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-6"
    >
      {/* Decisive Backdrop - Blocks all background interaction */}
      <div 
        className="fixed inset-0 bg-zinc-900/60 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div className={`relative z-10 my-3 w-full max-h-[calc(100dvh-1.5rem)] overflow-hidden rounded-[28px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl animate-in zoom-in-95 duration-300 sm:my-0 sm:max-h-[calc(100dvh-3rem)] sm:rounded-[40px] ${isInitializing ? 'max-w-sm' : (view === 'update-payment' || view === 'success' || view === 'plan-change-review') ? 'max-w-4xl' : (view === 'key-downgrade-selector' || view === 'cancel-confirm') ? 'max-w-xl' : 'max-w-lg'}`}>
        
        {isInitializing ? (
          <div className="flex flex-col items-center justify-center gap-6 p-12">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-100 dark:border-zinc-800 border-t-zinc-900 dark:border-t-zinc-100" />
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 dark:text-zinc-500 text-center">Verifying Operational Status...</p>
          </div>
        ) : (
          <div key={view} className="max-h-[calc(100dvh-1.5rem)] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-500 sm:max-h-[calc(100dvh-3rem)]">
            {/* Adaptive Header: Softened Rose-Red for destructive actions, Zinc-900 for others */}
            <div className={`relative overflow-hidden p-6 transition-all duration-500 sm:p-10 ${(view === 'cancel-confirm' || view === 'remove-card-confirm' || view === 'key-downgrade-selector')
              ? 'bg-gradient-to-br from-[#d40035] to-[#f4003d] text-white' 
              : 'bg-[#18181b] text-white'}`}>
              
              {/* Subtle Grain Overlay for Destructive Views */}
              {(view === 'cancel-confirm' || view === 'remove-card-confirm' || view === 'key-downgrade-selector') && (
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png")' }} />
              )}
              
              <ModalCloseButton
                onClick={onClose}
                className="absolute right-3 top-3 z-30 text-white/35 hover:bg-white/10 hover:text-white sm:right-6 sm:top-6"
              />
              
              <div className="relative z-10 space-y-2 pr-12 sm:pr-14">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">
                  {view === "overview" ? "Active Subscription" : view === "change-plan" ? "Select New Tier" : view === "update-payment" ? (pendingPlan ? (PLAN_RANKS[pendingPlan as keyof typeof PLAN_RANKS] > PLAN_RANKS[planName as keyof typeof PLAN_RANKS] ? "Complete Upgrade" : "Complete Downgrade") : "Secure Billing") : view === "success" ? "Purchase Confirmed" : view === "plan-change-review" ? "Review Plan Change" : view === "remove-card-confirm" ? "Confirm Removal" : view === "key-downgrade-selector" ? "Hobby Plan Limit" : "Confirm Cancellation"}
                </p>
                <h3 className="font-serif text-3xl font-bold italic tracking-tight sm:text-6xl">
                  {view === "overview" ? planName : view === "change-plan" ? "Choose a Plan" : view === "update-payment" ? (pendingPlan ? "Payment Details" : "Payment Info") : view === "success" ? "Thank You!" : view === "plan-change-review" ? "Confirm Switch" : view === "remove-card-confirm" ? "Remove Card?" : view === "key-downgrade-selector" ? "Select Keys" : "Cancel Plan?"}
                </h3>
              </div>

              {view === "overview" && planName !== "Hobby" && (
                <div className="relative z-10 mt-8 flex items-baseline gap-2 sm:mt-10">
                  <span className="text-5xl font-bold tracking-tighter sm:text-7xl">{currentPlan.price}</span>
                  <span className="text-sm font-medium text-white/40">/ per month</span>
                </div>
              )}
            </div>

            {/* Body Section */}
            <div className="p-5 sm:p-8">
              {view === "change-plan" ? (
            <PlanSelection 
              planName={planName}
              isLoading={isLoading}
              billingInterval={billingInterval}
              setBillingInterval={setBillingInterval}
              onSelectPlan={handlePlanSelection}
              onGoBack={() => setView("overview")}
            />
          ) : view === "update-payment" ? (
            <div className="flex flex-col gap-6 md:flex-row md:gap-8">
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
              session={session || null} 
              onClose={onClose}
            />
          ) : view === "plan-change-review" ? (
            <PlanReview 
              pendingPlan={pendingPlan}
              isLoading={isLoading}
              billingInterval={billingInterval}
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
              nextBillingDate={nextBillingDate}
              planName={planName}
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
        )}
      </div>
    </div>
  );
}
