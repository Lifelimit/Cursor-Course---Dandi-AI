"use client";

import { useState } from "react";
import type { Session } from "next-auth";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { loginAction, updatePlanAction } from "@/lib/auth-actions";
import { useRouter } from "next/navigation";
import { SubscriptionModal } from "@/components/dashboard/SubscriptionModal";

const PLANS = [
  {
    id: "Hobby",
    name: "The Hobbyist",
    price: "$0",
    features: [
      "1,000 requests / mo",
      "3 Active API Keys",
    ],
    level: 0,
    className: "border-zinc-200 bg-white",
    textColor: "text-zinc-600",
    priceColor: "text-zinc-900",
    labelColor: "text-zinc-400",
  },
  {
    id: "Premium",
    name: "The Premium",
    price: "$20",
    features: [
      "5,000 requests / mo",
      "Unlimited Active Keys",
      "Priority Support",
    ],
    level: 1,
    recommended: true,
    className: "border-2 border-zinc-900 bg-white shadow-2xl",
    textColor: "text-zinc-600",
    priceColor: "text-zinc-900",
    labelColor: "text-zinc-400",
  },
  {
    id: "Researcher",
    name: "The Researcher",
    price: "$99",
    features: [
      "Unlimited requests / mo",
      "Unlimited Active Keys",
      "Custom Branding",
      "Priority Support",
    ],
    level: 2,
    dark: true,
    className: "border-zinc-200 bg-[#18181b] text-white",
    textColor: "text-zinc-400",
    priceColor: "text-white",
    labelColor: "text-zinc-500",
  }
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
  const router = useRouter();
  const { data: clientSession, update } = useSession();
  const activeSession = clientSession || session;

  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  // Use the real plan from the session (populated in auth.ts)
  const currentPlanId = (activeSession?.user as { plan?: string })?.plan || null;
  const currentPlan = PLANS.find(p => p.id === currentPlanId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialView, setModalInitialView] = useState<"overview" | "cancel-confirm" | "update-payment" | "plan-change-review">("overview");
  const [modalPendingPlan, setModalPendingPlan] = useState<string | null>(null);

  const handleUpdatePlan = async (planId: string) => {
    
    // Downgrading to Hobby -> show cancel confirm warning
    if (planId === "Hobby" && currentPlanId !== "Hobby") {
      setModalInitialView("cancel-confirm");
      setModalPendingPlan(null);
      setIsModalOpen(true);
      return;
    }

    // Upgrading from Hobby to a paid plan -> show payment details for that plan
    if (currentPlanId === "Hobby" && planId !== "Hobby") {
      setModalInitialView("update-payment");
      setModalPendingPlan(planId);
      setIsModalOpen(true);
      return;
    }

    // Switching between paid plans (e.g., Premium <-> Researcher) -> show review screen
    if (currentPlanId !== "Hobby" && planId !== "Hobby" && planId !== currentPlanId) {
      setModalInitialView("plan-change-review");
      setModalPendingPlan(planId);
      setIsModalOpen(true);
      return;
    }

    // Only allow instant update for cases not requiring specific views (rare if all paths are covered above)
    setLoadingPlanId(planId);
    try {
      await updatePlanAction(planId);
      await update();
      onSuccess?.(`Successfully updated to ${planId} plan.`);
      router.refresh();
    } catch (error) {
      console.error("Failed to update plan:", error);
      onError?.("Failed to change plan. Please try again.");
    } finally {
      setLoadingPlanId(null);
    }
  };

  return (
    <section id="pricing" className="bg-white/50 py-24 md:py-40 backdrop-blur-sm border-y border-zinc-200">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-20 text-center space-y-4">
          <h2 className="font-serif text-4xl font-bold md:text-5xl">Simple, transparent <br /> pricing for builders.</h2>
          <p className="text-zinc-500">Start for free, scale as you grow.</p>
        </div>

        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = currentPlanId === plan.id;
            const isUpgrade = currentPlan && plan.level > currentPlan.level;
            const isLoading = loadingPlanId === plan.id;

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
                
                {isCurrent && (
                  <div className={`absolute top-6 left-8 rounded-full px-3 py-1 text-[8px] font-black uppercase tracking-widest ${plan.dark ? 'bg-emerald-500 text-[#18181b]' : 'bg-emerald-100 text-emerald-700'}`}>
                    Active Plan
                  </div>
                )}

                <div className="mb-10 space-y-2 mt-4">
                  <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${plan.labelColor}`}>
                    {plan.name}
                  </p>
                  <div className="space-y-1">
                    <h4 className={`text-4xl font-bold ${plan.priceColor}`}>
                      {plan.price}<span className="text-sm font-normal text-zinc-400">/mo</span>
                    </h4>
                    {plan.id !== "Hobby" && (
                      <p className={`text-[9px] font-medium italic ${plan.labelColor}`}>VAT inclusive</p>
                    )}
                  </div>
                </div>

                <ul className={`mb-12 space-y-4 text-sm ${plan.textColor}`}>
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-3">
                      <svg viewBox="0 0 24 24" className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor">
                        <path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                {!session ? (
                  <Link 
                    href="/signup"
                    className={`mt-auto w-full rounded-full border py-4 text-center text-sm font-bold uppercase tracking-widest transition-all ${
                      plan.dark 
                        ? 'border-zinc-700 hover:bg-zinc-800' 
                        : plan.recommended 
                          ? 'bg-zinc-900 text-white hover:bg-zinc-800' 
                          : 'border-zinc-200 hover:bg-zinc-50'
                    }`}
                  >
                    Get Started
                  </Link>
                ) : (
                  <button 
                    disabled={isCurrent || !!loadingPlanId}
                    onClick={() => handleUpdatePlan(plan.id)}
                    className={`mt-auto w-full rounded-full border py-4 text-center text-sm font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                      isCurrent 
                        ? 'bg-zinc-100 text-zinc-400 border-transparent cursor-default'
                        : plan.dark 
                          ? 'border-zinc-700 hover:bg-zinc-800 text-white' 
                          : plan.recommended 
                            ? 'bg-zinc-900 text-white hover:bg-zinc-800' 
                            : 'border-zinc-200 hover:bg-zinc-50 text-zinc-900'
                    } ${isLoading ? 'opacity-70' : ''}`}
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : isCurrent ? "Current Plan" : isUpgrade ? "Upgrade" : "Downgrade"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      <SubscriptionModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        planName={currentPlanId || "Hobby"}
        onSuccess={onSuccess}
        onError={onError}
        initialView={modalInitialView}
        initialPendingPlan={modalPendingPlan}
      />
    </section>
  );
}

