"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { User } from "@supabase/supabase-js";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { useToast } from "@/hooks/useToast";
import { useSubscriptionFlow } from "@/hooks/useSubscriptionFlow";
import { Toast } from "@/components/ui/Toast";
import { GuidedError } from "@/components/ui/GuidedError";
import { PlanHero } from "@/components/billing/PlanHero";
import { PlanComparison } from "@/components/billing/PlanComparison";
import { PaymentMethodCard } from "@/components/billing/PaymentMethodCard";
import { InvoiceTable } from "@/components/billing/InvoiceTable";
import { SubscriptionModal } from "@/components/dashboard/SubscriptionModal";
import { CommandPanel, ModalFrame, StatusPill } from "@/components/command";
import { getPlanLimits } from "@/lib/constants";
import { computeSidebarAlerts } from "@/lib/alerts";
import { getToastErrorMessage } from "@/lib/error-guidance";
import type { BillingData, Invoice } from "@/types/billing";

type ReturnStatus = { tone: "success" | "info"; message: string } | null;

export default function BillingClient({
  initialUser,
  initialInvoices = [],
  initialData = null,
}: {
  initialUser: User | null;
  initialInvoices?: Invoice[];
  initialData?: BillingData | null;
}) {
  const [data, setData] = useState<BillingData | null>(initialData);
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [isLoading, setIsLoading] = useState(initialData === null);
  const [isInvoicesLoading, setIsInvoicesLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [cardToDelete, setCardToDelete] = useState<{ id: string; brand: string; last4: string } | null>(null);
  const [returnStatus, setReturnStatus] = useState<ReturnStatus>(null);
  const hasHandledReturn = useRef(false);
  const isHydrated = useRef(initialData !== null);
  const { toast, showToast } = useToast();

  const fetchInvoices = useCallback(async () => {
    setIsInvoicesLoading(true);
    try {
      const response = await fetch("/api/stripe/invoices");
      if (!response.ok) throw new Error("Invoice history is temporarily unavailable.");
      const json = await response.json();
      setInvoices(Array.isArray(json.invoices) ? json.invoices : []);
      setInvoiceError(null);
    } catch {
      setInvoiceError("Invoice history is temporarily unavailable.");
    } finally {
      setIsInvoicesLoading(false);
    }
  }, []);

  const fetchBillingData = useCallback(async () => {
    try {
      if (!isHydrated.current) setIsLoading(true);
      const response = await fetch("/api/usage");
      if (!response.ok) throw new Error("Billing information is temporarily unavailable.");
      const json = await response.json();
      setData(json);
      setBillingError(null);
      isHydrated.current = false;
      void fetchInvoices();
    } catch {
      const message = "Billing information is temporarily unavailable.";
      setBillingError(message);
      showToast("error", getToastErrorMessage("billing", message));
    } finally {
      setIsLoading(false);
    }
  }, [fetchInvoices, showToast]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success") === "true";
    const canceled = params.get("canceled") === "true";
    if ((!success && !canceled) || hasHandledReturn.current) return;

    hasHandledReturn.current = true;
    params.delete("success");
    params.delete("canceled");
    const query = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    setReturnStatus(success
      ? { tone: "success", message: "Payment completed. Dandi is confirming your updated subscription." }
      : { tone: "info", message: "Checkout was canceled. No billing changes were made." });
    if (success) window.setTimeout(() => void fetchBillingData(), 700);
  }, [fetchBillingData]);

  useEffect(() => {
    const delay = initialData ? 1000 : 0;
    const timer = window.setTimeout(() => void fetchBillingData(), delay);
    return () => window.clearTimeout(timer);
  }, [fetchBillingData, initialData]);

  const handleSetDefault = async (paymentMethodId: string) => {
    try {
      const response = await fetch("/api/stripe/set-default-payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentMethodId }) });
      if (!response.ok) throw new Error("Failed to update default payment method.");
      await fetchBillingData();
      showToast("success", "Default payment method updated.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update default payment method.";
      showToast("error", getToastErrorMessage("billing", message));
    }
  };

  const handleDeletePayment = async (paymentMethodId: string) => {
    try {
      const response = await fetch("/api/stripe/delete-payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentMethodId }) });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to remove card.");
      }
      await fetchBillingData();
      setCardToDelete(null);
      showToast("success", "Payment method removed.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to remove card.";
      showToast("error", getToastErrorMessage("billing", message));
    }
  };

  const currentData = data || initialData;
  const currentPlan = currentData?.plan || (initialUser?.user_metadata as { plan?: string } | undefined)?.plan || "Hobby";
  const billingInterval = currentData?.billingInterval || (initialUser?.user_metadata as { billing_interval?: "month" | "year" } | undefined)?.billing_interval || "month";
  const paymentMethods = currentData?.paymentMethods || [];
  const defaultPaymentMethod = paymentMethods.find((method) => method.isDefault);
  const secondaryPaymentMethods = paymentMethods.filter((method) => !method.isDefault);
  const { monthlyLimit: currentLimit, isUnlimited } = getPlanLimits(currentPlan);
  const alerts = computeSidebarAlerts(currentData?.keys || []);
  const subscriptionFlow = useSubscriptionFlow({ initialBillingInterval: billingInterval });
  const hasNoBillingProfile = currentPlan === "Hobby" && paymentMethods.length === 0 && invoices.length === 0;
  const showSkeleton = isLoading && !initialData;

  const handlePlanChange = (planId: string, interval: "month" | "year") => {
    subscriptionFlow.launchBillingPlan({ planId, currentPlan, interval });
  };

  const openDeleteConfirmation = (method: { id: string; brand: string; last4: string }) => setCardToDelete(method);
  const expiryParts = (expiry: string) => {
    const [month, year] = expiry.split("/").map(Number);
    return { month, year };
  };

  return (
    <>
      <DashboardShell variant="billing" sidebar={{ totalUsage: currentData?.totalUsage || 0, plan: currentPlan, limit: currentLimit, isUnlimited, alerts, onUpdate: fetchBillingData }}>
        <DashboardPageHeader eyebrow="Account / Billing" title="Billing & Plans" description="Manage your subscription, payment methods, invoices, and future plan changes." />

        <div className="mt-6 space-y-8 pb-16 sm:mt-8 sm:space-y-10">
          {returnStatus && <div role="status" className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-medium ${returnStatus.tone === "success" ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100" : "border-cyan-300/20 bg-cyan-300/10 text-cyan-100"}`}><span className="mt-0.5" aria-hidden="true">{returnStatus.tone === "success" ? "✓" : "i"}</span><span>{returnStatus.message}</span><button type="button" onClick={() => setReturnStatus(null)} className="ml-auto text-xs text-current/60 hover:text-current" aria-label="Dismiss billing update message">Dismiss</button></div>}

          {showSkeleton ? <BillingSkeleton /> : !currentData ? <GuidedError category="Internal server" title="Billing information is unavailable" explanation="We could not load your plan, usage, or payment information. No billing changes were made." nextAction="Refresh Billing to try again." possibleCauses={["Billing service temporarily unavailable", "Your session needs to be refreshed"]} onAction={fetchBillingData} actionLabel="Refresh Billing" /> : <>
            {billingError && <GuidedError category="Internal server" title="Billing could not refresh" explanation="The information below is the last successfully loaded billing state. No billing changes were made." nextAction="Refresh Billing when the service is available." onAction={fetchBillingData} actionLabel="Refresh Billing" compact />}

            <PlanHero plan={currentPlan} limit={currentLimit} usage={currentData.totalUsage || 0} resetDate={currentData.resetDate ?? null} nextBillingDate={currentData.nextInvoiceDate ?? null} isUnlimited={isUnlimited} billingInterval={billingInterval} customerBalance={currentData.customerBalance ?? null} scheduledPlan={currentData.scheduledPlan} scheduledPlanDate={currentData.scheduledPlanDate} subscriptionStatus={currentData.subscriptionStatus} cancelAtPeriodEnd={currentData.cancelAtPeriodEnd} onManageSubscription={() => subscriptionFlow.openModal({ view: "overview" })} />

            <section id="plans" aria-label="Plan comparison" className="space-y-6">
              <PlanComparison currentPlan={currentPlan} scheduledPlan={currentData.scheduledPlan} onUpgrade={handlePlanChange} billingInterval={billingInterval} />
            </section>

            <section aria-label="Payment methods" className="space-y-6">
              <SectionHeading eyebrow="Payment infrastructure" title="Payment methods" description="Securely stored with Stripe. Dandi only displays the card brand, last four digits, and expiry." action={<button type="button" onClick={subscriptionFlow.openPaymentMethod} className="min-h-10 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100 transition hover:bg-emerald-300/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">Add payment method</button>} />
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                <CommandPanel className="min-w-0 p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Default payment method</p><p className="mt-1 text-xs text-slate-400">Used for renewals and paid plan changes.</p></div>{defaultPaymentMethod && <StatusPill tone="success" compact>Ready for billing</StatusPill>}</div>
                  {defaultPaymentMethod ? <div className="mt-5">{(() => { const expiry = expiryParts(defaultPaymentMethod.expiry); return <PaymentMethodCard brand={defaultPaymentMethod.brand} last4={defaultPaymentMethod.last4} expiryMonth={expiry.month} expiryYear={expiry.year} isDefault onDelete={() => openDeleteConfirmation(defaultPaymentMethod)} onSetDefault={() => undefined} />; })()}</div> : <EmptyPaymentState hasNoBillingProfile={hasNoBillingProfile} onAdd={subscriptionFlow.openPaymentMethod} />}
                </CommandPanel>
                <CommandPanel className="min-w-0 p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Other saved methods</p><p className="mt-1 text-xs text-slate-400">Choose a default or remove an unused method.</p></div><span className="font-mono text-xs text-slate-500">{secondaryPaymentMethods.length}</span></div>{secondaryPaymentMethods.length > 0 ? <div className="mt-5 space-y-3">{secondaryPaymentMethods.map((method) => { const expiry = expiryParts(method.expiry); return <PaymentMethodCard key={method.id} brand={method.brand} last4={method.last4} expiryMonth={expiry.month} expiryYear={expiry.year} onDelete={() => openDeleteConfirmation(method)} onSetDefault={() => handleSetDefault(method.id)} />; })}</div> : <p className="mt-6 rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-xs font-medium text-slate-500">No secondary payment methods.</p>}</CommandPanel>
              </div>
            </section>

            <section aria-label="Billing history" className="space-y-6">
              <SectionHeading eyebrow="Receipts and statements" title="Billing history" description="Your latest Stripe invoices and payment documents." action={<StatusPill tone="info" compact>Last 12 invoices</StatusPill>} />
              {invoiceError && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm font-medium text-amber-100"><span>Invoice history is temporarily unavailable. Your plan and payment methods are unaffected.</span><button type="button" onClick={fetchInvoices} className="rounded-full border border-amber-200/25 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-amber-100 hover:bg-amber-200/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200">Retry</button></div>}
              <InvoiceTable invoices={invoices} isLoading={isInvoicesLoading} />
            </section>

            {currentPlan !== "Hobby" && !currentData.cancelAtPeriodEnd && <CommandPanel tone="danger" className="p-5 sm:p-6"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-200/80">Subscription management</p><h3 className="mt-2 text-lg font-bold text-white">Need to step back?</h3><p className="mt-1 max-w-xl text-sm leading-6 text-rose-100/65">Cancellation keeps your current benefits active through the current billing term and requires confirmation.</p></div><button type="button" onClick={subscriptionFlow.openCancellation} className="min-h-11 shrink-0 rounded-full border border-rose-300/25 bg-rose-300/10 px-5 text-[10px] font-black uppercase tracking-[0.14em] text-rose-100 transition hover:bg-rose-300/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300">Cancel subscription</button></div></CommandPanel>}
          </>}
        </div>
      </DashboardShell>

      <SubscriptionModal key={subscriptionFlow.isModalOpen ? "open" : "closed"} isOpen={subscriptionFlow.isModalOpen} onClose={subscriptionFlow.closeModal} planName={currentPlan} nextBillingDate={currentData?.nextInvoiceDate} initialView={subscriptionFlow.modalInitialView} initialPendingPlan={subscriptionFlow.modalPendingPlan} initialBillingInterval={subscriptionFlow.modalBillingInterval} onSuccess={(message) => { showToast("success", message); void fetchBillingData(); }} onError={(message) => showToast("error", getToastErrorMessage("billing", message))} />

      {cardToDelete && <ModalFrame open onClose={() => setCardToDelete(null)} size="md" titleId="remove-card-modal-title"><div className="space-y-6"><div className="border-b border-white/5 pb-6"><p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-rose-400">Payment method</p><h3 id="remove-card-modal-title" className="mt-2 font-serif text-2xl font-bold tracking-tight text-white">Remove payment method?</h3><p className="mt-2 text-sm leading-6 text-slate-400">Remove the <strong className="text-slate-200">{cardToDelete.brand}</strong> card ending in <strong className="text-slate-200">•••• {cardToDelete.last4}</strong>?{cardToDelete.id === defaultPaymentMethod?.id && <span className="mt-2 block text-rose-200">This is your default method. Removing it may affect renewals unless another method is available.</span>}</p></div><div className="flex flex-col-reverse gap-3 sm:flex-row"><button type="button" onClick={() => setCardToDelete(null)} className="min-h-12 flex-1 rounded-full border border-white/10 bg-white/[0.04] text-[10px] font-black uppercase tracking-[0.14em] text-slate-300 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300">Keep method</button><button type="button" onClick={() => void handleDeletePayment(cardToDelete.id)} className="min-h-12 flex-1 rounded-full bg-rose-600 text-[10px] font-black uppercase tracking-[0.14em] text-white hover:bg-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300">Remove method</button></div></div></ModalFrame>}
      <Toast toast={toast} />
    </>
  );
}

function BillingSkeleton() {
  return <div className="space-y-8 animate-pulse motion-reduce:animate-none"><div className="h-[480px] rounded-[32px] border border-white/5 bg-slate-950/40" /><div className="h-[520px] rounded-[32px] border border-white/5 bg-slate-950/40" /></div>;
}

function SectionHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="flex flex-col gap-4 px-1 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300/70">{eyebrow}</p><h2 className="mt-2 font-serif text-3xl font-bold tracking-tight text-white">{title}</h2><p className="mt-2 text-sm font-medium leading-6 text-slate-400">{description}</p></div>{action}</div>;
}

function EmptyPaymentState({ hasNoBillingProfile, onAdd }: { hasNoBillingProfile: boolean; onAdd: () => void }) {
  return <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-black/10 p-6 text-center"><p className="text-sm font-bold text-white">No payment method yet.</p><p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-400">{hasNoBillingProfile ? "A billing profile is created securely through Stripe when you add a card or begin a paid plan." : "Add a payment method before upgrading so future renewals can complete without interruption."}</p><button type="button" onClick={onAdd} className="mt-5 min-h-10 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100 hover:bg-emerald-300/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">Add payment method</button></div>;
}
