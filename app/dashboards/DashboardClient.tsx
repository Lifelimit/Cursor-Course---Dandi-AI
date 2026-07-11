"use client";

import { useState } from "react";
import Link from "next/link";
import { useApiKeys } from "@/hooks/useApiKeys";
import { useUsageData } from "@/hooks/useUsageData";
import { useToast } from "@/hooks/useToast";
import { ApiKey } from "@/types/api";
import { Toast } from "@/components/ui/Toast";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { ApiKeyModal } from "@/components/dashboard/ApiKeyModal";
import { CommandPanel, ModalFrame } from "@/components/command";
import { getPlanLimits } from "@/lib/constants";
import { computeSidebarAlerts } from "@/lib/alerts";
import { ApiKeyTable } from "@/components/dashboard/ApiKeyTable";
import { RevocationModal } from "@/components/dashboard/RevocationModal";
import { DashboardOverviewCards } from "@/components/dashboard/DashboardOverviewCards";
import { PlanStatusCard } from "@/components/dashboard/PlanStatusCard";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { GettingStartedChecklist } from "@/components/dashboard/GettingStartedChecklist";
import { EyeOffIcon, ShieldIcon, CopyLockedIcon, CopyCheckIcon } from "@/components/icons";
import { GuidedError } from "@/components/ui/GuidedError";
import { getErrorGuidance, getToastErrorMessage } from "@/lib/error-guidance";
import { formatPercentage } from "@/lib/format";
import type { DailyUsageTrend, UsageData } from "@/types/usage";

import { DecryptingKeyText } from "@/components/ui/DecryptingKeyText";

const FIRST_RUN_USAGE_THRESHOLD = 3;

export default function DashboardClient({
  initialUser,
  initialKeys = [],
  initialPlan = "Hobby",
  initialAvgLatency = 0,
  initialSuccessRate = 100,
  initialResetDate = null,
  initialHasSuccessfulRepositoryAnalysis = false,
  initialHasAskedRepository = false
}: {
  initialUser: User | null;
  initialKeys?: ApiKey[];
  initialPlan?: string;
  initialAvgLatency?: number;
  initialSuccessRate?: number;
  initialResetDate?: string | null;
  initialHasSuccessfulRepositoryAnalysis?: boolean;
  initialHasAskedRepository?: boolean;
}) {
  const router = useRouter();
  const activeUser = initialUser;

  const { apiKeys, isLoading, errorMessage, createKey, updateKey, deleteKey, refreshKeys } = useApiKeys(initialKeys);

  const { data: usageData, isSyncing, error: usageError, refresh: refreshUsageData } = useUsageData<UsageData>({
    pollingIntervalMs: 20000,
    requireOkResponse: true,
    logErrors: false,
    setErrorOnBackground: true,
    initialSyncing: true,
    initialRefreshDelayMs: 0,
  });

  const totalUsage = usageData?.totalUsage ?? apiKeys.reduce((acc, key) => acc + (key.usage_count || 0), 0);

  const realtimePlan = usageData?.plan || null;
  const avgLatency = typeof usageData?.avgLatency === 'number' ? usageData.avgLatency : initialAvgLatency;
  const successRate = typeof usageData?.successRate === 'number' ? usageData.successRate : initialSuccessRate;
  const resetDate = usageData?.resetDate || initialResetDate;
  const successfulRepositoryAnalysis =
    initialHasSuccessfulRepositoryAnalysis ||
    totalUsage > 0 ||
    (usageData?.globalTopRepos?.length || 0) > 0;

  // ─── Real sparklines & trends derived from dailyAnalytics ────────────────
  const dailyAnalytics: DailyUsageTrend[] = Array.isArray(usageData?.dailyAnalytics) ? usageData.dailyAnalytics : [];

  // Last 23 daily values for each metric (sparkline)
  const SPARK_POINTS = 23;
  const latencySpark = dailyAnalytics.slice(-SPARK_POINTS).map(d => d.avgLatency);
  const successSpark  = dailyAnalytics.slice(-SPARK_POINTS).map(d =>
    d.count + d.error > 0 ? Math.round((d.success / (d.success + d.error)) * 100) : 0
  );
  const requestsSpark = dailyAnalytics.slice(-SPARK_POINTS).map(d => d.count);

  // Pad to SPARK_POINTS with zeros if fewer data points are available
  const padSpark = (arr: number[]) =>
    arr.length < SPARK_POINTS ? [...Array(SPARK_POINTS - arr.length).fill(0), ...arr] : arr;

  // Period-over-period trend pill: compare last 7 days vs prior 7 days
  const trendPill = (values: number[]): string => {
    const last7  = values.slice(-7);
    const prior7 = values.slice(-14, -7);
    const sumLast  = last7.reduce((a, b) => a + b, 0);
    const sumPrior = prior7.reduce((a, b) => a + b, 0);
    if (sumPrior === 0 && sumLast === 0) return '─ N/A';
    if (sumPrior === 0) return '↗ NEW';
    const pct = Math.round(((sumLast - sumPrior) / sumPrior) * 100);
    if (pct === 0) return '─ 0%';
    return pct > 0 ? `↗ ${pct}%` : `↘ ${Math.abs(pct)}%`;
  };

  const latencyTrend = trendPill(latencySpark);
  const successTrend = trendPill(successSpark);

  // Dynamic Tier Logic - Using the most recent session data available
  const currentPlan = realtimePlan || initialPlan || (activeUser?.user_metadata as { plan?: string })?.plan || "Hobby";
  const { monthlyLimit: currentLimit, isUnlimited, maxLimitCap } = getPlanLimits(currentPlan);

  const alerts = computeSidebarAlerts(usageData?.keys || apiKeys, maxLimitCap);

  const { toast, showToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [createdPlainKey, setCreatedPlainKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [isPlainKeyVisible, setIsPlainKeyVisible] = useState(true);
  const shouldShowGettingStarted = Boolean(
    apiKeys.length === 0 ||
    totalUsage < FIRST_RUN_USAGE_THRESHOLD ||
    !successfulRepositoryAnalysis
  );
  const hasUsableDashboardData = Boolean(
    usageData ||
    initialKeys.length > 0 ||
    initialAvgLatency > 0 ||
    initialSuccessRate !== 100 ||
    initialResetDate !== null ||
    initialHasSuccessfulRepositoryAnalysis ||
    initialHasAskedRepository
  );
  const isInitialDashboardLoading = isSyncing && !hasUsableDashboardData;
  const dashboardStatus = isSyncing
    ? { label: "SYNCING DATA", ariaLabel: "Dashboard data syncing", title: "Refreshing dashboard data", tone: "syncing" as const }
    : usageError
      ? hasUsableDashboardData
        ? { label: "DATA MAY BE STALE", ariaLabel: "Dashboard data may be stale", title: "The latest dashboard refresh failed", tone: "stale" as const }
        : { label: "DATA UNAVAILABLE", ariaLabel: "Dashboard data unavailable", title: "Dashboard data could not be loaded", tone: "unavailable" as const }
      : { label: "DASHBOARD READY", ariaLabel: "Dashboard ready", title: "Dashboard data is current", tone: "ready" as const };

  const handleOpenCreateModal = () => {
    setEditingKey(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (key: ApiKey) => {
    setEditingKey(key);
    setIsModalOpen(true);
  };

  // 1. Sort Keys: Active first, then disabled
  const sortedKeys = [...apiKeys].sort((a, b) => {
    if (a.is_active === b.is_active) return 0;
    return a.is_active ? -1 : 1;
  });

  const handleCopyKey = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(true);
      showToast("success", "API key copied to clipboard.");
      setTimeout(() => setCopiedKey(false), 2000);
    } catch {
      showToast("error", getToastErrorMessage("api-key", "Failed to copy API key."));
    }
  };

  const handleModalSubmit = async (data: {
    name: string;
    keyType: "development" | "production";
    monthlyLimit: number | null;
    alertThreshold: number;
    alertChannels: string[];
    isActive: boolean;
  }) => {
    if (editingKey) {
      const result = await updateKey(editingKey.id, data);
      if (result.success) {
        showToast("success", "API key updated successfully.");
      }
      return result;
    } else {
      const result = await createKey(data);
      if (result.success) {
        showToast("success", "API key created successfully.");
        const createdResult = result as { plainKey?: string; key?: { id: string } };
        if (createdResult.plainKey) {
          setCreatedPlainKey(createdResult.plainKey);
          setIsPlainKeyVisible(true);
        }
      }
      return result;
    }
  };

  const [keyToRevoke, setKeyToRevoke] = useState<ApiKey | null>(null);
  const [isRevokeAndReplace, setIsRevokeAndReplace] = useState(false);

  const handleDelete = (key: ApiKey, options?: { replace?: boolean }) => {
    setKeyToRevoke(key);
    setIsRevokeAndReplace(!!options?.replace);
  };

  const confirmRevocation = async () => {
    if (!keyToRevoke) return;
    const result = await deleteKey(keyToRevoke.id);
    if (result.success) {
      showToast("success", "API key revoked successfully.");
      if (editingKey?.id === keyToRevoke.id) {
        setIsModalOpen(false);
      }
      if (isRevokeAndReplace) {
        setEditingKey({
          id: "",
          name: `${keyToRevoke.name} (Replacement)`,
          key_value: "",
          type: keyToRevoke.type,
          monthly_limit: keyToRevoke.monthly_limit,
          alert_threshold: keyToRevoke.alert_threshold,
          alert_channels: keyToRevoke.alert_channels,
          is_active: true,
          usage_count: 0,
          createdAt: "",
          alert_phone: null,
        });
        setIsModalOpen(true);
      }
    } else {
      showToast("error", getToastErrorMessage("api-key", result.error || "Revocation failed."));
    }
  };

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
          await refreshKeys();
          router.refresh();
        },
      }}
    >
          <div className="space-y-8">
            <DashboardPageHeader
              eyebrow={
                <Link href="/" className="group flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 transition hover:text-white">
                  <svg viewBox="0 0 24 24" className="h-3 w-3 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor">
                    <path d="M15 18l-6-6 6-6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Back to Home
                </Link>
              }
              title="Dashboard"
              description={
                errorMessage ? (
                  <GuidedError
                    {...getErrorGuidance({ workflow: "api-key", message: errorMessage })}
                    technicalDetails={errorMessage}
                    compact
                    className="mt-2"
                  />
                ) : (
                  "Review usage, plan status, and API key activity."
                )
              }
              rightAction={
                <div
                  className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[9px] font-bold font-mono uppercase tracking-[0.18em] shadow-[0_0_12px_rgba(16,185,129,0.08)] backdrop-blur-md transition-all sm:self-center ${
                    dashboardStatus.tone === "syncing"
                      ? "border-emerald-400/40 bg-emerald-950/20 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.18)]"
                      : dashboardStatus.tone === "stale"
                        ? "border-amber-400/35 bg-amber-950/20 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.12)]"
                        : dashboardStatus.tone === "unavailable"
                          ? "border-rose-400/35 bg-rose-950/20 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.12)]"
                          : "border-emerald-500/20 bg-emerald-950/20 text-emerald-400"
                  }`}
                  aria-label={dashboardStatus.ariaLabel}
                  title={dashboardStatus.title}
                >
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    {dashboardStatus.tone === "syncing" && (
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    )}
                    <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dashboardStatus.tone === "stale" ? "bg-amber-300" : dashboardStatus.tone === "unavailable" ? "bg-rose-300" : dashboardStatus.tone === "syncing" ? "bg-emerald-300" : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"}`} />
                  </span>
                  <span>{dashboardStatus.label}</span>
                </div>
              }
            />

            {usageError && (
              <GuidedError
                {...getErrorGuidance({ workflow: "usage", message: usageError })}
                technicalDetails={usageError}
                explanation={hasUsableDashboardData ? "The dashboard is showing the last successfully loaded data, which may be older." : "Dashboard usage data is not available yet."}
                nextAction="Refresh the dashboard when the usage service is available."
                actionLabel="Refresh Dashboard"
                onAction={() => void refreshUsageData()}
                compact
              />
            )}

            {shouldShowGettingStarted && (
              <GettingStartedChecklist
                hasApiKey={apiKeys.length > 0}
                hasSuccessfulRepositoryAnalysis={successfulRepositoryAnalysis}
                hasIndexedRepository={initialHasAskedRepository}
                onCreateApiKey={handleOpenCreateModal}
              />
            )}

            <DashboardOverviewCards
              metrics={[
                {
                  label: "Avg. Latency",
                  value: isInitialDashboardLoading ? "Loading…" : avgLatency > 0 ? `${avgLatency}ms` : "No requests yet",
                  icon: "M13 10V3L4 14h7v7l9-11h-7z",
                  tone: "amber",
                  trend: isInitialDashboardLoading ? undefined : latencyTrend,
                  spark: padSpark(latencySpark),
                  loading: isInitialDashboardLoading,
                },
                {
                  label: "Success Rate",
                  value: isInitialDashboardLoading ? "Loading…" : dailyAnalytics.length > 0 ? formatPercentage(successRate, 1) : "No requests yet",
                  icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
                  tone: "emerald",
                  trend: isInitialDashboardLoading ? undefined : successTrend,
                  spark: padSpark(successSpark),
                  loading: isInitialDashboardLoading,
                },
                {
                  label: "Active Keys",
                  value: isLoading ? "Loading…" : apiKeys.length.toString(),
                  icon: "M15 7a2 2 0 012 2m4 0a6 6 0 11-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z",
                  tone: "blue",
                  spark: padSpark(requestsSpark),
                  loading: isLoading,
                },
              ]}
            />

            <PlanStatusCard
              currentPlan={currentPlan}
              isUnlimited={isUnlimited}
              totalUsage={totalUsage}
              currentLimit={currentLimit}
              resetDate={resetDate}
              onManagePlan={() => router.push("/billing")}
            />

            {/* Keys Section */}
            <CommandPanel id="api-keys" padding="none" className="scroll-mt-6 p-5 sm:p-8">
              <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300/70">API Keys</p>
                  <h2 className="mt-1 font-serif text-2xl font-bold text-white">Active API Keys</h2>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-emerald-300/15 bg-emerald-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-200">
                    {apiKeys.length} Keys
                  </span>
                  <button
                    type="button"
                    onClick={handleOpenCreateModal}
                    className="rounded-2xl bg-emerald-400 px-5 py-2 text-[10px] font-black uppercase tracking-widest text-slate-950 shadow-[0_0_24px_rgba(52,211,153,0.18)] transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                  >
                    New Key
                  </button>
                </div>
              </div>

              <ApiKeyTable
                apiKeys={sortedKeys}
                isLoading={isLoading}
                onEdit={handleOpenEditModal}
                onDelete={handleDelete}
                onUpgradePrompt={() => router.push("/usage")}
                currentPlan={currentPlan}
                onOpenCreateModal={handleOpenCreateModal}
              />
            </CommandPanel>

            <ApiKeyModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              initialData={editingKey}
              planMonthlyLimit={maxLimitCap}
              onSubmit={handleModalSubmit}
            />
            <RevocationModal
              isOpen={keyToRevoke !== null}
              onClose={() => {
                setKeyToRevoke(null);
                setIsRevokeAndReplace(false);
              }}
              onConfirm={confirmRevocation}
              keyName={keyToRevoke?.name || ""}
              keyType={keyToRevoke?.type || "development"}
              keyUsage={keyToRevoke?.usage_count || 0}
            />
            {createdPlainKey && (
              <ModalFrame open={true} size="md" titleId="created-key-modal-title">
                <div className="mb-8 border-b border-white/5 pb-6 text-center space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-400">Save this API key</p>
                  <h3 id="created-key-modal-title" className="font-serif text-3xl font-bold tracking-tight italic text-white sm:text-4xl">
                    API Key Generated
                  </h3>
                  <p className="text-sm font-medium text-zinc-400">
                    Copy this API key now. It will not be displayed again.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Callout box */}
                  <div className="rounded-3xl border border-red-500/10 bg-red-500/5 p-5 flex gap-4 items-start sm:p-6">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-red-400">One-Time Visibility Only</p>
                      <p className="text-[11px] font-medium text-red-500/80 leading-relaxed">
                        We store only a hash of this key, so we cannot retrieve or display it again.
                      </p>
                    </div>
                  </div>

                  {/* Key Display Area */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                      Your Generated Plaintext API Key
                    </label>
                    <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/70 p-2 pl-4 sm:pl-6">
                      <code className="min-w-0 flex-1 break-all font-mono text-xs font-bold tracking-wider text-slate-200">
                        <DecryptingKeyText
                          text={createdPlainKey || ""}
                          visible={isPlainKeyVisible}
                          maskedText={createdPlainKey ? `${createdPlainKey.substring(0, 16)}••••••••••••••••••••${createdPlainKey.substring(createdPlainKey.length - 4)}` : ""}
                        />
                      </code>
                      <button
                        type="button"
                        onClick={() => setIsPlainKeyVisible(!isPlainKeyVisible)}
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-white/5 hover:text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                        title={isPlainKeyVisible ? "Hide API key" : "Show API key"}
                        aria-label={isPlainKeyVisible ? "Hide API key" : "Show API key"}
                      >
                        {isPlainKeyVisible ? (
                          <EyeOffIcon className="h-5 w-5" />
                        ) : (
                          <ShieldIcon className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyKey(createdPlainKey || "")}
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                          copiedKey
                            ? "bg-emerald-500 text-zinc-950 animate-pulse"
                            : "bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
                        }`}
                        title={copiedKey ? "Copied" : "Copy API key"}
                        aria-label={copiedKey ? "API key copied" : "Copy API key"}
                      >
                        {copiedKey ? (
                          <CopyCheckIcon className="h-5 w-5" />
                        ) : (
                          <CopyLockedIcon className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-10 flex items-center justify-end border-t border-white/5 pt-4">
                    <button
                      type="button"
                      onClick={() => setCreatedPlainKey(null)}
                      className="group flex w-full items-center justify-center gap-3 rounded-full bg-white px-10 py-4 text-xs font-black uppercase tracking-widest text-zinc-950 transition-all hover:bg-zinc-200 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:w-auto"
                    >
                      I saved this key
                      <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor">
                        <path d="M5 12h14m-7-7l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                </div>
              </ModalFrame>
            )}
            <Toast toast={toast} />
          </div>
    </DashboardShell>
  );
}
