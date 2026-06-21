"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { useToast } from "@/hooks/useToast";
import { useSubscriptionFlow } from "@/hooks/useSubscriptionFlow";
import { Toast } from "@/components/ui/Toast";
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


export default function BillingClient({
  initialUser,
  initialInvoices = [],
  initialData = null
}: {
  initialUser: User | null,
  initialInvoices?: Invoice[],
  initialData?: BillingData | null
}) {
  const activeUser = initialUser;
  const hasRefreshed = useRef(false);

  const [data, setData] = useState<BillingData | null>(initialData);
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [isLoading, setIsLoading] = useState(initialData === null);
  const [isInvoicesLoading, setIsInvoicesLoading] = useState(false);
  const isHydrated = useRef(initialData !== null);
  const [secondaryIndex, setSecondaryIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return false;
  });
  const [cardToDelete, setCardToDelete] = useState<{ id: string; brand: string; last4: string } | null>(null);
  const { toast, showToast } = useToast();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, []);

  const fetchInvoices = useCallback(async () => {
    try {
      setIsInvoicesLoading(true);
      const res = await fetch("/api/stripe/invoices");
      if (res.ok) {
        const json = await res.json();
        setInvoices(json.invoices);
      }
    } catch (err) {
      console.error("Error fetching invoices:", err);
    } finally {
      setIsInvoicesLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check for success param to refresh session (only once)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("success") === "true" && !hasRefreshed.current) {
      hasRefreshed.current = true;

      // Clean up URL IMMEDIATELY to prevent loops on re-render/refresh
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);

      // Small delay to allow session provider to stabilize
      const timer = setTimeout(() => {
        window.location.reload();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, []);

  const fetchBillingData = useCallback(async () => {
    try {
      if (!isHydrated.current) {
        setIsLoading(true);
      }
      const res = await fetch("/api/usage"); // Reusing this for totalUsage/plan limits
      const json = await res.json();
      setData(json);
      isHydrated.current = false;
      fetchInvoices();
    } catch (err) {
      console.error(err);
      showToast("error", getToastErrorMessage("billing", "Failed to load billing information."));
    } finally {
      setIsLoading(false);
    }
  }, [showToast, fetchInvoices]);

  const handleSetDefault = async (pmId: string) => {
    try {
      const res = await fetch("/api/stripe/set-default-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId: pmId }),
      });
      if (res.ok) {
        await fetchBillingData();
        showToast("success", "Default payment method updated.");
      } else {
        throw new Error("Failed to update default payment method.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update default payment method.";
      showToast("error", getToastErrorMessage("billing", message));
    }
  };

  const handleDeletePayment = async (pmId: string) => {
    try {
      const res = await fetch("/api/stripe/delete-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId: pmId }),
      });
      if (res.ok) {
        await fetchBillingData();
        setCardToDelete(null);
        showToast("success", "Card removed successfully.");
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to remove card.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to remove card.";
      showToast("error", getToastErrorMessage("billing", message));
    }
  };

  useEffect(() => {
    const delay = initialData ? 1000 : 0;
    const timer = setTimeout(() => {
      fetchBillingData();
    }, delay);
    return () => clearTimeout(timer);
  }, [fetchBillingData, initialData]);

  const currentData = data || initialData;
  const paymentMethods = currentData?.paymentMethods || [];
  const defaultPaymentMethod = paymentMethods.find(pm => pm.isDefault);
  const secondaryPaymentMethods = paymentMethods.filter(pm => !pm.isDefault);
  const secondaryCount = secondaryPaymentMethods.length;
  const safeSecondaryIndex = secondaryCount > 0 ? Math.min(secondaryIndex, secondaryCount - 1) : 0;
  const activeSecondaryPosition = secondaryCount > 0 ? safeSecondaryIndex + 1 : 0;
  const currentPlan = currentData?.plan || (activeUser?.user_metadata as { plan?: string })?.plan || "Hobby";
  const billingInterval = (activeUser?.user_metadata as { billing_interval?: "month" | "year" })?.billing_interval || "month";

  const { monthlyLimit: currentLimit, isUnlimited } = getPlanLimits(currentPlan);

  const alerts = computeSidebarAlerts(currentData?.keys || []);

  const subscriptionFlow = useSubscriptionFlow({ initialBillingInterval: billingInterval });

  const handleUpgrade = (planId: string, interval?: "month" | "year") => {
    subscriptionFlow.launchBillingPlan({ planId, currentPlan, interval });
  };

  const handleDeckKeyDown = (e: React.KeyboardEvent) => {
    if (secondaryCount <= 1) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      setSecondaryIndex(prev => (prev + 1) % secondaryCount);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      setSecondaryIndex(prev => (prev - 1 + secondaryCount) % secondaryCount);
    }
  };

  const showSkeleton = isLoading && !initialData;

  return (
    <>
      <DashboardShell
        variant="billing"
        sidebar={{
          totalUsage: currentData?.totalUsage || 0,
          plan: currentPlan,
          limit: currentLimit,
          isUnlimited,
          alerts,
          onUpdate: fetchBillingData,
        }}
      >
          <DashboardPageHeader
            eyebrow="Account / Billing"
            title="Billing"
            description="Manage subscription plans, invoices, and payment methods."
          />

          {showSkeleton ? (
            <div className="space-y-8 animate-pulse">
              <div className="h-64 rounded-[32px] bg-slate-950/40 border border-white/5" />
              <div className="h-96 rounded-[32px] bg-slate-950/40 border border-white/5" />
            </div>
          ) : (
            <>
              {/* Plan Hero */}
              <PlanHero
                plan={currentPlan}
                limit={currentLimit}
                usage={currentData?.totalUsage || 0}
                nextBillingDate={currentData?.nextInvoiceDate ?? null}
                isUnlimited={isUnlimited}
                billingInterval={billingInterval}
                customerBalance={currentData?.customerBalance ?? null}
                scheduledPlan={currentData?.scheduledPlan}
                scheduledPlanDate={currentData?.scheduledPlanDate}
              />

              {/* Payment Methods */}
              <section className="space-y-6">
                <div className="flex flex-col gap-3 px-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300/70">Payment Methods</p>
                    <h3 className="mt-1 font-serif text-2xl font-bold text-white">Wallet</h3>
                  </div>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={subscriptionFlow.openPaymentMethod}
                    className="inline-flex min-h-10 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 text-[10px] font-black uppercase tracking-widest text-emerald-100 transition-all hover:border-emerald-300/45 hover:bg-emerald-300/20 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                  >
                    + Add Card
                  </button>
                </div>
                <div className="grid min-w-0 gap-5 sm:gap-6 lg:grid-cols-3">
                  {/* Primary Card - Takes more space or visual weight */}
                  <div className={`${secondaryCount > 0 ? 'lg:col-span-2' : 'lg:col-span-3 max-w-4xl'} flex min-w-0 flex-col`}>
                    <div className="flex h-6 items-center px-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Primary Method</p>
                    </div>
                    <div className="mt-4 flex-1">
                      {defaultPaymentMethod ? (
                        <PaymentMethodCard
                          brand={defaultPaymentMethod.brand}
                          last4={defaultPaymentMethod.last4}
                          expiryMonth={parseInt(defaultPaymentMethod.expiry.split('/')[0])}
                          expiryYear={parseInt(defaultPaymentMethod.expiry.split('/')[1])}
                          isDefault={true}
                          onDelete={() => {
                            setCardToDelete({ id: defaultPaymentMethod.id, brand: defaultPaymentMethod.brand, last4: defaultPaymentMethod.last4 });
                          }}
                          onSetDefault={() => {}}
                        />
                      ) : (
                        <CommandPanel className="flex min-h-[220px] items-center justify-center border-dashed p-6 text-center">
                          <div className="max-w-md">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300/70">Payment Method</p>
                            <h3 className="mt-2 font-serif text-xl font-bold text-white">No primary card saved.</h3>
                            <p className="mt-2 text-sm font-medium leading-6 text-slate-400">
                              Add a payment method before upgrading so plan changes and renewals can complete without interruption.
                            </p>
                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={subscriptionFlow.openPaymentMethod}
                              className="mt-5 inline-flex min-h-10 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100 transition hover:border-emerald-300/45 hover:bg-emerald-300/15 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Add Card
                            </button>
                          </div>
                        </CommandPanel>
                      )}
                    </div>
                  </div>

                  {/* Secondary Cards - Apple Wallet Stack Layout */}
                  {secondaryCount > 0 && (
                    <div className="flex min-w-0 flex-col">
                      <div className="flex min-h-6 flex-wrap items-center justify-between gap-2 px-2">
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Secondary Methods</p>
                          {secondaryCount > 1 && (
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[10px] font-bold text-slate-300">
                              {activeSecondaryPosition} of {secondaryCount}
                            </span>
                          )}
                        </div>
                        {secondaryCount > 1 && !prefersReducedMotion && (
                          <div className="flex gap-2" aria-label="Secondary card deck controls">
                            <button
                              type="button"
                              onClick={() => {
                                setSecondaryIndex(prev => (prev - 1 + secondaryCount) % secondaryCount);
                              }}
                              aria-label="Previous secondary card"
                              className="rounded-full border border-white/10 bg-slate-950/70 p-1.5 text-slate-400 transition-all hover:border-emerald-300/30 hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 cursor-pointer"
                            >
                              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
                                <path d="M15 19l-7-7 7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSecondaryIndex(prev => (prev + 1) % secondaryCount);
                              }}
                              aria-label="Next secondary card"
                              className="rounded-full border border-white/10 bg-slate-950/70 p-1.5 text-slate-400 transition-all hover:border-emerald-300/30 hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 cursor-pointer"
                            >
                              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
                                <path d="M9 5l7 7-7 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>

                      {prefersReducedMotion ? (
                        <div className="mt-4 space-y-4 max-h-[380px] overflow-y-auto pr-1.5 command-scroll">
                          {secondaryPaymentMethods.map((pm) => (
                            <div key={pm.id} className="w-full">
                              <PaymentMethodCard
                                brand={pm.brand}
                                last4={pm.last4}
                                expiryMonth={parseInt(pm.expiry.split('/')[0])}
                                expiryYear={parseInt(pm.expiry.split('/')[1])}
                                isDefault={false}
                                isActive={true}
                                onDelete={() => setCardToDelete({ id: pm.id, brand: pm.brand, last4: pm.last4 })}
                                onSetDefault={() => handleSetDefault(pm.id)}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div
                          className="relative mt-4 h-[250px] w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:h-[260px]"
                          onKeyDown={handleDeckKeyDown}
                          tabIndex={secondaryCount > 1 ? 0 : -1}
                          role="region"
                          aria-label="Secondary payment methods card deck. Use arrow keys to rotate cards."
                        >
                          {secondaryPaymentMethods.map((pm, idx) => {
                            const length = secondaryCount;
                            const relativeIdx = (idx - safeSecondaryIndex + length) % length;
                            const isVisible = relativeIdx <= 2 || relativeIdx >= length - 1;
                            const isActive = relativeIdx === 0;

                            return (
                              <div
                                key={pm.id}
                                className="absolute top-0 left-0 w-full transition-all duration-500 ease-out motion-reduce:transition-none"
                                style={{
                                  willChange: isActive ? 'transform, opacity' : 'auto',
                                  transform: `translateY(${relativeIdx * 14}px) scale(${1 - relativeIdx * 0.04})`,
                                  zIndex: length - relativeIdx,
                                  opacity: Math.max(0, 1 - (relativeIdx * 0.2)),
                                  visibility: isVisible ? 'visible' : 'hidden'
                                }}
                              >
                                <div className="origin-top-left transform scale-[0.92] sm:scale-[0.88]">
                                  <PaymentMethodCard
                                    brand={pm.brand}
                                    last4={pm.last4}
                                    expiryMonth={parseInt(pm.expiry.split('/')[0])}
                                    expiryYear={parseInt(pm.expiry.split('/')[1])}
                                    isDefault={false}
                                    isActive={isActive}
                                    onClick={() => setSecondaryIndex(idx)}
                                    onFocus={() => setSecondaryIndex(idx)}
                                    onDelete={() => setCardToDelete({ id: pm.id, brand: pm.brand, last4: pm.last4 })}
                                    onSetDefault={() => handleSetDefault(pm.id)}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* Plan Switcher */}
              <section className="space-y-6">
                <PlanComparison
                  currentPlan={currentPlan}
                  onUpgrade={handleUpgrade}
                  billingInterval={billingInterval}
                />
              </section>

              {/* History */}
              {/* Transaction History Section */}
              <section className="space-y-6 pb-12">
                <div className="flex flex-col gap-2 px-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-serif text-2xl font-bold text-white">Transaction History</h3>
                  <StatusPill tone="info" compact>Past 12 Months</StatusPill>
                </div>
                <InvoiceTable invoices={invoices} isLoading={isInvoicesLoading} />
              </section>

              {/* Danger Zone */}
              {currentPlan !== "Hobby" && (
                <CommandPanel className="mt-12 mb-20 border-red-400/20 bg-red-950/10 p-5 sm:p-8">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-red-300">Danger Zone</h3>
                      <p className="mt-1 text-xs text-red-200/55">Cancel your premium subscription and downgrade to the Hobby plan at the end of your term.</p>
                    </div>
                    <button
                      type="button"
                      onClick={subscriptionFlow.openCancellation}
                      className="rounded-2xl border border-red-400/20 bg-red-400/10 px-8 py-4 text-[10px] font-black uppercase tracking-widest text-red-200 transition-all hover:bg-red-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                    >
                      Cancel Subscription
                    </button>
                  </div>
                </CommandPanel>
              )}
            </>
          )}
      </DashboardShell>

      <SubscriptionModal
        key={subscriptionFlow.isModalOpen ? "open" : "closed"}
        isOpen={subscriptionFlow.isModalOpen}
        onClose={subscriptionFlow.closeModal}
        planName={currentPlan}
        nextBillingDate={data?.nextInvoiceDate}
        initialView={subscriptionFlow.modalInitialView}
        initialPendingPlan={subscriptionFlow.modalPendingPlan}
        initialBillingInterval={subscriptionFlow.modalBillingInterval}
        onSuccess={(msg) => {
          showToast("success", msg);
          fetchBillingData(); // Refresh data after any subscription change
        }}
        onError={(msg) => showToast("error", getToastErrorMessage("billing", msg))}
      />

      {/* Remove Card Confirmation Modal */}
      {cardToDelete && (
        <ModalFrame open={true} onClose={() => setCardToDelete(null)} size="md" titleId="remove-card-modal-title">
          <div className="space-y-6">
            <div className="border-b border-white/5 pb-6">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-rose-400">Payment Method</p>
              <h3 id="remove-card-modal-title" className="mt-2 font-serif text-2xl font-bold tracking-tight text-white">Remove Payment Method?</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Are you sure you want to remove the <strong className="text-slate-200">{cardToDelete.brand}</strong> card ending in <strong className="text-slate-200">•••• {cardToDelete.last4}</strong>?
                {cardToDelete.id === data?.paymentMethods?.find(pm => pm.isDefault)?.id && (
                  <span className="block mt-2 text-rose-300 font-medium">
                    This is your primary payment method. Removing it may affect active subscriptions unless another method is available.
                  </span>
                )}
              </p>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setCardToDelete(null)}
                className="flex-1 rounded-full border border-white/10 bg-slate-900/60 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all hover:bg-white/5 hover:text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeletePayment(cardToDelete.id)}
                className="flex-1 rounded-full bg-rose-600 py-4 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-rose-700 shadow-lg shadow-rose-500/15 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Remove Card
              </button>
            </div>
          </div>
        </ModalFrame>
      )}

      <Toast toast={toast} />
    </>
  );
}
