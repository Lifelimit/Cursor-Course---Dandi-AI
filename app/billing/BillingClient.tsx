"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import type { Session } from "next-auth";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { PlanHero } from "@/components/billing/PlanHero";
import { PlanComparison } from "@/components/billing/PlanComparison";
import { PaymentMethodCard } from "@/components/billing/PaymentMethodCard";
import { InvoiceTable, type Invoice } from "@/components/billing/InvoiceTable";
import { SubscriptionModal } from "@/components/dashboard/SubscriptionModal";


type BillingData = {
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
};


export default function BillingClient({ 
  initialSession, 
  initialInvoices = [] 
}: { 
  initialSession: Session | null, 
  initialInvoices?: Invoice[] 
}) {
  const { data: session, update } = useSession();
  const activeSession = initialSession || session;
  const hasRefreshed = useRef(false);
  
  const [data, setData] = useState<BillingData | null>(null);
  const [invoices] = useState(initialInvoices);
  const [isLoading, setIsLoading] = useState(true);
  const [secondaryIndex, setSecondaryIndex] = useState(0);
  const [cardToDelete, setCardToDelete] = useState<{ id: string; brand: string; last4: string } | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [keysToKeep, setKeysToKeep] = useState<string[]>([]);
  const { toast, showToast } = useToast();

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
        update();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [update]);

  const fetchBillingData = useCallback(async () => {
    try {
      const res = await fetch("/api/usage"); // Reusing this for totalUsage/plan limits
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
      showToast("error", "Failed to load billing information.");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBillingData();
  }, [fetchBillingData]);

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
    } catch (_err) {
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
    } catch (_err) {
      showToast("error", "Failed to remove card.");
    }
  };

  const currentPlan = activeSession?.user?.plan || "Hobby";
  const billingInterval = (activeSession?.user as { billing_interval?: "month" | "year" })?.billing_interval || "month";
  
  const PLAN_LIMITS = { Hobby: 1000, Premium: 5000, Researcher: 1000000 };
  const currentLimit = PLAN_LIMITS[currentPlan as keyof typeof PLAN_LIMITS] || 1000;
  const isUnlimited = currentPlan === "Researcher";

  const alerts = (data?.keys || [])
    .filter(k => k.is_active && k.alert_threshold !== null && k.alert_channels?.includes('in-page'))
    .map(k => {
      const pct = k.monthly_limit ? (k.usage_count / k.monthly_limit) * 100 : 0;
      return { 
        id: k.id, 
        keyName: k.name, 
        pct, 
        threshold: k.alert_threshold!,
        currentLimit: k.monthly_limit || 1000,
        dailyTrend: k.dailyTrend || []
      };
    })
    .filter(a => a.pct >= a.threshold);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialView, setModalInitialView] = useState<"overview" | "cancel-confirm" | "update-payment" | "plan-change-review">("overview");
  const [modalPendingPlan, setModalPendingPlan] = useState<string | null>(null);
  const [modalBillingInterval, setModalBillingInterval] = useState<"month" | "year">(billingInterval);

  const handleUpgrade = (planId: string, interval?: "month" | "year") => {
    if (interval) setModalBillingInterval(interval);
    
    // Unified Downgrade Flow: Intercept any move to Hobby and show the premium Key Selection Modal
    if (planId === "Hobby" && currentPlan !== "Hobby") {
      setIsModalOpen(false); // Close the plan selection modal if it's open
      setIsCancelModalOpen(true);
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

  return (
    <div className="min-h-screen bg-[#f4f2ed] text-[#18181b] selection:bg-zinc-200">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col items-start gap-8 p-6 md:flex-row md:py-12">
        <Sidebar 
          totalUsage={data?.totalUsage || 0} 
          plan={currentPlan} 
          limit={currentLimit} 
          isUnlimited={isUnlimited} 
          alerts={alerts}
          onUpdate={fetchBillingData}
        />
        
        <main className="min-w-0 flex-1 space-y-12">
          {/* Header */}
          <div className="rounded-[32px] border border-zinc-200 bg-white/50 p-8 backdrop-blur-sm">
            <div className="space-y-1">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">Account / Financials</p>
              <h1 className="font-serif text-5xl font-bold tracking-tight">Billing</h1>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-8 animate-pulse">
              <div className="h-64 rounded-[32px] bg-white border border-zinc-200" />
              <div className="h-96 rounded-[32px] bg-white border border-zinc-200" />
            </div>
          ) : (
            <>
              {/* Plan Hero */}
              <PlanHero 
                plan={currentPlan}
                limit={currentLimit}
                usage={data?.totalUsage || 0}
                nextBillingDate={data?.nextInvoiceDate ?? null}
                isUnlimited={isUnlimited}
                billingInterval={billingInterval}
              />

              {/* Payment Methods */}
              <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <h3 className="font-serif text-2xl font-bold">Wallet</h3>
                  <button 
                    disabled={isLoading}
                    onClick={async () => {
                      setIsLoading(true);
                      try {
                        const res = await fetch("/api/stripe/setup-session", { method: "POST" });
                        const { url } = await res.json();
                        if (url) window.location.href = url;
                      } catch (_err) {
                        showToast("error", "Failed to initiate payment setup.");
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    className="text-[10px] font-black uppercase tracking-widest text-zinc-900 hover:underline disabled:opacity-50"
                  >
                    {isLoading ? "Redirecting..." : "+ Add Card"}
                  </button>
                </div>
                <div className="grid gap-6 lg:grid-cols-3">
                  {/* Primary Card - Takes more space or visual weight */}
                  <div className="lg:col-span-2">
                    {data?.paymentMethods?.find(pm => pm.isDefault) ? (
                      <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Primary Method</p>
                        <PaymentMethodCard 
                          brand={data.paymentMethods.find(pm => pm.isDefault)!.brand}
                          last4={data.paymentMethods.find(pm => pm.isDefault)!.last4}
                          expiryMonth={parseInt(data.paymentMethods.find(pm => pm.isDefault)!.expiry.split('/')[0])}
                          expiryYear={parseInt(data.paymentMethods.find(pm => pm.isDefault)!.expiry.split('/')[1])}
                          isDefault={true}
                          onDelete={() => {
                            const pm = data!.paymentMethods!.find(p => p.isDefault)!;
                            setCardToDelete({ id: pm.id, brand: pm.brand, last4: pm.last4 });
                          }} 
                          onSetDefault={() => {}} 
                        />
                      </div>
                    ) : (
                      <div className="rounded-[32px] border border-dashed border-zinc-200 bg-zinc-50/50 p-12 text-center">
                        <p className="text-sm font-medium text-zinc-500">No primary payment method.</p>
                      </div>
                    )}
                  </div>

                  {/* Secondary Cards - Apple Wallet Stack Layout */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Secondary Methods</p>
                      {data?.paymentMethods && data.paymentMethods.filter(pm => !pm.isDefault).length > 1 && (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              const secondaryMethods = data.paymentMethods!.filter(pm => !pm.isDefault);
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
                              const secondaryMethods = data.paymentMethods!.filter(pm => !pm.isDefault);
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
                    
                    <div className="relative h-[180px] w-full" style={{ perspective: '1000px' }}>
                      {data?.paymentMethods?.filter(pm => !pm.isDefault).length ? (
                        data.paymentMethods.filter(pm => !pm.isDefault).map((pm, idx) => {
                          const methods = data.paymentMethods!.filter(pm => !pm.isDefault);
                          const length = methods.length;
                          
                          // Calculate relative index for circular behavior
                          // This ensures the active card is at 0, next at 1, last at length-1
                          const relativeIdx = (idx - secondaryIndex + length) % length;
                          
                          // Only show cards that are "ahead" or just "behind"
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
                        })
                      ) : (
                        <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-zinc-200 bg-zinc-50/30">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 italic">No secondary cards</p>
                        </div>
                      )}
                    </div>
                  </div>
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
                <div className="flex items-center justify-between px-2">
                  <h3 className="font-serif text-2xl font-bold">Transaction History</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Past 12 Months</p>
                </div>
                <InvoiceTable invoices={invoices} />
              </section>

              {/* Danger Zone */}
              {currentPlan !== "Hobby" && (
                <section className="rounded-[32px] border border-red-100 bg-red-50/30 p-8 mt-12 mb-20">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-red-900">Danger Zone</h3>
                      <p className="mt-1 text-xs text-red-600/60">Cancel your premium subscription and downgrade to the Hobby plan at the end of your term.</p>
                    </div>
                    <button 
                      onClick={() => setIsCancelModalOpen(true)}
                      className="rounded-2xl border border-red-200 bg-white px-8 py-4 text-[10px] font-black uppercase tracking-widest text-red-500 transition-all hover:bg-red-500 hover:text-white"
                    >
                      Cancel Subscription
                    </button>
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      {cardToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div 
            className="absolute inset-0 bg-zinc-900/40 backdrop-blur-md transition-opacity"
            onClick={() => setCardToDelete(null)}
          />
          <div className="relative w-full max-w-md scale-up-center overflow-hidden rounded-[32px] border border-zinc-200 bg-white p-8 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
                <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor">
                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              
              <h3 className="mb-2 text-xl font-black tracking-tight text-zinc-900">Remove Card?</h3>
              <p className="mb-8 text-sm leading-relaxed text-zinc-500">
                Are you sure you want to remove your <span className="font-bold text-zinc-900">{cardToDelete.brand}</span> ending in <span className="font-mono font-bold text-zinc-900">{cardToDelete.last4}</span>? This action cannot be undone.
              </p>
              
              <div className="flex w-full gap-3">
                <button 
                  onClick={() => setCardToDelete(null)}
                  className="flex-1 rounded-2xl border border-zinc-200 py-4 text-xs font-black uppercase tracking-widest text-zinc-400 transition-all hover:bg-zinc-50 hover:text-zinc-900"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleDeletePayment(cardToDelete.id)}
                  className="flex-1 rounded-2xl bg-red-500 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-red-500/20 transition-all hover:bg-red-600 hover:shadow-red-600/30"
                >
                  Remove Card
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Subscription Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div 
            className="absolute inset-0 bg-zinc-900/40 backdrop-blur-md transition-opacity"
            onClick={() => setIsCancelModalOpen(false)}
          />
          <div className="relative w-full max-w-lg scale-up-center overflow-hidden rounded-[32px] border border-zinc-200 bg-white p-10 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
                <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor">
                  <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              
              <h3 className="mb-2 text-2xl font-black tracking-tight text-zinc-900">Cancel Subscription?</h3>
              <p className="mb-8 text-sm leading-relaxed text-zinc-500">
                Your <span className="font-bold text-zinc-900">{currentPlan}</span> plan will remain active until <span className="font-bold text-zinc-900">{new Date(data?.nextInvoiceDate || "").toLocaleDateString()}</span>. After that, you'll be downgraded to the Hobby plan.
              </p>

              <div className="mb-8 w-full space-y-4 rounded-3xl border border-zinc-100 bg-zinc-50/50 p-6 text-left">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Step 1: Choose 3 Keys to Keep</p>
                  <p className="mt-1 text-[11px] text-zinc-500">The Hobby plan only supports 3 active API keys. Please select your favorites.</p>
                </div>
                
                <div className="grid gap-2">
                  {(data?.keys || []).map(key => {
                    const isSelected = keysToKeep.includes(key.id);
                    return (
                      <button
                        key={key.id}
                        onClick={() => {
                          if (isSelected) {
                            setKeysToKeep(prev => prev.filter(id => id !== key.id));
                          } else if (keysToKeep.length < 3) {
                            setKeysToKeep(prev => [...prev, key.id]);
                          }
                        }}
                        className={`flex items-center justify-between rounded-xl border p-4 transition-all ${
                          isSelected 
                            ? 'border-zinc-900 bg-zinc-900 text-white shadow-md' 
                            : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400'
                        }`}
                      >
                        <div className="text-left">
                          <p className="text-xs font-bold">{key.name}</p>
                          <p className={`text-[9px] ${isSelected ? 'text-zinc-400' : 'text-zinc-400'}`}>{key.usage_count} requests this month</p>
                        </div>
                        {isSelected && (
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
                            <path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div className="flex w-full gap-3">
                <button 
                  onClick={() => setIsCancelModalOpen(false)}
                  className="flex-1 rounded-2xl border border-zinc-200 py-4 text-xs font-black uppercase tracking-widest text-zinc-400 transition-all hover:bg-zinc-50 hover:text-zinc-900"
                >
                  Go Back
                </button>
                <button 
                  disabled={keysToKeep.length !== 3 && (data?.keys?.length || 0) >= 3}
                  onClick={async () => {
                    try {
                      setIsLoading(true);
                      const res = await fetch("/api/stripe/cancel-subscription", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ keysToKeep }),
                      });
                      if (res.ok) {
                        setIsCancelModalOpen(false);
                        await fetchBillingData();
                        showToast("success", "Subscription scheduled for cancellation.");
                      } else {
                        throw new Error("Failed to cancel subscription.");
                      }
                    } catch (_err) {
                      showToast("error", "Failed to cancel subscription.");
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  className="flex-1 rounded-2xl bg-zinc-900 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-zinc-900/20 transition-all hover:bg-black disabled:opacity-50"
                >
                  Confirm Downgrade
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <SubscriptionModal 
        key={isModalOpen ? "open" : "closed"}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        planName={currentPlan}
        initialView={modalInitialView}
        initialPendingPlan={modalPendingPlan}
        initialBillingInterval={modalBillingInterval}
        onSuccess={(msg) => showToast("success", msg)}
        onError={(msg) => showToast("error", msg)}
        onDowngrade={() => { setIsModalOpen(false); setIsCancelModalOpen(true); }}
      />

      <Toast toast={toast} />
    </div>
  );
}
