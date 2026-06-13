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
import { CommandPanel, StatusPill, TabsBar } from "@/components/command";

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
    dailyTrend: {
      date: string;
      count: number;
      success: number;
      error: number;
      avgLatency: number;
    }[];
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
    // Setup initial paint refresh delay
    const initialTimer = setTimeout(() => {
      fetchUsageData(false);
    }, initialData ? 1000 : 0);

    // Poll every 20 seconds to keep analytics hot without making the header feel busy.
    const pollingInterval = setInterval(() => {
      fetchUsageData(true);
    }, 20000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(pollingInterval);
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
                <StatusPill tone={isSyncing ? "warning" : "success"} pulse={isSyncing}>
                  {isSyncing ? "Syncing Telemetry" : "Telemetry Online"}
                </StatusPill>
                <button
                  onClick={handleExport}
                  className="group flex shrink-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-300 shadow-sm transition hover:border-emerald-300/30 hover:text-emerald-200 sm:px-6 cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor">
                    <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="hidden sm:inline">Export CSV</span>
                  <span className="inline sm:hidden">Export</span>
                </button>
              </>
            }
          >
            {/* Tabs Switch */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-8">
              <TabsBar
                tabs={[
                  { id: "credentials", label: "Active Credentials" },
                  { id: "analytics", label: "Analytics & Trends" },
                ]}
                activeId={activeTab}
                onChange={(id) => setActiveTab(id as "credentials" | "analytics")}
                variant="pills"
              />

              {currentData?.resetDate && (
                <div className="flex shrink-0 items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/10 px-3 py-1.5 mb-3 sm:mb-4">
                  <svg viewBox="0 0 24 24" className="h-3 w-3 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-200">
                    Resets {new Date(currentData.resetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              )}
            </div>
          </DashboardPageHeader>

          {showSkeleton ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-64 animate-pulse rounded-[32px] bg-slate-950/40 border border-white/5" />
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Reset Info moved to Header */}

              {activeTab === "credentials" ? (
                <div className="space-y-8 animate-in fade-in duration-500">
                  {/* Quota Health Grid */}
                  {currentData?.keys && currentData.keys.length > 0 ? (
                    <QuotaHealthGrid
                      keys={currentData.keys}
                      planMonthlyLimit={isUnlimited ? null : currentLimit}
                      onUpdate={() => fetchUsageData(true)}
                    />
                  ) : (
                    <CommandPanel className="border-dashed p-12 text-center">
                      <p className="text-sm font-medium text-slate-400">No active API keys found for tracking.</p>
                      <Link href="/dashboards" className="mt-4 inline-block text-[10px] font-black uppercase tracking-widest text-emerald-300 hover:underline">
                        Create your first key →
                      </Link>
                    </CommandPanel>
                  )}

                  {/* Bottom Section */}
                  <div className="grid gap-8 lg:grid-cols-2">
                    <TopReposTable data={currentData?.globalTopRepos || []} />
                    
                    <div className="flex flex-col gap-8">
                      <CommandPanel className="p-6 sm:p-8">
                        <h3 className="font-serif text-xl font-bold mb-4 text-white">Usage Philosophy</h3>
                        <p className="text-sm leading-relaxed text-slate-400">
                          We track repository summaries to help you optimize your intelligent credits. 
                          Credits are consumed only on successful AI generation.
                        </p>
                        <div className="mt-6 flex items-center gap-4">
                          <div className="h-px flex-1 bg-white/10" />
                          <Link href="/playground" className="text-[10px] font-black uppercase tracking-widest text-emerald-300 hover:underline">
                            Launch Playground
                          </Link>
                        </div>
                      </CommandPanel>

                      <CommandPanel className="p-6 text-white sm:p-8">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Tier Status</p>
                          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[8px] font-black text-emerald-400">OPTIMIZED</span>
                        </div>
                        <h3 className="font-serif text-2xl font-bold italic mb-6">Need more volume?</h3>
                        <Link 
                          href="/billing"
                          className="w-full text-center block rounded-full bg-white py-3 text-[10px] font-black uppercase tracking-widest text-zinc-950 transition hover:bg-zinc-200 cursor-pointer"
                        >
                          View Plans
                        </Link>
                      </CommandPanel>
                    </div>
                  </div>
                </div>
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
            </div>
          )}
      </DashboardShell>

      <Toast toast={toast} />
    </>
  );
}
