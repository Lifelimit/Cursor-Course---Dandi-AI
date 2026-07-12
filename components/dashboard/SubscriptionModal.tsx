import React, { useState, useEffect } from "react";
import { publicEnv } from "@/lib/env";
import { ModalCloseButton } from "@/components/ui/ModalCloseButton";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, useStripe, useElements, CardNumberElement } from "@stripe/react-stripe-js";
import { ModalFrame } from "@/components/command/ModalFrame";

import type { User } from "@supabase/supabase-js";
import type { PaymentMethodDisplay, SubscriptionActionResult } from "@/types/billing";

type TerminalSubscriptionActionResult = Extract<
  SubscriptionActionResult,
  { status: "active" | "scheduled" | "processing" }
>;

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
  user?: User | null;
  paymentMethods?: PaymentMethodDisplay[] | null;
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

function SubscriptionModalContent({ isOpen, onClose, planName, nextBillingDate, onSuccess, onError, initialView, initialPendingPlan, initialBillingInterval, user, paymentMethods }: SubscriptionModalProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [subscriptionResult, setSubscriptionResult] = useState<TerminalSubscriptionActionResult | null>(null);
  const [view, setView] = useState<"overview" | "change-plan" | "cancel-confirm" | "update-payment" | "success" | "plan-change-review" | "remove-card-confirm" | "key-downgrade-selector">(initialView || "overview");
  const [isLoading, setIsLoading] = useState(false);
  const [showCvc, setShowCvc] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<string | null>(initialPendingPlan || null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [isInitializing, setIsInitializing] = useState(initialPendingPlan === "Hobby");
  const [billingInterval, setBillingInterval] = useState<"month" | "year">(initialBillingInterval || "month");
  const hasInitializedRef = React.useRef(false);
  const subscriptionOperationRef = React.useRef<{ key: string; id: string } | null>(null);

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
        const defaultPaymentMethod = paymentMethods?.find((method) => method.isDefault) || paymentMethods?.[0] || null;

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

        if (planName === "Hobby" && finalPendingPlan && finalPendingPlan !== "Hobby" && !defaultPaymentMethod) {
          targetView = "update-payment";
        }

        setView(targetView);
        setPendingPlan(finalPendingPlan);
        setBillingInterval(initialBillingInterval || "month");

        const s = user;
        if (s) {
          const meta = s.user_metadata || {};
          setCardData(prev => ({
            ...prev,
            name: meta.full_name || prev.name,
            number: defaultPaymentMethod ? `•••• •••• •••• ${defaultPaymentMethod.last4}` : "",
            brand: defaultPaymentMethod?.brand || "",
            expiry: defaultPaymentMethod?.expiry || "",
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
  }, [isOpen, user, paymentMethods, planName, initialView, initialPendingPlan, initialBillingInterval]);

  // Remove the old state scrub to allow key-based mounting to handle it

  if (!isOpen) return null;

  const currentPlan = PLAN_DETAILS[planName as keyof typeof PLAN_DETAILS] || PLAN_DETAILS.Hobby;

  const scheduleCancellation = async (keysToKeep: string[] = []) => {
    const response = await fetch("/api/stripe/cancel-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keysToKeep }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "Failed to schedule cancellation.");
    }
  };

  const completeSubscription = async (options: {
    paymentMethodId?: string;
    billingDetails?: Record<string, string | null>;
  } = {}) => {
    if (!pendingPlan || pendingPlan === "Hobby") {
      throw new Error("Choose a paid plan before continuing.");
    }

    const plan = PLANS.find((candidate) => candidate.id === pendingPlan);
    const priceId = billingInterval === "year" ? plan?.yearlyPriceId : plan?.monthlyPriceId;
    if (!priceId) throw new Error("Missing Price ID for this plan.");

    const operationKey = `${pendingPlan}:${billingInterval}`;
    if (subscriptionOperationRef.current?.key !== operationKey) {
      subscriptionOperationRef.current = { key: operationKey, id: crypto.randomUUID() };
    }
    const operationId = subscriptionOperationRef.current.id;
    const response = await fetch("/api/stripe/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        priceId,
        planId: pendingPlan,
        interval: billingInterval,
        operationId,
        paymentMethodId: options.paymentMethodId,
        billingDetails: options.billingDetails,
      }),
    });

    let result = await response.json().catch(() => null) as (SubscriptionActionResult & { error?: string }) | null;
    if (!result) throw new Error("Stripe returned an unreadable subscription response.");
    if ("error" in result && result.error) throw new Error(result.error);
    if (result.status === "requires_payment_method") throw new Error(result.message);

    if (result.status === "requires_action") {
      if (!stripe) throw new Error("Stripe.js is required for 3D Secure verification.");
      const { error: confirmationError, paymentIntent } = await stripe.confirmCardPayment(result.clientSecret);
      if (confirmationError) throw new Error(confirmationError.message || "3D Secure authentication failed.");
      if (!paymentIntent || (paymentIntent.status !== "succeeded" && paymentIntent.status !== "processing")) {
        throw new Error("3D Secure authentication did not complete.");
      }

      const finalizeResponse = await fetch("/api/stripe/subscribe/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: result.subscriptionId, operationId }),
      });
      result = await finalizeResponse.json().catch(() => null) as (SubscriptionActionResult & { error?: string }) | null;
      if (!result) throw new Error("Stripe returned an unreadable finalization response.");
      if ("error" in result && result.error) throw new Error(result.error);
      if (result.status === "requires_payment_method") throw new Error(result.message);
      if (result.status === "requires_action") throw new Error("Stripe requires another authentication step. Please retry.");
    }

    setSubscriptionResult(result);
    if (result.status === "active" || result.status === "scheduled") {
      subscriptionOperationRef.current = null;
    }
    if (result.status === "active") {
      onSuccess?.(`${result.plan} access is active. Review disabled API keys before enabling any of them.`);
    } else if (result.status === "scheduled") {
      onSuccess?.(`${result.targetPlan} is scheduled for the end of the current billing period.`);
    } else {
      onSuccess?.("Stripe is still processing the subscription. Refresh Billing before relying on paid access.");
    }
    setView("success");
  };

  const handleCancelAction = async () => {
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

      await scheduleCancellation([]);
      onSuccess?.("Cancellation scheduled. Your paid access remains active until the end of the current billing period.");
      onClose();
    } catch {
      onError?.("Failed to schedule cancellation. Please try again.");
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

      const authorizePaymentMethod = async () => {
        const response = await fetch("/api/stripe/create-setup-intent", { method: "POST" });
        const setup = await response.json() as { clientSecret?: string; error?: string };
        if (!response.ok || !setup.clientSecret) {
          throw new Error(setup.error || "Failed to create setup intent.");
        }

        const { setupIntent, error: stripeError } = await stripe.confirmCardSetup(setup.clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: { name: formValues.name },
          },
        });
        if (stripeError) throw new Error(stripeError.message || "Failed to authorize credit card.");
        if (!setupIntent || setupIntent.status !== "succeeded" || typeof setupIntent.payment_method !== "string") {
          throw new Error("Setup authorization failed.");
        }
        return setupIntent.payment_method;
      };

      if (!pendingPlan) {
        // SCENARIO 1: Save a customer-bound SetupIntent payment method.
        const paymentMethodId = await authorizePaymentMethod();

        // 2. Make the verified customer-owned method the default.
        const saveRes = await fetch("/api/stripe/save-payment-method", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentMethodId,
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

        onSuccess?.("Payment method updated and saved.");
        setView("overview");
      } else {
        // SCENARIO 2: Upgrades use the same customer-bound SetupIntent proof.
        const paymentMethodId = await authorizePaymentMethod();

        await completeSubscription({
          paymentMethodId,
          billingDetails,
        });

        setCardData((current) => ({
          ...current,
          name: formValues.name,
          street: formValues.street,
          city: formValues.city,
          state: formValues.state,
          zip: formValues.zip,
          country: formValues.country,
        }));

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

  const handleKeyDowngradeConfirm = async (keysToKeep: string[]) => {
    setIsLoading(true);
    try {
      await scheduleCancellation(keysToKeep);
      onSuccess?.("Cancellation scheduled. Your paid access and selected key state remain active until the current billing period ends.");
      onClose();
    } catch {
      onError?.("Failed to schedule downgrade. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecutePlanChange = async () => {
    if (!pendingPlan) return;

    setIsLoading(true);
    try {
      // Hobby changes use the cancellation route; paid changes use the
      // server-authoritative subscription operation below.
      if (pendingPlan === "Hobby") {
        await scheduleCancellation([]);
        onSuccess?.("Cancellation scheduled. Your paid access remains active until the end of the current billing period.");
        onClose();
        return;
      }

      await completeSubscription();
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
      const defaultPaymentMethod = paymentMethods?.find((method) => method.isDefault) || paymentMethods?.[0];
      if (!defaultPaymentMethod) throw new Error("No payment method is available to remove.");
      const response = await fetch("/api/stripe/delete-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId: defaultPaymentMethod.id }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error || "Failed to remove payment method.");
      }
      setCardData(prev => ({ ...prev, number: "", brand: "", expiry: "" }));
      onSuccess?.("Payment method removed successfully.");
      setView("overview");
    } catch {
      onError?.("Failed to remove payment method.");
    } finally {
      setIsLoading(false);
    }
  };

  const modalSize = isInitializing
    ? "sm"
    : (view === "update-payment" || view === "success" || view === "plan-change-review")
    ? "xl"
    : (view === "key-downgrade-selector" || view === "cancel-confirm")
    ? "lg"
    : "md";

  return (
    <ModalFrame
      open={isOpen}
      onClose={onClose}
      size={modalSize}
      titleId="subscription-modal-title"
      className="p-0 sm:p-0 overflow-hidden border-[var(--command-border-strong)] bg-[var(--command-panel-solid)] text-[var(--command-text)]"
    >
      {isInitializing ? (
        <div className="flex flex-col items-center justify-center gap-6 p-12">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/5 border-t-white" />
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500 text-center">Checking Plan Limits...</p>
        </div>
      ) : (
        <div key={view} className="max-h-[calc(100dvh-1.5rem)] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-500 sm:max-h-[calc(100dvh-3rem)]">
          {/* Adaptive Header: Rose-red for destructive actions, slate for plan management flows */}
          <div className={`relative overflow-hidden border-b border-white/5 p-6 transition-all duration-300 sm:p-8 ${(view === 'cancel-confirm' || view === 'remove-card-confirm')
            ? 'bg-rose-950/40 text-white'
            : 'bg-slate-950 text-white'}`}>
            <ModalCloseButton
              onClick={onClose}
              className="absolute right-3 top-3 z-30 text-white/45 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:right-5 sm:top-5"
            />

            <div className="relative z-10 space-y-2 pr-12 sm:pr-14">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">
                {view === "overview" ? "Subscription" : view === "change-plan" ? "Select New Plan" : view === "update-payment" ? (pendingPlan ? (PLAN_RANKS[pendingPlan as keyof typeof PLAN_RANKS] > PLAN_RANKS[planName as keyof typeof PLAN_RANKS] ? "Complete Upgrade" : "Complete Downgrade") : "Billing Details") : view === "success" ? "Billing Result" : view === "plan-change-review" ? "Review Plan Change" : view === "remove-card-confirm" ? "Confirm Removal" : view === "key-downgrade-selector" ? "Hobby Plan Limit" : "Confirm Cancellation"}
              </p>
              <h3 id="subscription-modal-title" className="font-serif text-3xl font-bold italic tracking-tight text-white sm:text-5xl">
                {view === "overview" ? planName : view === "change-plan" ? "Choose a Plan" : view === "update-payment" ? (pendingPlan ? "Payment Details" : "Payment Info") : view === "success" ? "Stripe Update" : view === "plan-change-review" ? "Confirm Switch" : view === "remove-card-confirm" ? "Remove Card?" : view === "key-downgrade-selector" ? "Select Keys" : "Cancel Plan?"}
              </h3>
            </div>

            {view === "overview" && planName !== "Hobby" && (
              <div className="relative z-10 mt-8 flex items-baseline gap-2">
                <span className="text-5xl font-bold tracking-tighter sm:text-6xl">{currentPlan.price}</span>
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
                <OrderSummary pendingPlan={pendingPlan} billingInterval={billingInterval} />
              </div>
            ) : view === "success" ? (
              subscriptionResult ? (
                <SuccessView result={subscriptionResult} user={user || null} onClose={onClose} />
              ) : (
                <p role="status" className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-5 text-sm leading-6 text-amber-100">
                  No verified Stripe result is available. Close this dialog and refresh Billing before relying on a plan change.
                </p>
              )
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
                hasCard={false}
                onConfirm={handleKeyDowngradeConfirm}
                onBack={onClose}
              />
            ) : view === "cancel-confirm" ? (
              <CancelConfirmation
                isLoading={isLoading}
                hasCard={false}
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
                nextBillingDate={nextBillingDate}
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
    </ModalFrame>
  );
}
