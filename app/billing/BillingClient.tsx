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
    
    // 1. Upgrading from Hobby to a paid plan -> show payment details for that plan
    if (currentPlan === "Hobby" && planId !== "Hobby") {
      setModalInitialView("plan-change-review");
      setModalPendingPlan(planId);
      setIsModalOpen(true);
      return;
    }

    // 2. Downgrading to Hobby -> let modal handle the audit (selector vs confirm)
    if (planId === "Hobby" && currentPlan !== "Hobby") {
      setModalInitialView("overview");
      setModalPendingPlan("Hobby");
      setIsModalOpen(true);
      return;
    }

    // 3. Switching between paid plans -> show review screen
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
                <div className="grid gap-6 sm:grid-cols-2">
                  {activeSession?.user?.payment_method_last4 ? (
                    <PaymentMethodCard 
                      brand={activeSession.user.payment_method_brand || "Card"}
                      last4={activeSession.user.payment_method_last4}
                      expiryMonth={parseInt(activeSession.user.payment_method_expiry?.split('/')[0] || "12")}
                      expiryYear={parseInt(activeSession.user.payment_method_expiry?.split('/')[1] || "2026")}
                      isDefault={true}
                      onDelete={() => {}} 
                      onSetDefault={() => {}} 
                    />
                  ) : (
                    <div className="col-span-full rounded-[32px] border border-dashed border-zinc-200 bg-zinc-50/50 p-12 text-center">
                      <p className="text-sm font-medium text-zinc-500">No payment methods on file.</p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Add a card to get started</p>
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
              <section className="space-y-6 pb-12">
                <div className="flex items-center justify-between px-2">
                  <h3 className="font-serif text-2xl font-bold">Transaction History</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Past 12 Months</p>
                </div>
                <InvoiceTable invoices={invoices} />
              </section>
            </>
          )}
        </main>
      </div>

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
      />

      <Toast toast={toast} />
    </div>
  );
}
