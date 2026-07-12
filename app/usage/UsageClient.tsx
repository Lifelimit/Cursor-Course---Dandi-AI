"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Toast } from "@/components/ui/Toast";
import { CardSkeleton } from "@/components/ui/SkeletonBlocks";
import { GuidedError } from "@/components/ui/GuidedError";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { StatusPill } from "@/components/command";
import { UsageIntelligenceDashboard } from "@/components/usage/UsageIntelligenceDashboard";
import { useProgressiveList } from "@/hooks/useProgressiveList";
import { useUsageData } from "@/hooks/useUsageData";
import { useToast } from "@/hooks/useToast";
import { createClient } from "@/lib/supabase/client";
import { getPlanLimits } from "@/lib/constants";
import { computeSidebarAlerts } from "@/lib/alerts";
import { getErrorGuidance, getToastErrorMessage } from "@/lib/error-guidance";
import { formatRepositoryLabel } from "@/lib/format";
import type { IngestionJobSummary } from "@/types/rag";
import type { UsageData } from "@/types/usage";

export default function UsageClient({
  initialSession,
  initialData = null,
}: {
  initialSession: Session | null;
  initialData?: UsageData | null;
}) {
  const activeSession = initialSession;
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
    endpoint: "/api/usage?scope=usage",
    initialData,
    fetchOnMount: initialData === null,
    pollingIntervalMs: 20000,
    requestCache: "no-store",
    fallbackErrorMessage: "Failed to load usage analytics.",
    logErrorLabel: "Usage Fetch Error:",
    backgroundSyncResetDelayMs: 600,
    setErrorOnBackground: true,
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
        reviewedUsage?: boolean;
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
      const response = await fetch("/api/rag/jobs?limit=50", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error || "Failed to load repository history.");
      setRecentJobs(Array.isArray(json.jobs) ? json.jobs : []);
      setRecentJobsError(null);
    } catch (error) {
      console.error("Repository History Fetch Error:", error);
      setRecentJobsError(error instanceof Error ? error.message : "Failed to load repository history.");
    } finally {
      setIsLoadingJobs(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchRecentJobs);
  }, [fetchRecentJobs]);

  const currentPlan = currentData?.plan || activeSession?.user?.user_metadata?.plan || "Hobby";
  const { monthlyLimit: currentLimit, isUnlimited, maxLimitCap } = getPlanLimits(currentPlan);
  const totalUsage = currentData?.totalUsage ?? null;
  const resolvedTotalUsage = totalUsage ?? 0;
  const remainingQuota = isUnlimited ? null : Math.max(currentLimit - resolvedTotalUsage, 0);
  const usagePct = isUnlimited || currentLimit <= 0 ? 0 : Math.min((resolvedTotalUsage / currentLimit) * 100, 100);
  const activeKeyCount = currentData?.keys.filter(key => key.is_active).length ?? 0;
  const totalKeyCount = currentData?.keys.length ?? 0;
  const quotaTone = !currentData
    ? "neutral" as const
    : !isUnlimited && resolvedTotalUsage >= currentLimit
      ? "danger" as const
      : !isUnlimited && usagePct >= 80
        ? "warning" as const
        : "success" as const;
  const alerts = computeSidebarAlerts(currentData?.keys || [], maxLimitCap);

  const handleExport = () => {
    window.location.href = "/api/usage/export?days=30";
    showToast("success", "Usage report export started.");
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

  const sortedIngestionJobs = useMemo(() => [...recentJobs].sort((a, b) => {
    const aDate = getJobEventDate(a);
    const bDate = getJobEventDate(b);
    return (bDate ? new Date(bDate).getTime() : 0) - (aDate ? new Date(aDate).getTime() : 0);
  }), [recentJobs]);

  const {
    visibleItems: visibleIngestionJobs,
    visibleCount: visibleJobCount,
    totalCount: totalJobCount,
    canShowMore: canShowMoreJobs,
    canShowLess: canShowLessJobs,
    showMore: handleShowMoreJobs,
    showLess: handleShowLessJobs,
  } = useProgressiveList(sortedIngestionJobs);

  const visibleJobIds = useMemo(() => new Set(visibleIngestionJobs.map(job => job.jobId)), [visibleIngestionJobs]);

  const visibleIngestionGroups = useMemo(() => {
    const groups = new Map<string, { repo: string; jobs: IngestionJobSummary[] }>();
    sortedIngestionJobs.forEach(job => {
      const repo = getRepoLabel(job);
      const key = job.repoUrl || repo;
      const existing = groups.get(key);
      if (existing) existing.jobs.push(job);
      else groups.set(key, { repo, jobs: [job] });
    });

    return Array.from(groups.values())
      .map(group => ({ ...group, totalJobs: group.jobs.length, jobs: group.jobs.filter(job => visibleJobIds.has(job.jobId)) }))
      .filter(group => group.jobs.length > 0);
  }, [sortedIngestionJobs, visibleJobIds]);

  const showSkeleton = isLoading && !currentData;
  const usageStatus = isSyncing
    ? { label: "Syncing usage", tone: "warning" as const, pulse: true }
    : usageError
      ? currentData
        ? { label: "Usage stale", tone: "warning" as const, pulse: false }
        : { label: "Usage unavailable", tone: "danger" as const, pulse: false }
      : !currentData
        ? isLoading
          ? { label: "Loading usage", tone: "info" as const, pulse: true }
          : { label: "Usage unavailable", tone: "danger" as const, pulse: false }
        : { label: "Usage current", tone: "success" as const, pulse: false };

  return (
    <>
      <DashboardShell
        variant="usage"
        sidebar={{
          totalUsage,
          plan: currentPlan,
          limit: currentLimit,
          isUnlimited,
          isUsageStale: Boolean(usageError && currentData),
          alerts,
          onUpdate: refreshUsageData,
        }}
      >
        <DashboardPageHeader
          eyebrow="Usage / Intelligence"
          title="Usage Intelligence"
          description="Understand consumption, quota health, repository demand, and request performance across your workspace."
          rightAction={
            <>
              <StatusPill tone={usageStatus.tone} pulse={usageStatus.pulse}>
                {usageStatus.label}
              </StatusPill>
              <button type="button" onClick={handleExport} className="group flex shrink-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-300 shadow-sm transition hover:border-emerald-300/30 hover:text-emerald-200 sm:px-6">
                <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span className="hidden sm:inline">Export CSV</span><span className="inline sm:hidden">Export</span>
              </button>
            </>
          }
        />

        <details className="group rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-xs text-slate-400 sm:px-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl font-bold text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
            <span>How to read Usage Intelligence</span>
            <span aria-hidden="true" className="text-slate-600 transition group-open:rotate-45">+</span>
          </summary>
          <p className="max-w-3xl pt-3 leading-5 text-slate-500">Start with quota telemetry for capacity, then use trends and request health to understand behavior. Repository demand, credential footprint, and processing activity explain where the volume comes from.</p>
        </details>

        {showSkeleton ? (
          <div className="space-y-6" role="status" aria-live="polite" aria-busy="true">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300/70">Loading usage intelligence...</p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map(index => <CardSkeleton key={index} lines={4} className="h-64 rounded-[32px]" />)}</div>
          </div>
        ) : (
          <div className="space-y-6">
            {usageError && !currentData && <GuidedError {...getErrorGuidance({ workflow: "usage", message: usageError })} technicalDetails={usageError} onAction={() => refreshUsageData(false)} actionLabel="Refresh" />}
            {usageError && currentData && <GuidedError {...{ ...getErrorGuidance({ workflow: "usage", message: usageError }), explanation: "Usage Intelligence could not refresh. The panels below show the last loaded data.", nextAction: "Refresh usage analytics when your connection or the usage service is available." }} technicalDetails={usageError} onAction={() => refreshUsageData(false)} actionLabel="Refresh" compact />}
            {currentData && <UsageIntelligenceDashboard
              currentData={currentData}
              currentPlan={currentPlan}
              currentLimit={currentLimit}
              isUnlimited={isUnlimited}
              remainingQuota={remainingQuota}
              usagePct={usagePct}
              quotaTone={quotaTone}
              activeKeyCount={activeKeyCount}
              totalKeyCount={totalKeyCount}
              visibleIngestionGroups={visibleIngestionGroups}
              sortedIngestionJobCount={sortedIngestionJobs.length}
              isLoadingJobs={isLoadingJobs}
              recentJobsError={recentJobsError}
              onRefreshJobs={fetchRecentJobs}
              visibleJobCount={visibleJobCount}
              totalJobCount={totalJobCount}
              canShowMoreJobs={canShowMoreJobs}
              canShowLessJobs={canShowLessJobs}
              onShowMoreJobs={handleShowMoreJobs}
              onShowLessJobs={handleShowLessJobs}
            />}
          </div>
        )}
      </DashboardShell>
      <Toast toast={toast} />
    </>
  );
}
