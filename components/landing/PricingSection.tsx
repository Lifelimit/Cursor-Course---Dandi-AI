"use client";

import { useState, useEffect } from "react";
import { PLANS } from "@/lib/constants";
import Link from "next/link";
import { SubscriptionModal } from "@/components/dashboard/SubscriptionModal";

import { Session } from "@supabase/supabase-js";

const SLIDER_STEPS = [
  { label: "1,000", value: 1000, plan: "Hobby", keys: "3 active API keys", info: "Ideal for personal exploration, sandbox setups, and side projects.", labelDetails: "1,000 repository summaries" },
  { label: "2,500", value: 2500, plan: "Premium", keys: "10 active API keys", info: "Built for active developers requiring detailed usage logs and CSV exports.", labelDetails: "2,500 repository summaries" },
  { label: "5,000", value: 5000, plan: "Premium", keys: "10 active API keys", info: "Built for active developers requiring detailed usage logs and CSV exports.", labelDetails: "5,000 repository summaries" },
  { label: "7,500", value: 7500, plan: "Researcher", keys: "Unlimited active keys", info: "Engineered for intense analytical research and production integrations.", labelDetails: "7,500 repository summaries" },
  { label: "10,000+", value: 10000, plan: "Researcher", keys: "Unlimited active keys", info: "Engineered for intense analytical research and production integrations.", labelDetails: "10,000+ repository summaries" },
];

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
  
  // Stateful plan status
  const [currentPlanId, setCurrentPlanId] = useState<string>(
    (activeSession?.user?.user_metadata as { plan?: string })?.plan || "Hobby"
  );

  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
  const [sliderIndex, setSliderIndex] = useState<number>(0);
  const activeSliderStep = SLIDER_STEPS[sliderIndex];

  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const currentPlan = PLANS.find(p => p.id === currentPlanId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [keysToKeep, setKeysToKeep] = useState<string[]>([]);
  const [modalInitialView, setModalInitialView] = useState<"overview" | "cancel-confirm" | "update-payment" | "plan-change-review">("overview");
  const [modalPendingPlan, setModalPendingPlan] = useState<string | null>(null);
  const [userKeys, setUserKeys] = useState<{id: string, name: string, usage_count: number}[]>([]);

  // Function to load the absolute source of truth directly from database
  const fetchFreshPlan = async () => {
    if (!activeSession) return;
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const json = await res.json();
        if (json.plan) {
          setCurrentPlanId(json.plan);
        }
      }
    } catch (err) {
      console.error("Failed to load fresh plan:", err);
    }
  };

  // Synchronize on load and when session changes
  useEffect(() => {
    if (activeSession) {
      const metaPlan = (activeSession.user?.user_metadata as { plan?: string })?.plan || "Hobby";
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentPlanId(metaPlan);
      fetchFreshPlan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession]);
  
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
    <section id="pricing" className="bg-white/50 dark:bg-zinc-900/50 py-24 md:py-40 backdrop-blur-sm border-y border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-20 text-center space-y-8">
          <div className="space-y-4">
            <h2 className="font-serif text-4xl font-bold md:text-5xl">Simple, transparent <br /> pricing for builders.</h2>
            <p className="text-zinc-500 dark:text-zinc-400">Start for free, scale as you grow.</p>
          </div>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span className={`text-xs font-bold uppercase tracking-widest ${billingInterval === "month" ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500"}`}>Monthly</span>
            <button 
              onClick={() => setBillingInterval(billingInterval === "month" ? "year" : "month")}
              className="relative h-6 w-12 rounded-full bg-zinc-200 dark:bg-zinc-800 p-1 transition-colors hover:bg-zinc-300 dark:hover:bg-zinc-700"
            >
              <div className={`h-4 w-4 rounded-full bg-white dark:bg-zinc-100 shadow-sm transition-transform ${billingInterval === "year" ? "translate-x-6" : "translate-x-0"}`} />
            </button>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-widest ${billingInterval === "year" ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500"}`}>Annual</span>
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/30 px-2.5 py-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">20% OFF</span>
            </div>
          </div>

          {/* Volume Calculator Slider */}
          <div className="mx-auto max-w-xl mt-12 p-4 sm:p-6 md:p-8 rounded-[32px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 backdrop-blur-sm shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1 text-left">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-400 dark:text-zinc-500">Volume Estimator</p>
                <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{activeSliderStep.labelDetails} / mo</h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Fits perfectly in the <span className="font-bold text-emerald-500 dark:text-emerald-400">{activeSliderStep.plan}</span> plan</p>
              </div>
              <div className="rounded-2xl bg-zinc-100/50 dark:bg-zinc-800/40 px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 text-left font-sans">
                <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Key Limits</p>
                <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">{activeSliderStep.keys}</p>
                <p className="text-[8px] text-zinc-400 dark:text-zinc-500 mt-0.5">included in selection</p>
              </div>
            </div>

            <div className="space-y-4">
              <input 
                type="range" 
                min="0" 
                max="4" 
                value={sliderIndex}
                onChange={(e) => setSliderIndex(parseInt(e.target.value))}
                className="w-full h-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
              />
              <div className="flex justify-between text-[8px] sm:text-[9px] font-bold uppercase tracking-wider sm:tracking-widest text-zinc-400 dark:text-zinc-500 px-1">
                {SLIDER_STEPS.map((step, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setSliderIndex(idx)}
                    className={`transition-colors ${sliderIndex === idx ? "text-zinc-900 dark:text-white" : "hover:text-zinc-700"}`}
                  >
                    {step.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-[#f4f2ed]/50 dark:bg-zinc-950/50 p-4 border border-zinc-100 dark:border-zinc-800/40 text-left flex gap-3 items-center">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Capacity Guidance</p>
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mt-0.5">{activeSliderStep.info}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = currentPlanId === plan.id;
            const isUpgrade = currentPlan && plan.level > currentPlan.level;
            const isLoading = loadingPlanId === plan.id;
            const displayPrice = billingInterval === "year" && plan.yearlyPrice ? plan.yearlyPrice : plan.price;

            // Generate clean classes for dark mode
            const isRecommendedByVolume = activeSliderStep.plan === plan.id;
            const usageRecommendationClass = isRecommendedByVolume && !isCurrent
              ? "ring-2 ring-zinc-300 ring-offset-4 ring-offset-white scale-[1.03] z-10 shadow-2xl dark:ring-zinc-700 dark:ring-offset-zinc-950"
              : "";
            const baseContainerClass = plan.dark
              ? `border-zinc-200 dark:border-zinc-800 bg-zinc-950 text-white ${usageRecommendationClass}`
              : plan.id === "Premium"
              ? `border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl dark:shadow-none ${usageRecommendationClass}`
              : `border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm dark:shadow-none ${usageRecommendationClass}`;
            const containerClass = isCurrent
              ? "border-2 border-emerald-400 bg-white text-zinc-900 shadow-2xl shadow-emerald-500/10 ring-1 ring-emerald-400 dark:border-emerald-500 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-emerald-500"
              : baseContainerClass;

            const priceColor = isCurrent ? "text-zinc-900 dark:text-zinc-100" : (plan.dark ? "text-white" : "text-zinc-900 dark:text-zinc-100");
            const labelColor = isCurrent ? "text-zinc-400 dark:text-zinc-500" : (plan.dark ? "text-zinc-500 dark:text-zinc-400" : "text-zinc-400 dark:text-zinc-500");
            const textColor = isCurrent ? "text-zinc-500 dark:text-zinc-400" : (plan.dark ? "text-zinc-400 dark:text-zinc-300" : "text-zinc-600 dark:text-zinc-400");
            const featureTextColor = isCurrent ? "text-zinc-600 dark:text-zinc-400" : (plan.dark ? "text-zinc-300" : "text-zinc-600 dark:text-zinc-400");
            const checkStyles = isCurrent ? "bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100" : (plan.dark ? "bg-white/10 text-white" : "bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100");

            return (
              <div 
                key={plan.id}
                className={`group relative flex flex-col rounded-[40px] border p-6 sm:p-10 transition-all hover:scale-[1.02] ${containerClass}`}
              >
                {(isCurrent || isRecommendedByVolume || plan.recommended) && (
                  <div className="mb-6 flex min-h-6 flex-wrap gap-2">
                    {isCurrent && (
                      <span className="inline-flex items-center justify-center rounded-full bg-emerald-100 px-3 py-1 text-center text-[8px] font-black uppercase tracking-widest text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                        {isRecommendedByVolume ? "Active · Recommended" : "Active Plan"}
                      </span>
                    )}
                    {isRecommendedByVolume && !isCurrent && (
                      <span className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-3 py-1 text-center text-[8px] font-black uppercase tracking-widest text-white dark:bg-zinc-100 dark:text-zinc-950">
                        Recommended for Usage
                      </span>
                    )}
                    {plan.recommended && (
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center justify-center rounded-full bg-zinc-100 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
                          Most Popular
                        </span>
                        <span className="px-0.5 text-[10px] font-medium leading-tight text-zinc-500 dark:text-zinc-400">
                          Best fit for most users
                        </span>
                      </div>
                    )}
                  </div>
                )}
                <div className="mb-8 space-y-2">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-5xl font-bold tracking-tighter ${priceColor}`}>{displayPrice}</span>
                    <span className={`text-xs font-medium uppercase tracking-widest ${labelColor}`}>/ mo</span>
                  </div>
                  {billingInterval === "year" && plan.id !== "Hobby" && (
                    <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-500 italic">Billed annually</p>
                  )}
                  <p className={`text-sm font-medium ${textColor}`}>{plan.credits}</p>
                </div>

                <div className="mb-10 flex-1 border-t border-zinc-100 dark:border-zinc-800 pt-8 space-y-4">
                  <ul className="space-y-4">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm font-medium">
                        <div className={`flex h-5 w-5 items-center justify-center rounded-full ${checkStyles}`}>
                          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
                            <path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <span className={featureTextColor}>{feature}</span>
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
                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
                        : plan.dark
                        ? "bg-white dark:bg-zinc-100 text-zinc-900 dark:text-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-200 shadow-xl shadow-white/5"
                        : "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-xl shadow-zinc-900/10 dark:shadow-none"
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
                      ? "bg-white dark:bg-zinc-100 text-zinc-900 dark:text-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-200 shadow-xl shadow-white/5"
                      : "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-xl shadow-zinc-900/10 dark:shadow-none"
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
        onSuccess={(msg) => {
          onSuccess?.(msg);
          fetchFreshPlan();
        }}
        onError={onError}
        initialView={modalInitialView}
        initialPendingPlan={modalPendingPlan}
        initialBillingInterval={billingInterval}
        onDowngrade={() => { setIsModalOpen(false); setIsCancelModalOpen(true); }}
        session={activeSession}
      />

      {/* Unified Cancel Subscription Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
          <div 
            className="absolute inset-0 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-md transition-opacity"
            onClick={() => setIsCancelModalOpen(false)}
          />
          <div className="relative w-full max-w-lg scale-up-center overflow-hidden rounded-[32px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-10 shadow-2xl dark:shadow-none animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/20 text-red-500">
                <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor">
                  <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              
              <h3 className="mb-2 text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">Cancel Subscription?</h3>
              <p className="mb-8 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                Your <span className="font-bold text-zinc-900 dark:text-zinc-100">{currentPlanId}</span> plan will remain active until the end of your current term. After that, you&apos;ll be downgraded to the Hobby plan.
              </p>

              <div className="mb-8 w-full space-y-4 rounded-3xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20 p-6 text-left font-sans">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Step 1: Choose 3 Keys to Keep</p>
                  <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">The Hobby plan only supports 3 active API keys. Please select your favorites.</p>
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
                            ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-md' 
                            : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600'
                        }`}
                      >
                        <div className="text-left font-sans">
                          <p className="text-xs font-bold">{key.name}</p>
                          <p className={`text-[9px] ${isSelected ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-400 dark:text-zinc-500'}`}>{key.usage_count} requests this month</p>
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
                    <div className="py-4 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 italic">No keys found</div>
                  )}
                </div>
              </div>
              
              <div className="flex w-full gap-3">
                <button 
                  onClick={() => setIsCancelModalOpen(false)}
                  className="flex-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 py-4 text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
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
                        onSuccess?.("Cancellation scheduled. Your paid access remains active until the end of the current billing period.");
                        fetchFreshPlan();
                      } else {
                        throw new Error("Failed to cancel subscription.");
                      }
                    } catch {
                      onError?.("Failed to cancel subscription.");
                    } finally {
                      setLoadingPlanId(null);
                    }
                  }}
                  className="flex-1 rounded-2xl bg-zinc-900 dark:bg-zinc-100 py-4 text-xs font-black uppercase tracking-widest text-white dark:text-zinc-950 shadow-lg shadow-zinc-900/20 dark:shadow-none transition-all hover:bg-black dark:hover:bg-zinc-200 disabled:opacity-50"
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
