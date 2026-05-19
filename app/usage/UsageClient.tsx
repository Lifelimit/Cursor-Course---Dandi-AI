"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { QuotaHealthGrid } from "@/components/usage/QuotaHealthGrid";
import { TopReposTable } from "@/components/usage/TopReposTable";

type UsageData = {
  totalUsage: number;
  keys: {
    id: string;
    name: string;
    key_type: string;
    usage_count: number;
    monthly_limit: number | null;
    is_active: boolean;
    alert_threshold: number | null;
    alert_channels: string[] | null;
    alert_phone: string | null;
    pct: number;
    dailyTrend: { date: string; count: number }[];
  }[];
  globalTopRepos: { repo_url: string; count: number }[];
  resetDate: string | null;
  nextInvoiceDate: string | null;
};

export default function UsageClient({ 
  initialSession, 
  initialData = null 
}: { 
  initialSession: Session | null, 
  initialData?: UsageData | null 
}) {
  const activeSession = initialSession;
  
  const [data, setData] = useState<UsageData | null>(initialData);
  const [isLoading, setIsLoading] = useState(initialData === null);
  const isHydrated = useRef(initialData !== null);
  const { toast, showToast } = useToast();

  const fetchUsageData = useCallback(async () => {
    try {
      // Don't set isLoading if we already have initialData to prevent flicker
      if (!isHydrated.current) {
        setIsLoading(true);
      }
      
      const res = await fetch("/api/usage");
      const json = await res.json();
      setData(json);
      isHydrated.current = false;
    } catch (err) {
      console.error("Usage Fetch Error:", err);
      showToast("error", "Failed to load usage analytics.");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    // If we have initialData, delay the refresh to allow instant initial paint
    if (initialData) {
      const timer = setTimeout(() => {
        fetchUsageData();
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        fetchUsageData();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [fetchUsageData, initialData]);

  const currentData = data || initialData;
  const currentPlan = activeSession?.user?.user_metadata?.plan || "Hobby";
  const PLAN_LIMITS = { Hobby: 1000, Premium: 5000, Researcher: 1000000 };
  const currentLimit = PLAN_LIMITS[currentPlan as keyof typeof PLAN_LIMITS] || 1000;
  const isUnlimited = currentPlan === "Researcher";

  const alerts = (currentData?.keys || [])
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

  const handleExport = () => {
    window.location.href = "/api/usage/export";
    showToast("success", "Usage report export started.");
  };

  // If we have initialData, we NEVER show the skeleton on first load
  const showSkeleton = isLoading && !initialData;

  return (
    <div className="min-h-screen bg-[#f4f2ed] text-[#18181b] selection:bg-zinc-200">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col items-start gap-8 p-6 md:flex-row md:py-12">
        <Sidebar 
          totalUsage={currentData?.totalUsage || 0} 
          plan={currentPlan} 
          limit={currentLimit} 
          isUnlimited={isUnlimited} 
          alerts={alerts}
          onUpdate={fetchUsageData}
        />
        
        <main className="min-w-0 flex-1 space-y-8">
          {/* Header */}
          <div className="rounded-[32px] border border-zinc-200 bg-white/50 p-8 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">Intelligence / Analytics</p>
                <h1 className="font-serif text-5xl font-bold tracking-tight">Usage Center</h1>
              </div>
              <button
                onClick={handleExport}
                className="group flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-600 transition hover:bg-zinc-900 hover:text-white shadow-sm"
              >
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
                  <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Export CSV
              </button>
            </div>
          </div>

          {showSkeleton ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-64 animate-pulse rounded-[32px] bg-white border border-zinc-200" />
              ))}
            </div>
          ) : (
            <>
              {/* Reset Info */}
              {currentData?.resetDate && (
                <div className="flex items-center gap-3 rounded-2xl bg-zinc-900 px-6 py-4 text-white shadow-xl">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
                      <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Next Quota Reset</p>
                    <p className="text-xs font-medium">
                      {new Date(currentData.resetDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              )}

              {/* Quota Health Grid */}
              {currentData?.keys && currentData.keys.length > 0 ? (
                <QuotaHealthGrid keys={currentData.keys} onUpdate={fetchUsageData} />
              ) : (
                <div className="rounded-[32px] border border-zinc-200 border-dashed p-12 text-center bg-white/30">
                  <p className="text-sm font-medium text-zinc-400">No active API keys found for tracking.</p>
                  <Link href="/dashboards" className="mt-4 inline-block text-[10px] font-black uppercase tracking-widest text-zinc-900 hover:underline">
                    Create your first key →
                  </Link>
                </div>
              )}

              {/* Bottom Section */}
              <div className="grid gap-8 lg:grid-cols-2">
                <TopReposTable data={currentData?.globalTopRepos || []} />
                
                <div className="flex flex-col gap-8">
                  <div className="rounded-[32px] border border-zinc-200 bg-white p-8 shadow-sm">
                    <h3 className="font-serif text-xl font-bold mb-4">Usage Philosophy</h3>
                    <p className="text-sm leading-relaxed text-zinc-500">
                      We track repository summaries to help you optimize your intelligent credits. 
                      Credits are consumed only on successful AI generation.
                    </p>
                    <div className="mt-6 flex items-center gap-4">
                      <div className="h-px flex-1 bg-zinc-100" />
                      <Link href="/playground" className="text-[10px] font-black uppercase tracking-widest text-zinc-900 hover:underline">
                        Launch Playground
                      </Link>
                    </div>
                  </div>

                  <div className="rounded-[32px] border border-zinc-200 bg-[#18181b] p-8 text-white shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Tier Status</p>
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[8px] font-black text-emerald-400">OPTIMIZED</span>
                    </div>
                    <h3 className="font-serif text-2xl font-bold italic mb-6">Need more volume?</h3>
                    <Link 
                      href="/billing"
                      className="w-full text-center block rounded-full bg-white py-3 text-[10px] font-black uppercase tracking-widest text-zinc-900 transition hover:bg-zinc-200"
                    >
                      View Plans
                    </Link>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      <Toast toast={toast} />
    </div>
  );
}
