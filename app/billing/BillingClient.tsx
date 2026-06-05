"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { PlanHero } from "@/components/billing/PlanHero";
import { PlanComparison } from "@/components/billing/PlanComparison";
import { PaymentMethodCard } from "@/components/billing/PaymentMethodCard";
import { InvoiceTable, type Invoice } from "@/components/billing/InvoiceTable";
import { SubscriptionModal } from "@/components/dashboard/SubscriptionModal";
import { getPlanLimits } from "@/lib/constants";
import { computeSidebarAlerts } from "@/lib/alerts";



type BillingData = {
  plan: string;
  totalUsage: number;
  resetDate: string | null;
  nextInvoiceDate: string | null;
  keys: {
    id: string;
    name: string;
    is_active: boolean;
    usage_count: number;
    monthly_limit: number | null;
    alert_threshold: number | null;
    alert_channels: string[] | null;
    dailyTrend?: { date: string; count: number }[];
  }[];
  paymentMethods: { id: string; brand: string; last4: string; expiry: string; isDefault: boolean }[] | null;
  customerBalance?: number | null;
};


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
  const [cardToDelete, setCardToDelete] = useState<{ id: string; brand: string; last4: string } | null>(null);
  const { toast, showToast } = useToast();

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
      showToast("error", "Failed to load billing information.");
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
    } catch {
      showToast("error", "Failed to update default payment method.");
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
    } catch {
      showToast("error", "Failed to remove card.");
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
  const currentPlan = currentData?.plan || (activeUser?.user_metadata as { plan?: string })?.plan || "Hobby";
  const billingInterval = (activeUser?.user_metadata as { billing_interval?: "month" | "year" })?.billing_interval || "month";
  
  const { monthlyLimit: currentLimit, isUnlimited } = getPlanLimits(currentPlan);

  const alerts = computeSidebarAlerts(currentData?.keys || []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialView, setModalInitialView] = useState<"overview" | "cancel-confirm" | "update-payment" | "plan-change-review">("overview");
  const [modalPendingPlan, setModalPendingPlan] = useState<string | null>(null);
  const [modalBillingInterval, setModalBillingInterval] = useState<"month" | "year">(billingInterval);

  const handleUpgrade = (planId: string, interval?: "month" | "year") => {
    if (interval) setModalBillingInterval(interval);
    
    // Unified Downgrade Flow: Intercept any move to Hobby and show the premium Key Selection Modal
    if (planId === "Hobby" && currentPlan !== "Hobby") {
      setModalPendingPlan("Hobby");
      setModalInitialView("overview"); // The modal's useEffect will handle the redirection to the audit view
      setIsModalOpen(true);
      return;
    }

    // 1. Upgrading from Hobby to a paid plan -> show payment details for that plan
    if (currentPlan === "Hobby" && planId !== "Hobby") {
      setModalInitialView("plan-change-review");
      setModalPendingPlan(planId);
      setIsModalOpen(true);
      return;
    }

    // 2. Switching between paid plans -> show review screen
    if (currentPlan !== "Hobby" && planId !== "Hobby" && planId !== currentPlan) {
      setModalInitialView("plan-change-review");
      setModalPendingPlan(planId);
      setIsModalOpen(true);
      return;
    }
  };

  const showSkeleton = isLoading && !initialData;

  return (
    <>
      <DashboardShell
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
            eyebrow="Account / Financials"
            title="Billing"
            description="Manage subscription plans, invoices, and payment methods."
          />

          {showSkeleton ? (
            <div className="space-y-8 animate-pulse">
              <div className="h-64 rounded-[32px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800" />
              <div className="h-96 rounded-[32px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800" />
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
              />

              {/* Payment Methods */}
              <section className="space-y-6">
                <div className="flex flex-col gap-3 px-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-serif text-2xl font-bold">Wallet</h3>
                  <button 
                    disabled={isLoading}
                    onClick={() => {
                      setModalInitialView("update-payment");
                      setModalPendingPlan(null);
                      setIsModalOpen(true);
                    }}
                    className="text-[10px] font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100 hover:underline disabled:opacity-50"
                  >
                    + Add Card
                  </button>
                </div>
                <div className="grid min-w-0 gap-6 lg:grid-cols-3">
                  {/* Primary Card - Takes more space or visual weight */}
                  <div className={`${currentData?.paymentMethods?.some(pm => !pm.isDefault) ? 'lg:col-span-2' : 'lg:col-span-3 max-w-4xl'} flex min-w-0 flex-col`}>
                    <div className="flex h-6 items-center px-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Primary Method</p>
                    </div>
                    <div className="mt-4 flex-1">
                      {currentData?.paymentMethods?.find(pm => pm.isDefault) ? (
                        <PaymentMethodCard 
                          brand={currentData.paymentMethods.find(pm => pm.isDefault)!.brand}
                          last4={currentData.paymentMethods.find(pm => pm.isDefault)!.last4}
                          expiryMonth={parseInt(currentData.paymentMethods.find(pm => pm.isDefault)!.expiry.split('/')[0])}
                          expiryYear={parseInt(currentData.paymentMethods.find(pm => pm.isDefault)!.expiry.split('/')[1])}
                          isDefault={true}
                          onDelete={() => {
                            const pm = currentData!.paymentMethods!.find(p => p.isDefault)!;
                            setCardToDelete({ id: pm.id, brand: pm.brand, last4: pm.last4 });
                          }} 
                          onSetDefault={() => {}} 
                        />
                      ) : (
                        <div className="flex h-[180px] items-center justify-center rounded-[32px] border border-dashed border-zinc-200 bg-zinc-50/50 text-center">
                          <p className="text-sm font-medium text-zinc-500">No primary payment method.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Secondary Cards - Apple Wallet Stack Layout */}
                  {currentData?.paymentMethods?.some(pm => !pm.isDefault) && (
                    <div className="flex flex-col">
                      <div className="flex h-6 items-center justify-between px-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Secondary Methods</p>
                        {currentData?.paymentMethods && currentData.paymentMethods.filter(pm => !pm.isDefault).length > 1 && (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                const secondaryMethods = currentData.paymentMethods!.filter(pm => !pm.isDefault);
                                setSecondaryIndex(prev => (prev - 1 + secondaryMethods.length) % secondaryMethods.length);
                              }}
                              className="rounded-full border border-zinc-200 p-1 text-zinc-400 hover:border-zinc-900 hover:text-zinc-900 transition-all"
                            >
                              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
                                <path d="M15 19l-7-7 7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                            <button 
                              onClick={() => {
                                const secondaryMethods = currentData.paymentMethods!.filter(pm => !pm.isDefault);
                                setSecondaryIndex(prev => (prev + 1) % secondaryMethods.length);
                              }}
                              className="rounded-full border border-zinc-200 p-1 text-zinc-400 hover:border-zinc-900 hover:text-zinc-900 transition-all"
                            >
                              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
                                <path d="M9 5l7 7-7 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <div className="relative mt-4 h-[180px] w-full overflow-hidden" style={{ perspective: '1000px' }}>
                        {currentData.paymentMethods.filter(pm => !pm.isDefault).map((pm, idx) => {
                          const methods = currentData.paymentMethods!.filter(pm => !pm.isDefault);
                          const length = methods.length;
                          const relativeIdx = (idx - secondaryIndex + length) % length;
                          const isVisible = relativeIdx <= 3 || relativeIdx >= length - 1;

                          return (
                            <div 
                              key={pm.id} 
                              className="absolute top-0 left-0 w-full transition-[transform,opacity,filter] duration-800 cubic-bezier(0.19, 1, 0.22, 1)"
                              style={{
                                willChange: 'transform, opacity, filter',
                                transform: `translateX(${relativeIdx * 30}px) translateZ(${-relativeIdx * 60}px) scale(${1 - relativeIdx * 0.08})`,
                                zIndex: length - relativeIdx,
                                opacity: Math.max(0, 1 - (relativeIdx * 0.25)),
                                filter: relativeIdx > 0 ? `blur(${relativeIdx * 0.8}px)` : 'none',
                                pointerEvents: relativeIdx === 0 ? 'auto' : 'none',
                                visibility: isVisible ? 'visible' : 'hidden'
                              }}
                            >
                              <div className="transform scale-[0.85] origin-top-left">
                                <PaymentMethodCard 
                                  brand={pm.brand}
                                  last4={pm.last4}
                                  expiryMonth={parseInt(pm.expiry.split('/')[0])}
                                  expiryYear={parseInt(pm.expiry.split('/')[1])}
                                  isDefault={false}
                                  onDelete={() => setCardToDelete({ id: pm.id, brand: pm.brand, last4: pm.last4 })} 
                                  onSetDefault={() => handleSetDefault(pm.id)} 
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
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
                  <h3 className="font-serif text-2xl font-bold">Transaction History</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Past 12 Months</p>
                </div>
                <InvoiceTable invoices={invoices} isLoading={isInvoicesLoading} />
              </section>

              {/* Danger Zone */}
              {currentPlan !== "Hobby" && (
                <section className="mt-12 mb-20 rounded-[28px] border border-red-100 bg-red-50/30 p-5 dark:border-red-950/20 dark:bg-red-950/5 sm:p-8 md:rounded-[32px]">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-red-900 dark:text-red-400">Danger Zone</h3>
                      <p className="mt-1 text-xs text-red-600/60 dark:text-red-400/40">Cancel your premium subscription and downgrade to the Hobby plan at the end of your term.</p>
                    </div>
                    <button 
                      onClick={() => {
                        setModalPendingPlan("Hobby");
                        setIsModalOpen(true);
                      }}
                      className="rounded-2xl border border-red-200 dark:border-red-950/30 bg-white dark:bg-zinc-900 px-8 py-4 text-[10px] font-black uppercase tracking-widest text-red-500 dark:text-red-400 transition-all hover:bg-red-500 hover:text-white dark:hover:bg-red-500 dark:hover:text-white"
                    >
                      Cancel Subscription
                    </button>
                  </div>
                </section>
              )}
            </>
          )}
      </DashboardShell>

      <SubscriptionModal 
        key={isModalOpen ? "open" : "closed"}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        planName={currentPlan}
        nextBillingDate={data?.nextInvoiceDate}
        initialView={modalInitialView}
        initialPendingPlan={modalPendingPlan}
        initialBillingInterval={modalBillingInterval}
        onSuccess={(msg) => {
          showToast("success", msg);
          fetchBillingData(); // Refresh data after any subscription change
        }}
        onError={(msg) => showToast("error", msg)}
      />

      {/* Remove Card Confirmation Modal */}
      {cardToDelete && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-zinc-950/40 p-3 backdrop-blur-sm transition-all duration-300 sm:items-center sm:p-6">
          <div className="my-3 w-full max-w-md max-h-[calc(100dvh-1.5rem)] scale-95 transform overflow-y-auto rounded-[28px] border border-zinc-200 bg-white p-6 shadow-2xl transition-all duration-300 sm:my-0 sm:max-h-[calc(100dvh-3rem)] sm:rounded-[32px] sm:p-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-red-500">Warning / Security</p>
                <h3 className="font-serif text-2xl font-bold tracking-tight text-zinc-900">Remove Payment Method?</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Are you sure you want to remove the <strong className="text-zinc-900">{cardToDelete.brand}</strong> card ending in <strong className="text-zinc-900">•••• {cardToDelete.last4}</strong>? 
                  {cardToDelete.id === data?.paymentMethods?.find(pm => pm.isDefault)?.id && (
                    <span className="block mt-2 text-red-500 font-medium">
                      ⚠️ Note: This is your primary payment method. Removing it may disrupt active subscriptions unless a secondary method is set.
                    </span>
                  )}
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setCardToDelete(null)}
                  className="flex-1 rounded-2xl border border-zinc-200 bg-white py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 transition-all hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeletePayment(cardToDelete.id)}
                  className="flex-1 rounded-2xl bg-red-500 py-4 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-red-600 shadow-lg shadow-red-500/10"
                >
                  Remove Card
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} />
    </>
  );
}
