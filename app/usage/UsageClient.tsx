"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { ProgressiveListFooter } from "@/components/ui/ProgressiveListFooter";
import { CardSkeleton, TableRowsSkeleton } from "@/components/ui/SkeletonBlocks";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { QuotaHealthGrid } from "@/components/usage/QuotaHealthGrid";
import { TopReposTable } from "@/components/usage/TopReposTable";
import { AnalyticsDashboard } from "@/components/usage/AnalyticsDashboard";
import { CommandPanel, StatusPill, TabsBar } from "@/components/command";
import { useProgressiveList } from "@/hooks/useProgressiveList";

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

type IngestionJobSummary = {
  jobId: string;
  status: "queued" | "running" | "completed" | "failed";
  currentStep?: string;
  repoUrl: string;
  repoName?: string | null;
  errorMessage?: string | null;
  indexedFileCount?: number | null;
  chunkCount?: number | null;
  indexAvailable?: boolean;
  createdAt?: string;
  completedAt?: string | null;
  failedAt?: string | null;
  updatedAt?: string;
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
  const [recentJobs, setRecentJobs] = useState<IngestionJobSummary[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
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

  const fetchRecentJobs = useCallback(async () => {
    setIsLoadingJobs(true);
    try {
      const res = await fetch("/api/rag/jobs?limit=50", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Failed to load repository history.");
      }
      setRecentJobs(Array.isArray(json.jobs) ? json.jobs : []);
    } catch (err) {
      console.error("Repository History Fetch Error:", err);
    } finally {
      setIsLoadingJobs(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchRecentJobs);
  }, [fetchRecentJobs]);

  const currentData = data || initialData;
  const currentPlan = activeSession?.user?.user_metadata?.plan || "Hobby";
  const { monthlyLimit: currentLimit, isUnlimited, maxLimitCap } = getPlanLimits(currentPlan);

  const alerts = computeSidebarAlerts(currentData?.keys || [], maxLimitCap);

  const handleExport = () => {
    window.location.href = "/api/usage/export";
    showToast("success", "Usage report export started.");
  };

  const formatJobDate = (value?: string | null) => {
    if (!value) return "Pending";
    return new Date(value).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getJobTone = (status: IngestionJobSummary["status"]) => {
    if (status === "completed") return "success" as const;
    if (status === "failed") return "danger" as const;
    if (status === "running") return "warning" as const;
    return "info" as const;
  };

  const getJobEventDate = (job: IngestionJobSummary) => job.failedAt || job.completedAt || job.updatedAt || job.createdAt;

  const getRepoLabel = (job: IngestionJobSummary) => {
    if (job.repoName) return job.repoName;
    try {
      return job.repoUrl.replace("https://github.com/", "").replace(/\/$/, "");
    } catch {
      return "Unknown repository";
    }
  };

  const getStatusLabel = (job: IngestionJobSummary) => {
    if (job.status === "completed") return "Success";
    if (job.status === "failed") return "Failed";
    if (job.status === "running") return "Running";
    return "Queued";
  };

  const sortedIngestionJobs = useMemo(() => {
    return [...recentJobs].sort((a, b) => {
      const aDate = getJobEventDate(a);
      const bDate = getJobEventDate(b);
      const aTimestamp = aDate ? new Date(aDate).getTime() : 0;
      const bTimestamp = bDate ? new Date(bDate).getTime() : 0;
      return bTimestamp - aTimestamp;
    });
  }, [recentJobs]);

  const {
    visibleItems: visibleIngestionJobs,
    visibleCount: visibleJobCount,
    totalCount: totalJobCount,
    canShowMore: canShowMoreJobs,
    canShowLess: canShowLessJobs,
    showMore: handleShowMoreJobs,
    showLess: handleShowLessJobs,
  } = useProgressiveList(sortedIngestionJobs);

  const visibleJobIds = useMemo(() => {
    return new Set(visibleIngestionJobs.map((job) => job.jobId));
  }, [visibleIngestionJobs]);

  const groupedIngestionJobs = useMemo(() => {
    const groups = new Map<string, { repo: string; jobs: IngestionJobSummary[] }>();

    sortedIngestionJobs.forEach((job) => {
      const repo = getRepoLabel(job);
      const key = job.repoUrl || repo;
      const existing = groups.get(key);
      if (existing) {
        existing.jobs.push(job);
      } else {
        groups.set(key, { repo, jobs: [job] });
      }
    });

    return Array.from(groups.values());
  }, [sortedIngestionJobs]);

  const visibleIngestionGroups = useMemo(() => {
    return groupedIngestionJobs
      .map((group) => ({
        ...group,
        totalJobs: group.jobs.length,
        jobs: group.jobs.filter((job) => visibleJobIds.has(job.jobId)),
      }))
      .filter((group) => group.jobs.length > 0);
  }, [groupedIngestionJobs, visibleJobIds]);

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
            eyebrow="Usage / Analytics"
            title="Usage Center"
            description="Track quota health, request activity, and repository usage trends."
            rightAction={
              <>
                <StatusPill tone={isSyncing ? "warning" : "success"} pulse={isSyncing}>
                  {isSyncing ? "Syncing Usage" : "Usage Updated"}
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
                  { id: "credentials", label: "API Keys" },
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
            <div className="space-y-6" role="status" aria-live="polite" aria-busy="true">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300/70">Loading usage center...</p>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => (
                  <CardSkeleton key={i} lines={4} className="h-64 rounded-[32px]" />
                ))}
              </div>
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
                      planMonthlyLimit={maxLimitCap}
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
                        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Repository History</p>
                            <h3 className="mt-1 font-serif text-xl font-bold text-white">Recent ingestion jobs</h3>
                          </div>
                          <StatusPill tone={isLoadingJobs ? "warning" : "info"} pulse={isLoadingJobs} compact>
                            {isLoadingJobs ? "Loading" : `${sortedIngestionJobs.length} Jobs`}
                          </StatusPill>
                        </div>

                        {isLoadingJobs && sortedIngestionJobs.length === 0 ? (
                          <div role="status" aria-live="polite" aria-busy="true" className="space-y-3">
                            <p className="text-xs font-semibold text-slate-400">Loading recent ingestion history...</p>
                            <TableRowsSkeleton rows={4} columns={3} />
                          </div>
                        ) : sortedIngestionJobs.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/50 p-5 text-sm font-medium text-slate-400">
                            <p className="font-bold text-slate-300">No ingestion history yet.</p>
                            <p className="mt-1">Indexed repositories will appear here.</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="space-y-3">
                            {visibleIngestionGroups.map((group) => {
                              const latestJob = group.jobs[0];
                              const eventDate = getJobEventDate(latestJob);
                              return (
                                <details key={latestJob.repoUrl || group.repo} className="group rounded-2xl border border-white/10 bg-slate-950/60 p-4 transition-colors open:border-emerald-300/20 open:bg-slate-950/80">
                                  <summary className="flex cursor-pointer list-none flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex min-w-0 items-center gap-2">
                                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" strokeWidth="2.5">
                                          <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <p className="truncate text-xs font-black text-white">
                                          {group.repo}
                                        </p>
                                      </div>
                                      <p className="mt-1 pl-5 font-mono text-[10px] text-slate-500">
                                        Last run: {formatJobDate(eventDate)}
                                      </p>
                                      <p className="mt-2 pl-5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                        Total jobs: {group.totalJobs}
                                      </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                      <StatusPill tone={getJobTone(latestJob.status)} compact>
                                        {getStatusLabel(latestJob)}
                                      </StatusPill>
                                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                                        Expand runs
                                      </span>
                                    </div>
                                  </summary>

                                  <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                                    {group.jobs.map((job) => {
                                      const files = typeof job.indexedFileCount === "number" ? job.indexedFileCount.toLocaleString() : "0";
                                      const chunks = typeof job.chunkCount === "number" ? job.chunkCount.toLocaleString() : "0";
                                      const runDate = getJobEventDate(job);
                                      return (
                                        <div key={job.jobId} className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
                                          <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="min-w-0">
                                              <p className="font-mono text-[10px] font-bold text-slate-300">
                                                {formatJobDate(runDate)}
                                              </p>
                                              <div className="mt-2 flex flex-wrap gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">
                                                <span>{files} files</span>
                                                <span>{chunks} chunks</span>
                                                <span>{job.indexAvailable ? "Index available" : "Index unavailable"}</span>
                                              </div>
                                            </div>
                                            <StatusPill tone={getJobTone(job.status)} compact>
                                              {getStatusLabel(job)}
                                            </StatusPill>
                                          </div>
                                          {job.status === "failed" && job.errorMessage && (
                                            <div className="mt-3 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-xs font-semibold leading-relaxed text-rose-300">
                                              <p className="truncate">{job.errorMessage}</p>
                                              <details className="mt-2">
                                                <summary className="cursor-pointer text-[9px] font-black uppercase tracking-widest text-rose-200 transition-colors hover:text-white">
                                                  View Details
                                                </summary>
                                                <p className="mt-2 whitespace-pre-wrap break-words border-t border-rose-300/10 pt-2 text-rose-100/90">
                                                  {job.errorMessage}
                                                </p>
                                              </details>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </details>
                              );
                            })}
                            </div>

                            <ProgressiveListFooter
                              visibleCount={visibleJobCount}
                              totalCount={totalJobCount}
                              itemLabel="jobs"
                              canShowMore={canShowMoreJobs}
                              canShowLess={canShowLessJobs}
                              onShowMore={handleShowMoreJobs}
                              onShowLess={handleShowLessJobs}
                            />
                          </div>
                        )}
                      </CommandPanel>

                      <CommandPanel className="p-6 sm:p-8">
                        <h3 className="font-serif text-xl font-bold mb-4 text-white">How usage works</h3>
                        <p className="text-sm leading-relaxed text-slate-400">
                          We track repository summaries to help you manage monthly credits.
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
                          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Plan Status</p>
                          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[8px] font-black text-emerald-400">ACTIVE</span>
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
