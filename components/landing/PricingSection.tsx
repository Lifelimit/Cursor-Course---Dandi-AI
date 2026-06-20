"use client";

import { useState, useEffect } from "react";
import { PLANS } from "@/lib/constants";
import Link from "next/link";
import { SubscriptionModal } from "@/components/dashboard/SubscriptionModal";
import { ModalFrame } from "@/components/command/ModalFrame";
import { useSubscriptionFlow } from "@/hooks/useSubscriptionFlow";

import { Session } from "@supabase/supabase-js";

const SLIDER_STEPS = [
  { label: "1,000", tier: "Personal", value: 1000 },
  { label: "2,500", tier: "Team", value: 2500 },
  { label: "5,000", tier: "Startup", value: 5000 },
  { label: "7,500", tier: "Agency", value: 7500 },
  { label: "10,000+", tier: "Enterprise", value: 10000 },
];

const PLAN_RECOMMENDATIONS = {
  Hobby: {
    activeKeys: "3 active API keys",
    monthlyCapacity: "1,000 repository summaries",
    supportTier: "Community support",
    guidance: "Personal projects, experimentation, and learning workflows.",
  },
  Premium: {
    activeKeys: "10 active API keys",
    monthlyCapacity: "5,000 repository summaries",
    supportTier: "Priority email support",
    guidance: "Production apps, teams, and continuous development workflows.",
  },
  Researcher: {
    activeKeys: "Unlimited active keys",
    monthlyCapacity: "Unlimited repository summaries",
    supportTier: "24/7 phone support",
    guidance: "Large-scale analysis and heavy repository intelligence workloads.",
  },
} as const;

const RECOMMENDATION_THRESHOLDS = [
  { plan: "Hobby", min: 0, max: 2499 },
  { plan: "Premium", min: 2500, max: 7499 },
  { plan: "Researcher", min: 7500, max: Infinity },
] as const;

function getRecommendedPlanId(monthlyUsage: number) {
  return RECOMMENDATION_THRESHOLDS.find((threshold) => monthlyUsage >= threshold.min && monthlyUsage <= threshold.max)?.plan ?? "Researcher";
}

function formatUsage(value: number) {
  return value >= 10000 ? "10,000+" : value.toLocaleString();
}

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

  const subscriptionFlow = useSubscriptionFlow({ initialBillingInterval: "month" });
  const billingInterval = subscriptionFlow.modalBillingInterval;
  const [sliderIndex, setSliderIndex] = useState<number>(0);
  const activeSliderStep = SLIDER_STEPS[sliderIndex];
  const estimatedMonthlyUsage = activeSliderStep.value;
  const estimatedDailyUsage = Math.round(estimatedMonthlyUsage / 30);
  const recommendedPlanId = getRecommendedPlanId(estimatedMonthlyUsage);
  const recommendedPlanDetails = PLAN_RECOMMENDATIONS[recommendedPlanId];
  const nextRecommendation = RECOMMENDATION_THRESHOLDS.find((threshold) => threshold.min > estimatedMonthlyUsage);

  const [isRefreshingPlan, setIsRefreshingPlan] = useState(false);
  const currentPlan = PLANS.find(p => p.id === currentPlanId);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [keysToKeep, setKeysToKeep] = useState<string[]>([]);
  const [userKeys, setUserKeys] = useState<{id: string, name: string, usage_count: number}[]>([]);

  // Function to load the absolute source of truth directly from database
  const fetchFreshPlan = async () => {
    if (!activeSession) return;
    setIsRefreshingPlan(true);
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
    } finally {
      setIsRefreshingPlan(false);
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
      subscriptionFlow.closeModal();
      setIsCancelModalOpen(true);
      return;
    }

    subscriptionFlow.launchPricingPlan({ planId });
  };

  return (
    <section id="pricing" className="border-y border-white/8 bg-slate-950/48 py-16 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-16 space-y-8 text-center md:mb-20">
          <div className="space-y-4">
            <h2 className="font-serif text-4xl font-bold md:text-5xl text-white">Simple, transparent <br /> pricing for builders.</h2>
            <p className="text-slate-400">Start for free, then scale when repository usage grows.</p>
          </div>

          {/* Billing Toggle */}
          <div className="mx-auto inline-grid grid-cols-[auto_auto_auto] grid-rows-[auto_auto] items-center justify-center gap-x-4 gap-y-1">
            <span className={`text-xs font-bold uppercase tracking-widest ${billingInterval === "month" ? "text-zinc-100" : "text-zinc-500"}`}>Monthly</span>
            <button
              onClick={subscriptionFlow.toggleBillingInterval}
              role="switch"
              aria-checked={billingInterval === "year"}
              aria-label={`Billing interval: ${billingInterval === "year" ? "annual" : "monthly"}`}
              className="relative h-6 w-12 cursor-pointer rounded-full border border-white/10 bg-slate-800 p-1 transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
            >
              <div className={`h-4 w-4 rounded-full bg-emerald-300 shadow-sm transition-transform ${billingInterval === "year" ? "translate-x-6" : "translate-x-0"}`} aria-hidden="true" />
            </button>
            <span className={`text-xs font-bold uppercase tracking-widest ${billingInterval === "year" ? "text-zinc-100" : "text-zinc-500"}`}>Annual</span>
            <span className="col-start-3 justify-self-center rounded-full border border-emerald-500/10 bg-emerald-950/40 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-emerald-400">20% OFF</span>
          </div>
          {isRefreshingPlan && (
            <p className="mx-auto -mt-4 w-fit rounded-full border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-1 text-[8px] font-black uppercase tracking-widest text-emerald-300" role="status" aria-live="polite">
              Syncing active plan...
            </p>
          )}

          {/* Volume Calculator Slider */}
          <div className="mx-auto mt-12 max-w-xl space-y-6 rounded-[28px] border border-white/10 bg-slate-950/55 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:p-6 md:p-8">
            <div className="grid gap-4 text-left sm:grid-cols-[1fr_auto] sm:items-start">
              <div className="space-y-4">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Usage Estimator</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-slate-500">Estimated Usage</p>
                    <h4 className="mt-1 text-base font-bold text-white">
                      {formatUsage(estimatedMonthlyUsage)} monthly requests
                    </h4>
                    <p className="mt-1 text-[11px] font-semibold text-slate-400">≈ {estimatedDailyUsage.toLocaleString()} requests / day</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-950/20 px-4 py-3">
                    <p className="text-[8px] font-bold uppercase tracking-widest text-emerald-300/80">Recommended Plan</p>
                    <p className="mt-1 text-lg font-black text-emerald-200">{recommendedPlanId}</p>
                    <p className="mt-1 text-[11px] font-semibold text-emerald-100/70">
                      {recommendedPlanId} comfortably supports this usage.
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/45 px-4 py-3 font-sans sm:min-w-52">
                <p className="text-[8px] font-bold uppercase tracking-widest text-slate-500">Included</p>
                <dl className="mt-3 space-y-2">
                  <div>
                    <dt className="text-[8px] font-bold uppercase tracking-widest text-slate-500">API Keys</dt>
                    <dd className="text-xs font-bold text-slate-200">{recommendedPlanDetails.activeKeys}</dd>
                  </div>
                  <div>
                    <dt className="text-[8px] font-bold uppercase tracking-widest text-slate-500">Capacity</dt>
                    <dd className="text-xs font-bold text-slate-200">{recommendedPlanDetails.monthlyCapacity}</dd>
                  </div>
                  <div>
                    <dt className="text-[8px] font-bold uppercase tracking-widest text-slate-500">Support</dt>
                    <dd className="text-xs font-bold text-slate-200">{recommendedPlanDetails.supportTier}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-left">
              <p className="text-xs font-semibold text-emerald-300">✓ {recommendedPlanId} comfortably supports this usage</p>
              <p className="mt-1 text-[11px] font-medium text-slate-400">
                {nextRecommendation
                  ? <>Next recommendation: <span className="font-bold text-slate-200">{nextRecommendation.plan}</span> at {nextRecommendation.min.toLocaleString()}+ summaries/month</>
                  : "You are already at the highest recommendation tier for heavy repository workloads."}
              </p>
            </div>

            <div className="space-y-4">
              <input
                id="pricing-usage-estimator"
                type="range" 
                min="0" 
                max="4" 
                value={sliderIndex}
                aria-label="Estimated monthly repository requests"
                aria-valuetext={`${formatUsage(estimatedMonthlyUsage)} monthly requests, ${recommendedPlanId} recommended`}
                onChange={(e) => setSliderIndex(parseInt(e.target.value))}
                className="h-1.5 w-full cursor-pointer rounded-lg bg-slate-800 accent-emerald-400"
              />
              <div className="grid grid-cols-5 gap-1 px-1 text-center">
                {SLIDER_STEPS.map((step, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSliderIndex(idx)}
                    aria-pressed={sliderIndex === idx}
                    aria-label={`Set estimated usage to ${step.label} monthly requests, ${step.tier}`}
                    className={`rounded px-1 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 ${sliderIndex === idx ? "text-white" : "text-slate-500 hover:text-slate-300"}`}
                  >
                    <span className="block text-[8px] font-black uppercase tracking-wider sm:text-[9px] sm:tracking-widest">{step.tier}</span>
                    <span className="mt-0.5 block text-[8px] font-bold tracking-wider">{step.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950 p-4 text-left">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-400 text-slate-950">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" aria-hidden="true">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="text-[8px] font-bold uppercase tracking-widest text-slate-500">Capacity Guidance</p>
                <p className="mt-0.5 text-xs font-semibold text-slate-300">{recommendedPlanDetails.guidance}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = currentPlanId === plan.id;
            const isUpgrade = currentPlan && plan.level > currentPlan.level;
            const isLoading = subscriptionFlow.loadingPlanId === plan.id;
            const displayPrice = billingInterval === "year" && plan.yearlyPrice ? plan.yearlyPrice : plan.price;

            // Generate clean classes for dark mode
            const isRecommendedByVolume = recommendedPlanId === plan.id;
            const usageRecommendationClass = isRecommendedByVolume && !isCurrent
              ? "border-emerald-400/30 bg-emerald-950/10"
              : "";
            
            const baseContainerClass = `border-white/10 bg-slate-950/55 text-white ${usageRecommendationClass}`;
            const containerClass = isCurrent
              ? "border-2 border-emerald-400/80 bg-[#0b1020]/95 text-white shadow-2xl shadow-emerald-500/10 ring-1 ring-emerald-400/60"
              : baseContainerClass;

            const priceColor = "text-white";
            const labelColor = "text-zinc-500";
            const textColor = "text-zinc-400";
            const featureTextColor = "text-zinc-300";
            const checkStyles = "bg-zinc-800 text-white border border-white/5";

            return (
              <div
                key={plan.id}
                className={`group relative flex flex-col rounded-[28px] border p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)] transition-colors hover:border-emerald-400/25 sm:p-10 ${containerClass}`}
              >
                {(isCurrent || isRecommendedByVolume || plan.recommended) && (
                  <div className="mb-6 flex min-h-6 flex-wrap gap-2">
                    {isCurrent && (
                      <span className="inline-flex items-center justify-center rounded-full bg-emerald-950/40 px-3 py-1 text-center text-[8px] font-black uppercase tracking-widest text-emerald-400 border border-emerald-500/10">
                        {isRecommendedByVolume ? "Active · Recommended" : "Active Plan"}
                      </span>
                    )}
                    {isRecommendedByVolume && !isCurrent && (
                      <span className="inline-flex items-center justify-center rounded-full bg-zinc-100 px-3 py-1 text-center text-[8px] font-black uppercase tracking-widest text-zinc-950">
                        Recommended for Usage
                      </span>
                    )}
                    {plan.recommended && (
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center justify-center rounded-full bg-zinc-800 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-300 border border-white/5">
                          Most Popular
                        </span>
                        <span className="px-0.5 text-[10px] font-medium leading-tight text-zinc-400">
                          Best fit for most users
                        </span>
                      </div>
                    )}
                  </div>
                )}
                <div className="mb-8 space-y-2">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.18em] opacity-50">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-5xl font-bold tracking-tighter ${priceColor}`}>{displayPrice}</span>
                    <span className={`text-xs font-medium uppercase tracking-widest ${labelColor}`}>/ mo</span>
                  </div>
                  {billingInterval === "year" && plan.id !== "Hobby" && (
                    <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-400 italic">Billed annually</p>
                  )}
                  <p className={`text-sm font-medium ${textColor}`}>{plan.credits}</p>
                </div>

                <div className="mb-10 flex-1 border-t border-white/5 pt-8 space-y-4">
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
                    aria-busy={isLoading || undefined}
                    className={`w-full rounded-2xl py-4 text-[10px] font-black uppercase tracking-[0.14em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                      isCurrent
                        ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-white/10"
                        : "bg-emerald-400 text-slate-950 hover:bg-emerald-300 shadow-xl"
                    }`}
                  >
                    {isLoading ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-400 border-t-white" aria-hidden="true" />
                        Reviewing Plan
                      </span>
                    ) : isCurrent ? "Current Plan" : isUpgrade ? "Upgrade Now" : "Downgrade"}
                  </button>
                ) : (
                  <Link
                    href="/signup"
                    className="w-full rounded-2xl bg-emerald-400 py-4 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-950 shadow-xl transition-all hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
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
        key={subscriptionFlow.isModalOpen ? "open" : "closed"}
        isOpen={subscriptionFlow.isModalOpen}
        onClose={subscriptionFlow.closeModal}
        planName={currentPlanId || "Hobby"}
        onSuccess={(msg) => {
          onSuccess?.(msg);
          fetchFreshPlan();
        }}
        onError={onError}
        initialView={subscriptionFlow.modalInitialView}
        initialPendingPlan={subscriptionFlow.modalPendingPlan}
        initialBillingInterval={billingInterval}
        onDowngrade={() => { subscriptionFlow.closeModal(); setIsCancelModalOpen(true); }}
        session={activeSession}
      />

      {/* Unified Cancel Subscription Modal */}
      <ModalFrame open={isCancelModalOpen} onClose={() => setIsCancelModalOpen(false)} size="md" titleId="cancel-subscription-title">
            <div className="flex flex-col items-center text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-950/20 text-red-400 border border-red-500/10" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor">
                  <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              
              <h3 id="cancel-subscription-title" className="mb-2 text-2xl font-black tracking-tight text-white">Cancel Subscription?</h3>
              <p className="mb-8 text-sm leading-relaxed text-zinc-400">
                Your <span className="font-bold text-white">{currentPlanId}</span> plan will remain active until the end of your current term. After that, you&apos;ll be downgraded to the Hobby plan.
              </p>

              <div className="mb-8 w-full space-y-4 rounded-3xl border border-white/5 bg-zinc-900/20 p-6 text-left font-sans">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Step 1: Choose 3 Keys to Keep</p>
                  <p className="mt-1 text-[11px] text-slate-400">The Hobby plan supports 3 active API keys. Select the keys you want to keep.</p>
                </div>
                
                <div className="grid gap-2">
                  {userKeys.map(key => {
                    const isSelected = keysToKeep.includes(key.id);
                    return (
                      <button
                        key={key.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setKeysToKeep(prev => prev.filter(id => id !== key.id));
                          } else if (keysToKeep.length < 3) {
                            setKeysToKeep(prev => [...prev, key.id]);
                          }
                        }}
                        aria-pressed={isSelected}
                        className={`flex items-center justify-between rounded-xl border p-4 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                          isSelected 
                            ? 'border-zinc-100 bg-zinc-100 text-zinc-950 shadow-md' 
                            : 'border-white/5 bg-zinc-950/40 text-zinc-300 hover:border-white/10'
                        }`}
                      >
                        <div className="text-left font-sans">
                          <p className="text-xs font-bold">{key.name}</p>
                          <p className="text-[9px] text-zinc-500 mt-0.5">{key.usage_count} requests this month</p>
                        </div>
                        {isSelected && (
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" aria-hidden="true">
                            <path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                  {userKeys.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/45 p-4 text-center">
                      <p className="text-xs font-bold text-slate-300">No API keys to choose from.</p>
                      <p className="mt-1 text-[11px] font-medium leading-5 text-zinc-500">
                        You have not created keys yet, so there is nothing to disable during downgrade.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex w-full gap-3">
                <button 
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="flex-1 rounded-2xl border border-white/5 py-4 text-xs font-black uppercase tracking-widest text-zinc-400 transition-all hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  Go Back
                </button>
                <button 
                  type="button"
                  disabled={keysToKeep.length !== 3 && userKeys.length >= 3}
                  onClick={async () => {
                    try {
                      subscriptionFlow.setLoadingPlanId("cancel");
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
                      subscriptionFlow.setLoadingPlanId(null);
                    }
                  }}
                  className="flex-1 rounded-2xl bg-zinc-100 py-4 text-xs font-black uppercase tracking-widest text-zinc-950 shadow-none transition-all hover:bg-zinc-200 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-100 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  Confirm Downgrade
                </button>
              </div>
            </div>
      </ModalFrame>
    </section>
  );
}
