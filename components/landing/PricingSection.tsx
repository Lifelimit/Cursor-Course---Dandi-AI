"use client";

import { useState, useEffect } from "react";
import { PLAN_DETAILS, PLANS } from "@/lib/constants";
import Link from "next/link";
import { SubscriptionModal } from "@/components/dashboard/SubscriptionModal";
import { ModalFrame } from "@/components/command/ModalFrame";
import { useSubscriptionFlow } from "@/hooks/useSubscriptionFlow";

import { Session } from "@supabase/supabase-js";

const ESTIMATOR_PLANS = PLANS.map((plan) => ({ plan, details: PLAN_DETAILS[plan.id] }));
const FINITE_PLAN_CAPACITIES = ESTIMATOR_PLANS
  .map(({ details }) => details.monthlyLimit)
  .filter((limit): limit is number => limit !== null);
const ESTIMATOR_MAX_USAGE = Math.max(...FINITE_PLAN_CAPACITIES) * 2;

function getRecommendedPlanId(monthlyUsage: number) {
  const matchingPlan = ESTIMATOR_PLANS.find(({ details }) => details.monthlyLimit === null || monthlyUsage <= details.monthlyLimit);
  return matchingPlan?.plan.id ?? ESTIMATOR_PLANS[ESTIMATOR_PLANS.length - 1].plan.id;
}

function formatUsage(value: number) {
  return value.toLocaleString();
}

function formatCompactUsage(value: number) {
  if (value >= 1000 && value % 1000 === 0) return `${value / 1000}K`;
  if (value >= 1000) return `${Math.round(value / 100) / 10}K`;
  return value.toLocaleString();
}

function getEstimatorMarkers() {
  return ESTIMATOR_PLANS.map(({ plan, details }, index) => {
    const previousCapacity = ESTIMATOR_PLANS[index - 1]?.details.monthlyLimit;
    const value = details.monthlyLimit ?? (previousCapacity === null || previousCapacity === undefined ? 0 : previousCapacity + 1);
    const isUnlimited = details.monthlyLimit === null;
    return {
      planId: plan.id,
      label: isUnlimited ? `${formatUsage(value)}+` : formatUsage(value),
      compactLabel: isUnlimited ? `${formatCompactUsage(value)}+` : formatCompactUsage(value),
      value,
    };
  });
}

function getNextPlanThreshold(planId: string) {
  const currentIndex = ESTIMATOR_PLANS.findIndex(({ plan }) => plan.id === planId);
  const currentDetails = ESTIMATOR_PLANS[currentIndex]?.details;
  const nextPlan = ESTIMATOR_PLANS[currentIndex + 1]?.plan;
  if (!currentDetails || currentDetails.monthlyLimit === null || !nextPlan) return null;
  return { plan: nextPlan.name, min: currentDetails.monthlyLimit + 1 };
}

function getAnnualTotal(yearlyPrice?: string) {
  if (!yearlyPrice) return null;
  const monthlyAmount = Number.parseFloat(yearlyPrice.replace(/[^0-9.]/g, ""));
  return Number.isFinite(monthlyAmount) ? `$${monthlyAmount * 12}` : null;
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
  const [estimatedMonthlyUsage, setEstimatedMonthlyUsage] = useState<number>(0);
  const estimatedDailyUsage = Math.round(estimatedMonthlyUsage / 30);
  const recommendedPlanId = getRecommendedPlanId(estimatedMonthlyUsage);
  const recommendedPlanDetails = PLAN_DETAILS[recommendedPlanId];
  const recommendedPlan = PLANS.find((plan) => plan.id === recommendedPlanId) ?? PLANS[0];
  const recommendedDisplayPrice = billingInterval === "year" && recommendedPlan.yearlyPrice
    ? recommendedPlan.yearlyPrice
    : recommendedPlan.price;
  const recommendedAnnualTotal = getAnnualTotal(recommendedPlan.yearlyPrice);
  const nextRecommendation = getNextPlanThreshold(recommendedPlanId);
  const estimatorMarkers = getEstimatorMarkers();
  const recommendedSupport = recommendedPlan.features.find((feature) => feature.toLowerCase().includes("support")) ?? "Included support";
  const recommendedKeyAllowance = recommendedPlanDetails.keyLimit === null
    ? "Unlimited active API keys"
    : `${recommendedPlanDetails.keyLimit.toLocaleString()} active API keys`;
  const recommendedCapacity = recommendedPlanDetails.monthlyLimit === null
    ? "Unlimited repository summaries"
    : `${recommendedPlanDetails.monthlyLimit.toLocaleString()} repository summaries`;

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
        <div className="mb-12 space-y-8 text-center md:mb-16">
          <div className="space-y-4">
            <h2 className="font-serif text-4xl font-bold text-white md:text-5xl">Simple, transparent <br /> pricing for builders.</h2>
            <p className="text-slate-400">Start for free, then scale when repository usage grows.</p>
          </div>

          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-slate-950/45 px-4 py-2">
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
            <span className="rounded-full border border-emerald-500/10 bg-emerald-950/40 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-emerald-400">20% off</span>
          </div>
          {isRefreshingPlan && (
            <p className="mx-auto -mt-4 min-h-4 w-fit rounded-full border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-1 text-[8px] font-black uppercase tracking-widest text-emerald-300" role="status" aria-live="polite">
              Syncing active plan...
            </p>
          )}
        </div>

        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = Boolean(activeSession) && currentPlanId === plan.id;
            const isUpgrade = currentPlan && plan.level > currentPlan.level;
            const isLoading = subscriptionFlow.loadingPlanId === plan.id;
            const displayPrice = billingInterval === "year" && plan.yearlyPrice ? plan.yearlyPrice : plan.price;
            const annualTotal = getAnnualTotal(plan.yearlyPrice);

            const isRecommendedByVolume = recommendedPlanId === plan.id;
            const containerClass = isCurrent
              ? "border-2 border-emerald-400/80 bg-[#0b1020]/95 text-white shadow-2xl shadow-emerald-500/10 ring-1 ring-emerald-400/60"
              : isRecommendedByVolume
                ? "border-emerald-400/40 bg-emerald-950/10 text-white ring-1 ring-emerald-400/15"
                : "border-white/10 bg-slate-950/55 text-white";

            const priceColor = "text-white";
            const labelColor = "text-zinc-500";
            const textColor = "text-zinc-400";
            const featureTextColor = "text-zinc-300";
            const checkStyles = "bg-zinc-800 text-white border border-white/5";

            return (
              <div
                key={plan.id}
                className={`group relative flex h-full flex-col rounded-[28px] border p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)] transition-colors hover:border-emerald-400/25 sm:p-8 ${containerClass}`}
              >
                <div className="mb-6 flex min-h-7 flex-wrap items-start gap-2">
                  {isCurrent && (
                    <span className="inline-flex items-center justify-center rounded-full border border-emerald-500/10 bg-emerald-950/40 px-3 py-1 text-center text-[8px] font-black uppercase tracking-widest text-emerald-400">
                      {isRecommendedByVolume ? "Active · Recommended" : "Active plan"}
                    </span>
                  )}
                  {isRecommendedByVolume && !isCurrent && (
                    <span className="inline-flex items-center justify-center rounded-full bg-zinc-100 px-3 py-1 text-center text-[8px] font-black uppercase tracking-widest text-zinc-950">
                      Best fit for usage
                    </span>
                  )}
                  {plan.recommended && (
                    <span className="inline-flex items-center justify-center rounded-full border border-white/5 bg-zinc-800 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-300">
                      Most popular
                    </span>
                  )}
                </div>
                <div className="mb-8 space-y-2">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.18em] opacity-50">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-5xl font-bold tracking-tighter ${priceColor}`}>{displayPrice}</span>
                    <span className={`text-xs font-medium uppercase tracking-widest ${labelColor}`}>/ month</span>
                  </div>
                  {billingInterval === "year" && annualTotal ? (
                    <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-400 italic">Billed annually at {annualTotal}</p>
                  ) : (
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{plan.id === "Hobby" ? "Free plan" : "Billed monthly"}</p>
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

        <div className="mx-auto mt-12 max-w-5xl rounded-[28px] border border-white/10 bg-slate-950/55 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:p-6 md:p-8">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Usage estimator</p>
            <h3 className="mt-2 text-base font-semibold text-white">How many repository summaries do you expect per month?</h3>
            <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-2xl font-bold text-white">{formatUsage(estimatedMonthlyUsage)} summaries / month</p>
              <p className="text-[11px] font-semibold text-slate-400">Approximately {estimatedDailyUsage.toLocaleString()} per day</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <label htmlFor="pricing-usage-estimator" className="sr-only">How many repository summaries do you expect per month?</label>
            <input
              id="pricing-usage-estimator"
              type="range"
              min={0}
              max={ESTIMATOR_MAX_USAGE}
              step={1}
              value={estimatedMonthlyUsage}
              aria-label="How many repository summaries do you expect per month?"
              aria-valuemin={0}
              aria-valuemax={ESTIMATOR_MAX_USAGE}
              aria-valuenow={estimatedMonthlyUsage}
              aria-valuetext={`${formatUsage(estimatedMonthlyUsage)} summaries per month, ${recommendedPlanId} recommended`}
              onChange={(event) => setEstimatedMonthlyUsage(Number(event.target.value))}
              className="h-1.5 w-full cursor-pointer rounded-lg bg-slate-800 accent-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
            />
            <div className="grid grid-cols-3 gap-2 px-1 text-center">
              {estimatorMarkers.map((marker) => (
                <button
                  key={marker.planId}
                  type="button"
                  onClick={() => setEstimatedMonthlyUsage(marker.value)}
                  aria-pressed={recommendedPlanId === marker.planId}
                  aria-label={`Set usage reference to ${marker.planId} at ${marker.label} summaries per month`}
                  className={`rounded px-1 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 ${recommendedPlanId === marker.planId ? "text-white" : "text-slate-500 hover:text-slate-300"}`}
                >
                  <span className="block text-[8px] font-black uppercase tracking-wider sm:text-[9px] sm:tracking-widest">{marker.planId}</span>
                  <span className="mt-0.5 block text-[8px] font-bold tracking-wider"><span className="sm:hidden">{marker.compactLabel}</span><span className="hidden sm:inline">{marker.label}</span></span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-950/20 p-4 text-left">
              <p className="text-[8px] font-bold uppercase tracking-widest text-emerald-300/80">Recommended plan</p>
              <p className="mt-2 text-lg font-black text-emerald-200">{recommendedPlanId} — {recommendedDisplayPrice}/month</p>
              {billingInterval === "year" && recommendedAnnualTotal && (
                <p className="mt-1 text-[10px] font-semibold text-emerald-100/70">Billed annually at {recommendedAnnualTotal}</p>
              )}
              <p className="mt-2 text-[11px] font-semibold leading-5 text-emerald-100/70">Best fit for your expected usage.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/45 p-4 text-left font-sans">
              <p className="text-[8px] font-bold uppercase tracking-widest text-slate-500">Included</p>
              <dl className="mt-3 grid gap-2">
                <div className="flex items-baseline justify-between gap-3"><dt className="text-[8px] font-bold uppercase tracking-widest text-slate-500">API keys</dt><dd className="text-right text-xs font-bold text-slate-200">{recommendedKeyAllowance}</dd></div>
                <div className="flex items-baseline justify-between gap-3"><dt className="text-[8px] font-bold uppercase tracking-widest text-slate-500">Capacity</dt><dd className="text-right text-xs font-bold text-slate-200">{recommendedCapacity}</dd></div>
                <div className="flex items-baseline justify-between gap-3"><dt className="text-[8px] font-bold uppercase tracking-widest text-slate-500">Support</dt><dd className="text-right text-xs font-bold text-slate-200">{recommendedSupport}</dd></div>
              </dl>
            </div>
          </div>

          <div className="mt-4 border-t border-white/5 pt-4 text-left">
            <p className="text-[11px] font-medium text-slate-400">
              {nextRecommendation
                ? <>Next plan: <span className="font-bold text-slate-200">{nextRecommendation.plan}</span> at {formatUsage(nextRecommendation.min)}+ summaries per month</>
                : "Researcher is the highest plan for unlimited repository summaries."}
            </p>
          </div>
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
