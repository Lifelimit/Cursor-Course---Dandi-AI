"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { ProgressiveListFooter } from "@/components/ui/ProgressiveListFooter";
import { CardSkeleton, TableRowsSkeleton } from "@/components/ui/SkeletonBlocks";
import { GuidedError } from "@/components/ui/GuidedError";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { QuotaHealthGrid } from "@/components/usage/QuotaHealthGrid";
import { TopReposTable } from "@/components/usage/TopReposTable";
import { AnalyticsDashboard } from "@/components/usage/AnalyticsDashboard";
import { CommandPanel, StatusPill, TabsBar } from "@/components/command";
import { useProgressiveList } from "@/hooks/useProgressiveList";
import { useUsageData } from "@/hooks/useUsageData";
import { createClient } from "@/lib/supabase/client";

import { getPlanLimits } from "@/lib/constants";
import { computeSidebarAlerts } from "@/lib/alerts";
import { getErrorGuidance, getToastErrorMessage } from "@/lib/error-guidance";
import { formatJobDateTime, formatRepositoryLabel, formatRequestCount, formatShortDate } from "@/lib/format";
import { getIngestionStatusTone } from "@/lib/status-tones";
import type { IngestionJobSummary } from "@/types/rag";
import type { UsageData } from "@/types/usage";

export default function UsageClient({ 
  initialSession, 
  initialData = null 
}: { 
  initialSession: Session | null, 
  initialData?: UsageData | null 
}) {
  const activeSession = initialSession;
  
  const [activeTab, setActiveTab] = useState<"credentials" | "analytics">("credentials");
  const [recentJobs, setRecentJobs] = useState<IngestionJobSummary[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [recentJobsError, setRecentJobsError] = useState<string | null>(null);
  const { toast, showToast } = useToast();

  const handleUsageError = useCallback((message: string, _error: unknown, context: { background: boolean }) => {
    if (!context.background) {
      showToast("error", getToastErrorMessage("usage", message));
    }
  }, [showToast]);

  const {
    currentData,
    isLoading,
    isSyncing,
    error: usageError,
    refresh: fetchUsageData,
  } = useUsageData({
    initialData,
    endpoint: "/api/usage?scope=summary",
    pollingIntervalMs: 20000,
    requestCache: "no-store",
    fallbackErrorMessage: "Failed to load usage analytics.",
    logErrorLabel: "Usage Fetch Error:",
    backgroundSyncResetDelayMs: 600,
    onError: handleUsageError,
  });
  const refreshUsageData = useCallback(async (background = false) => {
    await fetchUsageData(background);
  }, [fetchUsageData]);

  useEffect(() => {
    const user = activeSession?.user;
    if (!user) return;

    const metadata = user.user_metadata as {
      dandi_onboarding?: {
        started?: boolean;
        reviewedUsage?: boolean;
        dismissed?: boolean;
      };
    };

    if (metadata.dandi_onboarding?.reviewedUsage) return;

    const supabase = createClient();
    void supabase.auth.updateUser({
      data: {
        ...(user.user_metadata || {}),
        dandi_onboarding: {
          ...(metadata.dandi_onboarding || {}),
          reviewedUsage: true,
        },
      },
    });
  }, [activeSession]);

  const fetchRecentJobs = useCallback(async () => {
    setIsLoadingJobs(true);
    try {
      const res = await fetch("/api/rag/jobs?limit=50", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Failed to load repository history.");
      }
      setRecentJobs(Array.isArray(json.jobs) ? json.jobs : []);
      setRecentJobsError(null);
    } catch (err) {
      console.error("Repository History Fetch Error:", err);
      setRecentJobsError(err instanceof Error ? err.message : "Failed to load repository history.");
    } finally {
      setIsLoadingJobs(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchRecentJobs);
  }, [fetchRecentJobs]);

  const currentPlan = activeSession?.user?.user_metadata?.plan || "Hobby";
  const { monthlyLimit: currentLimit, isUnlimited, maxLimitCap } = getPlanLimits(currentPlan);

  const alerts = computeSidebarAlerts(currentData?.keys || [], maxLimitCap);

  const handleExport = () => {
    window.location.href = "/api/usage/export";
    showToast("success", "Usage report export started.");
  };

  const formatJobDate = (value?: string | null) => {
    if (!value) return "Pending";
    return formatJobDateTime(value);
  };

  const getJobEventDate = (job: IngestionJobSummary) => job.failedAt || job.completedAt || job.updatedAt || job.createdAt;

  const getRepoLabel = (job: IngestionJobSummary) => {
    if (job.repoName) return job.repoName;
    try {
      return formatRepositoryLabel(job.repoUrl, { trimTrailingSlash: true });
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
        variant="usage"
        sidebar={{
          totalUsage: currentData?.totalUsage || 0,
          plan: currentPlan,
          limit: currentLimit,
          isUnlimited,
          alerts,
          onUpdate: refreshUsageData,
        }}
      >
          <DashboardPageHeader
            eyebrow="Usage / Analytics"
            title="Usage Center"
            description="Track request usage, API activity, and repository usage trends."
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
                  { id: "credentials", label: "API Keys", controlsId: "usage-credentials-panel" },
                  { id: "analytics", label: "Analytics & Trends", controlsId: "usage-analytics-panel" },
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
                    Resets {formatShortDate(currentData.resetDate)}
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
              {usageError && !currentData && (
                <GuidedError
                  {...getErrorGuidance({ workflow: "usage", message: usageError })}
                  technicalDetails={usageError}
                  onAction={() => refreshUsageData(false)}
                  actionLabel="Refresh"
                />
              )}

              {/* Reset Info moved to Header */}

              {activeTab === "credentials" ? (
                <div
                  id="usage-credentials-panel"
                  role="tabpanel"
                  aria-labelledby="credentials-tab"
                  className="space-y-8 animate-in fade-in duration-500"
                >
                  {/* Quota Health Grid */}
                  {currentData?.keys && currentData.keys.length > 0 ? (
                    <QuotaHealthGrid
                      keys={currentData.keys}
                      planMonthlyLimit={maxLimitCap}
                      onUpdate={() => refreshUsageData(true)}
                    />
                  ) : (
                    <CommandPanel className="border-dashed p-8 text-center sm:p-12">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300/70">Request Usage</p>
                      <h3 className="mt-2 font-serif text-2xl font-bold text-white">No API keys are being tracked yet.</h3>
                      <p className="mx-auto mt-2 max-w-xl text-sm font-medium leading-6 text-slate-400">
                        Usage data appears after you create an API key and send successful repository requests. Start with a key, then analyze a repository in the Playground.
                      </p>
                      <Link href="/dashboards" className="mt-5 inline-flex min-h-10 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100 transition hover:border-emerald-300/45 hover:bg-emerald-300/15">
                        Create API Key
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
                        ) : recentJobsError ? (
                          <GuidedError
                            {...getErrorGuidance({ workflow: "usage", message: recentJobsError })}
                            technicalDetails={recentJobsError}
                            onAction={fetchRecentJobs}
                            actionLabel="Refresh"
                            compact
                          />
                        ) : sortedIngestionJobs.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/50 p-5 text-sm font-medium text-slate-400">
                            <p className="font-bold text-slate-200">No repository preparation history yet.</p>
                            <p className="mt-1 leading-6">
                              Ask a Repository prepares code for source-backed questions. Completed and failed preparation jobs will appear here.
                            </p>
                            <Link href="/playground?mode=ask" className="mt-4 inline-flex text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300 hover:underline">
                              Open Ask a Repository
                            </Link>
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
                                      <StatusPill tone={getIngestionStatusTone(latestJob.status)} compact>
                                        {getStatusLabel(latestJob)}
                                      </StatusPill>
                                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                                        Expand runs
                                      </span>
                                    </div>
                                  </summary>

                                  <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                                    {group.jobs.map((job) => {
                                      const files = typeof job.indexedFileCount === "number" ? formatRequestCount(job.indexedFileCount) : "0";
                                      const chunks = typeof job.chunkCount === "number" ? formatRequestCount(job.chunkCount) : "0";
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
                                            <StatusPill tone={getIngestionStatusTone(job.status)} compact>
                                              {getStatusLabel(job)}
                                            </StatusPill>
                                          </div>
                                          {job.status === "failed" && job.errorMessage && (
                                            <GuidedError
                                              {...getErrorGuidance({ workflow: "repository-indexing", message: job.errorMessage })}
                                              technicalDetails={{
                                                jobId: job.jobId,
                                                repository: job.repoUrl,
                                                status: job.status,
                                                step: job.currentStep,
                                                error: job.errorMessage,
                                                failedAt: job.failedAt,
                                              }}
                                              compact
                                              className="mt-3"
                                            />
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
                          We track repository summaries to help you manage monthly requests.
                          Requests are counted only after successful AI generation.
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
                <div
                  id="usage-analytics-panel"
                  role="tabpanel"
                  aria-labelledby="analytics-tab"
                  className="animate-in fade-in duration-500"
                >
                  <AnalyticsDashboard
                    keys={currentData?.keys || []}
                    globalTopRepos={currentData?.globalTopRepos || []}
                    avgLatency={currentData?.avgLatency || 0}
                    successRate={currentData?.successRate || 0}
                    dailyAnalytics={currentData?.dailyAnalytics || []}
                    onUpdate={refreshUsageData}
                  />
                </div>
              )}
            </div>
          )}
      </DashboardShell>

      <Toast toast={toast} />
    </>
  );
}
