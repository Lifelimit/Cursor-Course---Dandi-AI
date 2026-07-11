"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DashboardQuickActions } from "@/components/dashboard/DashboardQuickActions";
import { DashboardOperationalSnapshot } from "@/components/dashboard/DashboardOperationalSnapshot";
import { DashboardOnboarding } from "@/components/dashboard/DashboardOnboarding";
import { DashboardRecentActivity } from "@/components/dashboard/DashboardRecentActivity";
import { RecentRepositoryWork } from "@/components/dashboard/RecentRepositoryWork";
import { WorkspaceReadiness } from "@/components/dashboard/WorkspaceReadiness";
import { GuidedError } from "@/components/ui/GuidedError";
import { getErrorGuidance } from "@/lib/error-guidance";
import { computeSidebarAlerts } from "@/lib/alerts";
import { getPlanLimits } from "@/lib/constants";
import { useUsageData } from "@/hooks/useUsageData";
import type { UsageData } from "@/types/usage";
import type { DashboardRepositoryWork } from "@/components/dashboard/dashboard-types";

function getDisplayName(initialDisplayName: string | null, user: User) {
  const profileName = initialDisplayName?.trim();
  if (profileName) return profileName;

  const metadata = user.user_metadata as { full_name?: unknown } | undefined;
  return typeof metadata?.full_name === "string" && metadata.full_name.trim() ? metadata.full_name.trim() : null;
}

export default function DashboardClient({
  initialUser,
  initialDisplayName,
  initialGreeting,
  initialUsageData,
  initialRecentWork,
  initialGithubConnected,
  initialHasRepositoryActivity,
  initialHasIndexedRepository,
}: {
  initialUser: User;
  initialDisplayName: string | null;
  initialGreeting: string;
  initialUsageData: UsageData | null;
  initialRecentWork: DashboardRepositoryWork[];
  initialGithubConnected: boolean | null;
  initialHasRepositoryActivity: boolean;
  initialHasIndexedRepository: boolean;
}) {
  const router = useRouter();
  const { currentData: usageData, isLoading, isSyncing, error: usageError, refresh: refreshUsageData } = useUsageData<UsageData>({
    initialData: initialUsageData,
    initialRefreshDelayMs: initialUsageData ? 1500 : 0,
    pollingIntervalMs: null,
    requireOkResponse: true,
    logErrors: false,
    setErrorOnBackground: false,
  });

  const currentPlan = usageData?.plan || (initialUser.user_metadata as { plan?: string } | undefined)?.plan || "Hobby";
  const { monthlyLimit: currentLimit, isUnlimited, maxLimitCap } = getPlanLimits(currentPlan);
  const totalUsage = usageData?.totalUsage ?? null;
  const isInitialDashboardLoading = isLoading && !usageData;
  const activeApiKeyCount = usageData ? usageData.keys.filter((key) => key.is_active).length : null;
  const hasRepositoryActivity = Boolean(
    initialHasRepositoryActivity ||
    usageData?.globalTopRepos?.length ||
    initialRecentWork.some((work) => work.summaryAvailable || work.status === "completed"),
  );
  const hasIndexedRepository = Boolean(initialHasIndexedRepository || initialRecentWork.some((work) => work.indexAvailable));
  const alerts = computeSidebarAlerts(usageData?.keys || [], maxLimitCap);
  const displayName = getDisplayName(initialDisplayName, initialUser);

  const usagePct = totalUsage === null || isUnlimited || currentLimit <= 0
    ? 0
    : Math.min((totalUsage / currentLimit) * 100, 100);
  const usageRemainingDetail = totalUsage === 0
    ? "No requests yet"
    : `${Math.max(currentLimit - (totalUsage || 0), 0).toLocaleString()} requests remain this cycle.`;
  const usageStatus = !usageData
    ? { label: isInitialDashboardLoading ? "Loading…" : "Unavailable", tone: "neutral" as const, detail: "Usage data has not loaded yet." }
    : isUnlimited
      ? { label: "Healthy", tone: "success" as const, detail: "Your plan has no monthly request cap." }
      : usagePct >= 100
        ? { label: "Limit reached", tone: "danger" as const, detail: "Review Usage or Billing before starting high-volume work." }
        : usagePct >= 80
          ? { label: "Review soon", tone: "warning" as const, detail: usageRemainingDetail }
          : { label: "Healthy", tone: "success" as const, detail: usageRemainingDetail };

  const failedWork = initialRecentWork.find((work) => work.status === "failed");
  const attentionItems = [
    usageData?.subscriptionStatus === "past_due" || usageData?.subscriptionStatus === "unpaid"
      ? { label: "Billing needs attention", detail: "Your subscription is not in a healthy payment state.", href: "/billing", action: "Review billing", tone: "danger" as const }
      : null,
    !usageData && !isInitialDashboardLoading
      ? { label: "Usage data unavailable", detail: "The workspace is still usable, but capacity information could not be confirmed.", href: "/usage", action: "Open Usage", tone: "warning" as const }
      : usagePct >= 100
        ? { label: "Capacity limit reached", detail: "Your current plan has no remaining request capacity for this cycle.", href: "/billing", action: "Review plan", tone: "danger" as const }
        : usagePct >= 80
          ? { label: "Capacity is getting close", detail: "You are approaching the current cycle limit.", href: "/usage", action: "View capacity", tone: "warning" as const }
          : null,
    failedWork
      ? { label: "Repository processing needs a retry", detail: failedWork.errorMessage || "Dandi could not complete the latest repository workflow.", href: `/playground?mode=summary&repo=${encodeURIComponent(failedWork.repoUrl)}`, action: "Retry workflow", tone: "warning" as const }
      : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <DashboardShell
      variant="dashboard"
      sidebar={{
        totalUsage,
        plan: currentPlan,
        limit: currentLimit,
        isUnlimited,
        alerts,
        onUpdate: async () => {
          await refreshUsageData();
          router.refresh();
        },
      }}
    >
      <div className="space-y-6 pb-4 sm:space-y-8">
        <DashboardPageHeader
          eyebrow={<span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.65)]" aria-hidden="true" /> Workspace Command Center</span>}
          title={displayName ? `${initialGreeting}, ${displayName}` : "Welcome back"}
          description="Monitor workspace readiness, continue recent repository work, and launch the next Dandi workflow."
          rightAction={
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <Link href="/playground?mode=summary" className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full bg-emerald-300 px-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-950 shadow-[0_0_24px_rgba(52,211,153,0.16)] transition hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:flex-none">Analyze repository</Link>
              <Link href="/playground?mode=ask" className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full border border-cyan-300/25 bg-cyan-300/[0.08] px-4 text-[10px] font-black uppercase tracking-[0.15em] text-cyan-100 transition hover:border-cyan-200/50 hover:bg-cyan-300/[0.13] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:flex-none">Ask Dandi</Link>
            </div>
          }
        />

        {usageError && (
          <GuidedError
            {...getErrorGuidance({ workflow: "usage", message: usageError })}
            technicalDetails={usageError}
            explanation={usageData ? "Showing the last known workspace snapshot. Some numbers may be stale." : "Usage data is unavailable, but the rest of the workspace remains available."}
            nextAction="Refresh the usage snapshot when the service is available."
            actionLabel="Refresh snapshot"
            onAction={() => void refreshUsageData()}
            compact
          />
        )}

        <WorkspaceReadiness
          githubConnected={initialGithubConnected}
          activeApiKeyCount={activeApiKeyCount}
          hasRepositoryWork={hasRepositoryActivity}
          usageStatus={usageStatus}
          attentionItems={attentionItems}
        />

        <DashboardQuickActions githubConnected={initialGithubConnected} />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
          <RecentRepositoryWork works={initialRecentWork} />
          <DashboardRecentActivity works={initialRecentWork} />
        </div>

        <DashboardOperationalSnapshot
          usageData={usageData}
          activeApiKeyCount={activeApiKeyCount}
          currentPlan={currentPlan}
          isUnlimited={isUnlimited}
          currentLimit={currentLimit}
        />

        <DashboardOnboarding
          hasRepositoryWork={hasRepositoryActivity}
          hasIndexedRepository={hasIndexedRepository}
          hasApiKey={activeApiKeyCount === null ? null : activeApiKeyCount > 0}
          hasGithubConnection={initialGithubConnected}
        />

        <div className="flex flex-col gap-3 border-t border-white/[0.06] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-600">Need the deeper control plane?</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-black uppercase tracking-[0.15em]">
            <Link href="/usage" className="text-slate-500 transition hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Usage ↗</Link>
            <Link href="/billing" className="text-slate-500 transition hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">Billing ↗</Link>
            <Link href="/account" className="text-slate-500 transition hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">Account ↗</Link>
            <Link href="/docs" className="text-slate-500 transition hover:text-violet-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">Documentation ↗</Link>
          </div>
        </div>

        {isSyncing && <span className="sr-only" role="status" aria-live="polite">Refreshing usage snapshot</span>}
      </div>
    </DashboardShell>
  );
}
