"use client";

import { useState } from "react";
import { ANNUAL_SAVINGS_PERCENT, getPlanAnnualTotal, PLAN_DETAILS, PLANS } from "@/lib/constants";
import Link from "next/link";
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

export function PricingSection({ session }: { session: Session | null }) {
  const activeSession = session;
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
  const [estimatedMonthlyUsage, setEstimatedMonthlyUsage] = useState<number>(0);
  const estimatedDailyUsage = Math.round(estimatedMonthlyUsage / 30);
  const recommendedPlanId = getRecommendedPlanId(estimatedMonthlyUsage);
  const recommendedPlanDetails = PLAN_DETAILS[recommendedPlanId];
  const recommendedPlan = PLANS.find((plan) => plan.id === recommendedPlanId) ?? PLANS[0];
  const recommendedDisplayPrice = billingInterval === "year" && recommendedPlan.yearlyPrice
    ? recommendedPlan.yearlyPrice
    : recommendedPlan.price;
  const recommendedAnnualTotal = getPlanAnnualTotal(recommendedPlan);
  const nextRecommendation = getNextPlanThreshold(recommendedPlanId);
  const estimatorMarkers = getEstimatorMarkers();
  const recommendedSupport = recommendedPlan.features.find((feature) => feature.toLowerCase().includes("support")) ?? "Included support";
  const recommendedKeyAllowance = recommendedPlanDetails.keyLimit === null
    ? "Unlimited active API keys"
    : `${recommendedPlanDetails.keyLimit.toLocaleString()} active API keys`;
  const recommendedCapacity = recommendedPlanDetails.monthlyLimit === null
    ? "Unlimited monthly requests"
    : `${recommendedPlanDetails.monthlyLimit.toLocaleString()} monthly requests`;

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
              onClick={() => setBillingInterval((interval) => interval === "month" ? "year" : "month")}
              role="switch"
              aria-checked={billingInterval === "year"}
              aria-label={`Billing interval: ${billingInterval === "year" ? "annual" : "monthly"}`}
              className="relative flex h-6 w-12 cursor-pointer items-center rounded-full border border-white/10 bg-slate-800 p-1 transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
            >
              <div className={`h-4 w-4 rounded-full bg-emerald-300 shadow-sm transition-transform ${billingInterval === "year" ? "translate-x-6" : "translate-x-0"}`} aria-hidden="true" />
            </button>
            <span className={`text-xs font-bold uppercase tracking-widest ${billingInterval === "year" ? "text-zinc-100" : "text-zinc-500"}`}>Annual</span>
            <span className="rounded-full border border-emerald-500/10 bg-emerald-950/40 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-emerald-400">{ANNUAL_SAVINGS_PERCENT}% off</span>
          </div>
        </div>

        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const displayPrice = billingInterval === "year" && plan.yearlyPrice ? plan.yearlyPrice : plan.price;
            const annualTotal = getPlanAnnualTotal(plan);

            const isRecommendedByVolume = recommendedPlanId === plan.id;
            const containerClass = isRecommendedByVolume
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
                  {isRecommendedByVolume && (
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
                  <Link
                    href="/billing#plans"
                    className="w-full rounded-2xl bg-emerald-400 py-4 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-950 shadow-xl transition-all hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                  >
                    Review in Billing
                  </Link>
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
            <h3 className="mt-2 text-base font-semibold text-white">How many total API requests do you expect per month?</h3>
            <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-2xl font-bold text-white">{formatUsage(estimatedMonthlyUsage)} requests / month</p>
              <p className="text-[11px] font-semibold text-slate-400">Approximately {estimatedDailyUsage.toLocaleString()} per day</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <label htmlFor="pricing-usage-estimator" className="sr-only">How many total API requests do you expect per month?</label>
            <input
              id="pricing-usage-estimator"
              type="range"
              min={0}
              max={ESTIMATOR_MAX_USAGE}
              step={1}
              value={estimatedMonthlyUsage}
              aria-label="How many total API requests do you expect per month?"
              aria-valuemin={0}
              aria-valuemax={ESTIMATOR_MAX_USAGE}
              aria-valuenow={estimatedMonthlyUsage}
              aria-valuetext={`${formatUsage(estimatedMonthlyUsage)} requests per month, ${recommendedPlanId} recommended`}
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
                  aria-label={`Set usage reference to ${marker.planId} at ${marker.label} requests per month`}
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
                ? <>Next plan: <span className="font-bold text-slate-200">{nextRecommendation.plan}</span> at {formatUsage(nextRecommendation.min)}+ requests per month</>
                : "Researcher is the highest plan for unlimited monthly requests."}
            </p>
          </div>
        </div>
      </div>
      
    </section>
  );
}
