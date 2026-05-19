"use client";

import { useState } from "react";
import { PLANS } from "@/lib/constants";
import Link from "next/link";
import { SubscriptionModal } from "@/components/dashboard/SubscriptionModal";

import { Session } from "@supabase/supabase-js";

export function PricingSection({ 
  session, 
  onSuccess, 
  onError 
}: { 
  session: Session | null,
  onSuccess?: (msg: string) => void,
  onError?: (msg: string) => void
}) {
  const activeSession = session;
  const currentPlanId = (activeSession?.user?.user_metadata as { plan?: string })?.plan || "Hobby";

  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const currentPlan = PLANS.find(p => p.id === currentPlanId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [keysToKeep, setKeysToKeep] = useState<string[]>([]);
  const [modalInitialView, setModalInitialView] = useState<"overview" | "cancel-confirm" | "update-payment" | "plan-change-review">("overview");
  const [modalPendingPlan, setModalPendingPlan] = useState<string | null>(null);
  const [userKeys, setUserKeys] = useState<{id: string, name: string, usage_count: number}[]>([]);
  
  const fetchKeys = async () => {
    try {
      const res = await fetch("/api/keys");
      const data = await res.json();
      if (Array.isArray(data)) setUserKeys(data);
    } catch (err) {
      console.error("Failed to fetch keys:", err);
    }
  };

  const handleUpdatePlan = async (planId: string) => {
    // Unified Downgrade Flow: Intercept move to Hobby
    if (planId === "Hobby" && currentPlanId !== "Hobby") {
      await fetchKeys();
      setIsModalOpen(false);
      setIsCancelModalOpen(true);
      return;
    }

    setLoadingPlanId(planId);
    try {
      // Upgrading or Switching between paid plans -> show review screen
      if (planId !== "Hobby" && planId !== currentPlanId) {
        setModalInitialView("plan-change-review");
        setModalPendingPlan(planId);
        setIsModalOpen(true);
        return;
      }

      // Default: show review screen
      setModalInitialView("plan-change-review");
      setModalPendingPlan(planId);
      setIsModalOpen(true);
    } finally {
      setLoadingPlanId(null);
    }
  };

  return (
    <section id="pricing" className="bg-white/50 py-24 md:py-40 backdrop-blur-sm border-y border-zinc-200">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-20 text-center space-y-8">
          <div className="space-y-4">
            <h2 className="font-serif text-4xl font-bold md:text-5xl">Simple, transparent <br /> pricing for builders.</h2>
            <p className="text-zinc-500">Start for free, scale as you grow.</p>
          </div>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span className={`text-xs font-bold uppercase tracking-widest ${billingInterval === "month" ? "text-zinc-900" : "text-zinc-400"}`}>Monthly</span>
            <button 
              onClick={() => setBillingInterval(billingInterval === "month" ? "year" : "month")}
              className="relative h-6 w-12 rounded-full bg-zinc-200 p-1 transition-colors hover:bg-zinc-300"
            >
              <div className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${billingInterval === "year" ? "translate-x-6" : "translate-x-0"}`} />
            </button>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-widest ${billingInterval === "year" ? "text-zinc-900" : "text-zinc-400"}`}>Annual</span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-600 uppercase tracking-widest">20% OFF</span>
            </div>
          </div>
        </div>

        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = currentPlanId === plan.id;
            const isUpgrade = currentPlan && plan.level > currentPlan.level;
            const isLoading = loadingPlanId === plan.id;
            const displayPrice = billingInterval === "year" && plan.yearlyPrice ? plan.yearlyPrice : plan.price;

            return (
              <div 
                key={plan.id}
                className={`group relative flex flex-col rounded-[40px] border p-10 transition-all hover:scale-[1.02] ${plan.className}`}
              >
                {plan.recommended && (
                  <div className="absolute top-6 right-8 rounded-full bg-zinc-900 px-3 py-1 text-[8px] font-black text-white uppercase tracking-widest">
                    Most Recommended
                  </div>
                )}
                <div className="mb-8 space-y-2">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-5xl font-bold tracking-tighter ${plan.priceColor}`}>{displayPrice}</span>
                    <span className={`text-xs font-medium uppercase tracking-widest ${plan.labelColor}`}>/ mo</span>
                  </div>
                  {billingInterval === "year" && plan.id !== "Hobby" && (
                    <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-500 italic">Billed annually</p>
                  )}
                  <p className={`text-sm font-medium ${plan.textColor}`}>{plan.credits}</p>
                </div>

                <div className="mb-10 flex-1 border-t border-zinc-100 pt-8 space-y-4">
                  <ul className="space-y-4">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm font-medium">
                        <div className={`flex h-5 w-5 items-center justify-center rounded-full ${plan.dark ? "bg-white/10 text-white" : "bg-zinc-50 text-zinc-900"}`}>
                          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
                            <path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <span className={plan.dark ? "text-zinc-300" : "text-zinc-600"}>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {activeSession ? (
                  <button
                    onClick={() => handleUpdatePlan(plan.id)}
                    disabled={isCurrent || isLoading}
                    className={`w-full rounded-full py-4 text-[10px] font-black uppercase tracking-widest transition-all ${
                      isCurrent 
                        ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                        : plan.dark
                        ? "bg-white text-zinc-900 hover:bg-zinc-100 shadow-xl shadow-white/5"
                        : "bg-zinc-900 text-white hover:bg-zinc-800 shadow-xl shadow-zinc-900/10"
                    }`}
                  >
                    {isLoading ? (
                      <div className="mx-auto h-3 w-3 animate-spin rounded-full border-2 border-zinc-400 border-t-white" />
                    ) : isCurrent ? "Current Plan" : isUpgrade ? "Upgrade Now" : "Downgrade"}
                  </button>
                ) : (
                  <Link
                    href="/signup"
                    className={`w-full rounded-full py-4 text-center text-[10px] font-black uppercase tracking-widest transition-all ${
                      plan.dark
                      ? "bg-white text-zinc-900 hover:bg-zinc-100 shadow-xl shadow-white/5"
                      : "bg-zinc-900 text-white hover:bg-zinc-800 shadow-xl shadow-zinc-900/10"
                    }`}
                  >
                    Get Started
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      <SubscriptionModal 
        key={isModalOpen ? "open" : "closed"}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        planName={currentPlanId || "Hobby"}
        onSuccess={onSuccess}
        onError={onError}
        initialView={modalInitialView}
        initialPendingPlan={modalPendingPlan}
        initialBillingInterval={billingInterval}
        onDowngrade={() => { setIsModalOpen(false); setIsCancelModalOpen(true); }}
      />

      {/* Unified Cancel Subscription Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
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
                Your <span className="font-bold text-zinc-900">{currentPlanId}</span> plan will remain active until the end of your current term. After that, you&apos;ll be downgraded to the Hobby plan.
              </p>

              <div className="mb-8 w-full space-y-4 rounded-3xl border border-zinc-100 bg-zinc-50/50 p-6 text-left">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Step 1: Choose 3 Keys to Keep</p>
                  <p className="mt-1 text-[11px] text-zinc-500">The Hobby plan only supports 3 active API keys. Please select your favorites.</p>
                </div>
                
                <div className="grid gap-2">
                  {userKeys.map(key => {
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
                  {userKeys.length === 0 && (
                    <div className="py-4 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-400 italic">No keys found</div>
                  )}
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
                  disabled={keysToKeep.length !== 3 && userKeys.length >= 3}
                  onClick={async () => {
                    try {
                      setLoadingPlanId("cancel");
                      const res = await fetch("/api/stripe/cancel-subscription", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ keysToKeep }),
                      });
                      if (res.ok) {
                        setIsCancelModalOpen(false);
                        onSuccess?.("Subscription scheduled for cancellation.");
                        window.location.reload();
                      } else {
                        throw new Error("Failed to cancel subscription.");
                      }
                    } catch {
                      onError?.("Failed to cancel subscription.");
                    } finally {
                      setLoadingPlanId(null);
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
    </section>
  );
}
