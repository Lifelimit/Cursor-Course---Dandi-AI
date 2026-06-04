"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { QuotaHealthGrid } from "@/components/usage/QuotaHealthGrid";
import { TopReposTable } from "@/components/usage/TopReposTable";
import { AnalyticsDashboard } from "@/components/usage/AnalyticsDashboard";

import { getPlanLimits } from "@/lib/constants";
import { computeSidebarAlerts } from "@/lib/alerts";

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
  avgLatency?: number;
  successRate?: number;
  dailyAnalytics?: {
    date: string;
    count: number;
    success: number;
    error: number;
    avgLatency: number;
  }[];
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
  const [activeTab, setActiveTab] = useState<"credentials" | "analytics">("credentials");
  const [isLoading, setIsLoading] = useState(initialData === null);
  const isHydrated = useRef(initialData !== null);
  const { toast, showToast } = useToast();

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>("Just now");

  const fetchUsageData = useCallback(async (background = false) => {
    try {
      if (background) {
        setIsSyncing(true);
      } else if (!isHydrated.current) {
        setIsLoading(true);
      }
      
      const res = await fetch("/api/usage", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Failed to load usage analytics.");
      }
      setData(json);
      isHydrated.current = false;
      if (background) {
        setLastSyncedTime("Just now");
      }
    } catch (err) {
      console.error("Usage Fetch Error:", err);
      if (!background) {
        showToast("error", "Failed to load usage analytics.");
      }
    } finally {
      setIsLoading(false);
      if (background) {
        setTimeout(() => setIsSyncing(false), 600);
      }
    }
  }, [showToast]);

  useEffect(() => {
    let syncCount = 0;
    
    // Setup initial paint refresh delay
    const initialTimer = setTimeout(() => {
      fetchUsageData(false);
    }, initialData ? 1000 : 0);

    // Poll every 10 seconds to keep analytics hot and live
    const pollingInterval = setInterval(() => {
      fetchUsageData(true);
      syncCount = 0;
    }, 10000);

    // Track relative delta time every 2 seconds
    const syncTimeInterval = setInterval(() => {
      syncCount += 2;
      if (syncCount === 0) {
        setLastSyncedTime("Just now");
      } else {
        setLastSyncedTime(`${syncCount}s ago`);
      }
    }, 2000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(pollingInterval);
      clearInterval(syncTimeInterval);
    };
  }, [fetchUsageData, initialData]);

  const currentData = data || initialData;
  const currentPlan = activeSession?.user?.user_metadata?.plan || "Hobby";
  const { monthlyLimit: currentLimit, isUnlimited } = getPlanLimits(currentPlan);

  const alerts = computeSidebarAlerts(currentData?.keys || []);

  const handleExport = () => {
    window.location.href = "/api/usage/export";
    showToast("success", "Usage report export started.");
  };

  // If we have initialData, we NEVER show the skeleton on first load
  const showSkeleton = isLoading && !initialData;

  return (
    <>
      <DashboardShell
        sidebar={{
          totalUsage: currentData?.totalUsage || 0,
          plan: currentPlan,
          limit: currentLimit,
          isUnlimited,
          alerts,
          onUpdate: fetchUsageData,
        }}
      >
          <DashboardPageHeader
            eyebrow="Intelligence / Analytics"
            title="Usage Center"
            description="Track quota health, live telemetry, and repository usage trends."
            rightAction={
              <>
                <div className="flex max-w-full items-center gap-2.5 rounded-full border border-zinc-200 bg-white/80 px-4 py-2 shadow-sm transition-all dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="relative flex h-2 w-2 shrink-0">
                    <span className={`absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 ${isSyncing ? "animate-ping scale-150" : "animate-pulse"}`} />
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isSyncing ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-emerald-500"}`} />
                  </div>
                  <span className="flex min-w-0 items-center gap-1.5 font-mono text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                    {isSyncing ? (
                      <span className="animate-pulse font-bold text-emerald-500">Syncing...</span>
                    ) : (
                      <>
                        Telemetry Active <span className="text-zinc-200 dark:text-zinc-800">|</span> <span className="text-[8px] font-bold tabular-nums text-zinc-400 dark:text-zinc-500">Synced {lastSyncedTime}</span>
                      </>
                    )}
                  </span>
                </div>
                <button
                  onClick={handleExport}
                  className="group flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-600 shadow-sm transition hover:bg-zinc-900 hover:text-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-100 dark:hover:text-zinc-950"
                >
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
                    <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Export CSV
                </button>
              </>
            }
          />

          {showSkeleton ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-64 animate-pulse rounded-[32px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800" />
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

              {/* Tabs Switch */}
              <div className="flex gap-6 overflow-x-auto border-b border-zinc-200 pb-3 scrollbar-hide dark:border-zinc-800">
                <button
                  onClick={() => setActiveTab("credentials")}
                  className={`text-[10px] font-black uppercase tracking-widest transition-all pb-1.5 border-b-2 outline-none ${
                    activeTab === "credentials"
                      ? "text-zinc-900 dark:text-white border-zinc-900 dark:border-zinc-100"
                      : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 border-transparent"
                  }`}
                >
                  Active Credentials
                </button>
                <button
                  onClick={() => setActiveTab("analytics")}
                  className={`text-[10px] font-black uppercase tracking-widest transition-all pb-1.5 border-b-2 outline-none ${
                    activeTab === "analytics"
                      ? "text-zinc-900 dark:text-white border-zinc-900 dark:border-zinc-100"
                      : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 border-transparent"
                  }`}
                >
                  Analytics & Trends
                </button>
              </div>

              {activeTab === "credentials" ? (
                <>
                  {/* Quota Health Grid */}
                  {currentData?.keys && currentData.keys.length > 0 ? (
                    <QuotaHealthGrid keys={currentData.keys} onUpdate={() => fetchUsageData(true)} />
                  ) : (
                    <div className="rounded-[32px] border border-zinc-200 dark:border-zinc-800 border-dashed p-12 text-center bg-white/30 dark:bg-zinc-900/10">
                      <p className="text-sm font-medium text-zinc-400 dark:text-zinc-500">No active API keys found for tracking.</p>
                      <Link href="/dashboards" className="mt-4 inline-block text-[10px] font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100 hover:underline">
                        Create your first key →
                      </Link>
                    </div>
                  )}

                  {/* Bottom Section */}
                  <div className="grid gap-8 lg:grid-cols-2">
                    <TopReposTable data={currentData?.globalTopRepos || []} />
                    
                    <div className="flex flex-col gap-8">
                      <div className="rounded-[32px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 shadow-sm">
                        <h3 className="font-serif text-xl font-bold mb-4">Usage Philosophy</h3>
                        <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                          We track repository summaries to help you optimize your intelligent credits. 
                          Credits are consumed only on successful AI generation.
                        </p>
                        <div className="mt-6 flex items-center gap-4">
                          <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800" />
                          <Link href="/playground" className="text-[10px] font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100 hover:underline">
                            Launch Playground
                          </Link>
                        </div>
                      </div>

                      <div className="rounded-[32px] border border-zinc-200 dark:border-zinc-800 bg-[#18181b] dark:bg-zinc-900/50 p-8 text-white shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Tier Status</p>
                          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[8px] font-black text-emerald-400">OPTIMIZED</span>
                        </div>
                        <h3 className="font-serif text-2xl font-bold italic mb-6">Need more volume?</h3>
                        <Link 
                          href="/billing"
                          className="w-full text-center block rounded-full bg-white dark:bg-zinc-100 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-950 transition hover:bg-zinc-200 dark:hover:bg-zinc-200/80"
                        >
                          View Plans
                        </Link>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* Analytics & Trends Tab */
                <AnalyticsDashboard
                  keys={currentData?.keys || []}
                  globalTopRepos={currentData?.globalTopRepos || []}
                  avgLatency={currentData?.avgLatency || 0}
                  successRate={currentData?.successRate || 0}
                  dailyAnalytics={currentData?.dailyAnalytics || []}
                  onUpdate={fetchUsageData}
                />
              )}
            </>
          )}
      </DashboardShell>

      <Toast toast={toast} />
    </>
  );
}
