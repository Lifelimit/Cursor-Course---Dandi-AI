"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { Session } from "next-auth";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { PlanHero } from "@/components/billing/PlanHero";
import { PlanComparison } from "@/components/billing/PlanComparison";
import { PaymentMethodCard } from "@/components/billing/PaymentMethodCard";
import { InvoiceTable } from "@/components/billing/InvoiceTable";


type BillingData = {
  totalUsage: number;
  resetDate: string | null;
  keys: unknown[];
};

const MOCK_CARDS = [
  { brand: "Visa", last4: "4242", expiryMonth: 12, expiryYear: 2026, isDefault: true }
];

const MOCK_INVOICES = [
  { id: "inv_12345", date: new Date().toISOString(), amount: 1900, status: "paid" as const, receiptUrl: "#" },
  { id: "inv_12344", date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), amount: 1900, status: "paid" as const, receiptUrl: "#" }
];

export default function BillingClient({ initialSession }: { initialSession: Session | null }) {
  const { data: session } = useSession();
  const activeSession = initialSession || session;
  
  const [data, setData] = useState<BillingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast, showToast } = useToast();

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
  const PLAN_LIMITS = { Hobby: 1000, Premium: 5000, Researcher: 1000000 };
  const currentLimit = PLAN_LIMITS[currentPlan as keyof typeof PLAN_LIMITS] || 1000;
  const isUnlimited = currentPlan === "Researcher";

  const handleUpgrade = async (plan: string) => {
    showToast("success", `Requesting upgrade to ${plan}...`);
    // This would normally trigger Stripe checkout
  };

  // Using mock data defined outside component

  return (
    <div className="min-h-screen bg-[#f4f2ed] text-[#18181b] selection:bg-zinc-200">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col items-start gap-8 p-6 md:flex-row md:py-12">
        <Sidebar 
          totalUsage={data?.totalUsage || 0} 
          plan={currentPlan} 
          limit={currentLimit} 
          isUnlimited={isUnlimited} 
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
                nextBillingDate={data?.resetDate}
                isUnlimited={isUnlimited}
              />

              {/* Payment Methods */}
              <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <h3 className="font-serif text-2xl font-bold">Wallet</h3>
                  <button className="text-[10px] font-black uppercase tracking-widest text-zinc-900 hover:underline">+ Add Card</button>
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                  {MOCK_CARDS.map(card => (
                    <PaymentMethodCard 
                      key={card.last4} 
                      {...card} 
                      onDelete={() => {}} 
                      onSetDefault={() => {}} 
                    />
                  ))}
                </div>
              </section>

              {/* Plan Switcher */}
              <section className="space-y-6">
                <PlanComparison 
                  currentPlan={currentPlan} 
                  onUpgrade={handleUpgrade} 
                />
              </section>

              {/* History */}
              <section className="space-y-6 pb-12">
                <div className="flex items-center justify-between px-2">
                  <h3 className="font-serif text-2xl font-bold">Transaction History</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Past 12 Months</p>
                </div>
                <InvoiceTable invoices={MOCK_INVOICES} />
              </section>
            </>
          )}
        </main>
      </div>
      <Toast toast={toast} />
    </div>
  );
}
