"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useApiKeys } from "@/hooks/useApiKeys";
import { useToast } from "@/hooks/useToast";
import { ApiKey } from "@/types/api";
import { Toast } from "@/components/ui/Toast";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { ApiKeyModal } from "@/components/dashboard/ApiKeyModal";
import { CommandPanel, StatusPill } from "@/components/command";
import { getPlanLimits } from "@/lib/constants";
import { computeSidebarAlerts } from "@/lib/alerts";
import { ApiKeyTable } from "@/components/dashboard/ApiKeyTable";
import { RevocationModal } from "@/components/dashboard/RevocationModal";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { EyeOffIcon, ShieldIcon, CopyLockedIcon, CopyCheckIcon } from "@/components/icons";

import { DecryptingKeyText } from "@/components/ui/DecryptingKeyText";
export default function DashboardClient({ 
  initialUser, 
  initialKeys = [],
  initialPlan = "Hobby",
  initialAvgLatency = 0,
  initialSuccessRate = 100,
  initialResetDate = null
}: { 
  initialUser: User | null;
  initialKeys?: ApiKey[];
  initialPlan?: string;
  initialAvgLatency?: number;
  initialSuccessRate?: number;
  initialResetDate?: string | null;
}) {
  const router = useRouter();
  const activeUser = initialUser; 
  
  const { apiKeys, isLoading, errorMessage, createKey, updateKey, deleteKey, refreshKeys } = useApiKeys(initialKeys);
  
  const fetcher = (url: string) => fetch(url).then(res => res.json());
  const { data: usageData, isValidating } = useSWR('/api/usage', fetcher, { 
    refreshInterval: 20000 
  });

  const totalUsage = usageData?.totalUsage ?? apiKeys.reduce((acc, key) => acc + (key.usage_count || 0), 0);

  const realtimePlan = usageData?.plan || null;
  const avgLatency = typeof usageData?.avgLatency === 'number' ? usageData.avgLatency : initialAvgLatency;
  const successRate = typeof usageData?.successRate === 'number' ? usageData.successRate : initialSuccessRate;
  const resetDate = usageData?.resetDate || initialResetDate;
  const isSyncing = isValidating;

  // ─── Real sparklines & trends derived from dailyAnalytics ────────────────
  type DailyPoint = { date: string; count: number; success: number; error: number; avgLatency: number };
  const dailyAnalytics: DailyPoint[] = Array.isArray(usageData?.dailyAnalytics) ? usageData.dailyAnalytics : [];

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
  const { monthlyLimit: currentLimit, isUnlimited } = getPlanLimits(currentPlan);

  const alerts = computeSidebarAlerts(usageData?.keys || apiKeys);

  const { toast, showToast } = useToast();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [createdPlainKey, setCreatedPlainKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [isPlainKeyVisible, setIsPlainKeyVisible] = useState(true);

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
      showToast("error", "Failed to copy API key.");
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
      showToast("error", result.error || "Revocation failed.");
    }
  };

  return (
    <DashboardShell
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
              title="Overview"
              description={
                errorMessage ? (
                  <div className="mt-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-400">
                    {errorMessage}
                  </div>
                ) : (
                  "System status and secure credentials management."
                )
              }
              rightAction={
                <div
                  className={`inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-950/20 px-3.5 py-1.5 text-[9px] font-bold font-mono uppercase tracking-[0.18em] text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.08)] backdrop-blur-md transition-all sm:self-center ${
                    isSyncing ? "border-emerald-400/40 shadow-[0_0_15px_rgba(52,211,153,0.18)]" : ""
                  }`}
                  aria-label="All systems operational"
                  title={isSyncing ? "Telemetry refresh in progress" : "All systems operational"}
                >
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    {isSyncing && (
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    )}
                    <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isSyncing ? "bg-emerald-300" : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"}`} />
                  </span>
                  <span>ALL SYSTEMS OPERATIONAL</span>
                </div>
              }
            />

            {/* Metric Tiles Row */}
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  label: "Avg. Latency",
                  value: avgLatency > 0 ? `${avgLatency}ms` : "--",
                  icon: "M13 10V3L4 14h7v7l9-11h-7z",
                  tone: "amber",
                  trend: latencyTrend,
                  spark: padSpark(latencySpark),
                },
                {
                  label: "Success Rate",
                  value: dailyAnalytics.length > 0 ? `${successRate.toFixed(1)}%` : "--",
                  icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
                  tone: "emerald",
                  trend: successTrend,
                  spark: padSpark(successSpark),
                },
                {
                  label: "Active Keys",
                  value: apiKeys.length.toString(),
                  icon: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z",
                  tone: "blue",
                  spark: padSpark(requestsSpark),
                },
              ].map((m) => {
                const accentText =
                  m.tone === "amber"
                    ? "text-amber-400"
                    : m.tone === "blue"
                    ? "text-blue-400"
                    : "text-emerald-400";

                const accentBg =
                  m.tone === "amber"
                    ? "bg-amber-500/5"
                    : m.tone === "blue"
                    ? "bg-blue-500/5"
                    : "bg-emerald-500/5";

                const accentBorder =
                  m.tone === "amber"
                    ? "border-amber-500/20 animate-pulse-slow"
                    : m.tone === "blue"
                    ? "border-blue-500/20"
                    : "border-emerald-500/20";

                const glowColor =
                  m.tone === "amber"
                    ? "bg-amber-400/5"
                    : m.tone === "blue"
                    ? "bg-blue-400/5"
                    : "bg-emerald-400/5";

                return (
                  <div
                    key={m.label}
                    className="group relative flex min-w-0 flex-col overflow-hidden rounded-[24px] border border-white/5 bg-slate-950/40 p-4 shadow-[0_24px_90px_rgba(0,0,0,0.34)] backdrop-blur-xl transition-all hover:border-white/10 sm:p-5 md:min-h-48"
                    style={{ WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}
                  >
                    {/* Subtle Glow decoration */}
                    <div
                      aria-hidden="true"
                      className={`pointer-events-none absolute -right-14 -top-20 h-36 w-36 rounded-full blur-3xl opacity-60 ${glowColor}`}
                    />
                    
                    {/* Upper row: icon, name+value, trend pill */}
                    <div className="relative flex min-w-0 items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-white/[0.015] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] ${accentBorder} ${accentText}`}
                        >
                          <svg viewBox="0 0 24 24" className="h-6.5 w-6.5" fill="none" stroke="currentColor">
                            <path d={m.icon} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <div className="min-w-0 leading-normal">
                          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 font-sans">
                            {m.label}
                          </p>
                          <p className="text-2xl font-bold tracking-tight text-white font-sans mt-0.5 tabular-nums">
                            {m.value}
                          </p>
                        </div>
                      </div>

                      {'trend' in m && m.trend && (
                        <span
                          className={`inline-flex shrink-0 items-center rounded-lg border px-2 py-1 text-[10px] font-bold font-mono tracking-wide tabular-nums ${accentBorder} ${accentBg} ${accentText} shadow-[0_0_10px_rgba(0,0,0,0.2)]`}
                        >
                          {m.trend}
                        </span>
                      )}
                    </div>

                    {/* Bottom row: Sparkline */}
                    <div className="relative mt-6 h-12 w-full overflow-hidden md:mt-auto md:pt-4">
                      <svg viewBox="0 0 220 40" preserveAspectRatio="none" className="h-full w-full">
                        {(() => {
                          const pts = m.spark;
                          const maxVal = Math.max(...pts);
                          const minVal = Math.min(...pts);
                          const range = maxVal - minVal;
                          // Normalize 0–30 px height within the 0–35 canvas (5px top padding)
                          const toY = (v: number) =>
                            range === 0 ? 20 : Math.round(35 - ((v - minVal) / range) * 30);
                          const step = pts.length > 1 ? 220 / (pts.length - 1) : 0;
                          const pointStr = pts.map((v, i) => `${Math.round(i * step)},${toY(v)}`).join(" ");
                          const lastX = Math.round((pts.length - 1) * step);
                          const lastY = toY(pts[pts.length - 1]);
                          return (
                            <>
                              <polygon
                                points={`0,40 ${pointStr} ${lastX},40`}
                                className={
                                  m.tone === "amber"
                                    ? "fill-amber-500/10"
                                    : m.tone === "blue"
                                    ? "fill-blue-500/10"
                                    : "fill-emerald-500/10"
                                }
                              />
                              <polyline
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                points={pointStr}
                                className={
                                  m.tone === "amber"
                                    ? "text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.3)]"
                                    : m.tone === "blue"
                                    ? "text-blue-500 drop-shadow-[0_0_6px_rgba(59,130,246,0.3)]"
                                    : "text-emerald-500 drop-shadow-[0_0_6px_rgba(16,185,129,0.3)]"
                                }
                              />
                              <circle
                                cx={lastX}
                                cy={lastY}
                                r="3"
                                fill="currentColor"
                                className={
                                  m.tone === "amber"
                                    ? "text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]"
                                    : m.tone === "blue"
                                    ? "text-blue-400 drop-shadow-[0_0_6px_rgba(59,130,246,0.8)]"
                                    : "text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]"
                                }
                              />
                            </>
                          );
                        })()}
                      </svg>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Plan Status Card */}
            <CommandPanel padding="none" className="group relative overflow-hidden p-5 sm:p-8 md:p-10">
              {/* Background Glow Decoration */}
              <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl transition-all group-hover:bg-emerald-400/15" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/50 to-transparent" />
              
              <div className="relative flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
                <div className="flex-1 space-y-8">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300/80">Current Strategic Tier</p>
                      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                        <h2 className="font-serif text-4xl font-bold italic tracking-tight text-white sm:text-5xl">{currentPlan}</h2>
                        {isUnlimited && (
                          <StatusPill tone="success" compact>Unlimited</StatusPill>
                        )}
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => router.push("/billing")}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-8 py-3 text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all hover:border-emerald-300/30 hover:text-emerald-200 sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                    >
                      Management
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                        Consumption <span className="mx-2 opacity-20">/</span> <span className="text-white">{totalUsage.toLocaleString()} Units Used</span>
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-300">
                          Next Reset: {resetDate ? new Date(resetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    
                    <div className="relative h-3 w-full overflow-hidden rounded-full bg-white/10">
                      <div 
                        className="h-full bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.35)] transition-all duration-1000 ease-out" 
                        style={{ width: `${isUnlimited ? 100 : Math.min((totalUsage / currentLimit) * 100, 100)}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      <span>0 Units</span>
                      <span>Target Limit: {isUnlimited ? "∞" : currentLimit.toLocaleString()} Units</span>
                    </div>
                  </div>
                </div>

                {/* Simulated Usage Pulse Visual */}
                <div className="hidden h-32 w-48 shrink-0 items-center justify-center rounded-3xl border border-emerald-300/15 bg-slate-950/70 p-6 md:flex">
                  <div className="flex items-end gap-1 h-full w-full">
                    {[35, 65, 45, 85, 55, 75, 40, 90, 60, 80].map((h, i) => (
                      <div 
                        key={i} 
                        className="flex-1 rounded-t-sm bg-emerald-400/20 transition-all hover:bg-emerald-300"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </CommandPanel>

            {/* Keys Section */}
            <CommandPanel padding="none" className="p-5 sm:p-8">
              <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300/70">API Credentials</p>
                  <h2 className="mt-1 font-serif text-2xl font-bold text-white">Active API Keys</h2>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-emerald-300/15 bg-emerald-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-200">
                    {apiKeys.length} Records
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
              planMonthlyLimit={isUnlimited ? null : currentLimit}
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
              <div className="fixed inset-0 z-[1100] flex items-start justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm animate-in fade-in duration-300 sm:items-center sm:p-6">
                <div 
                  className="my-3 w-full max-w-xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-[28px] border border-white/5 bg-slate-950/90 p-6 shadow-2xl animate-in zoom-in-95 duration-300 sm:my-0 sm:max-h-[calc(100dvh-3rem)] sm:rounded-[40px] sm:p-10"
                  style={{ WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}
                >
                  <div className="mb-8 text-center space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400">Security Warning</p>
                    <h3 className="font-serif text-3xl font-bold tracking-tight italic text-white sm:text-4xl">
                      Secure Key Generated.
                    </h3>
                    <p className="text-sm font-medium text-zinc-400">
                      Copy your credentials now. This token will not be displayed again.
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* Callout box */}
                    <div className="rounded-3xl border border-red-500/10 bg-red-500/5 p-6 flex gap-4 items-start">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
                          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-red-400">One-Time Visibility Only</p>
                        <p className="text-[11px] font-medium text-red-500/80 leading-relaxed">
                          For compliance and security, we only hash this credential in our database. We cannot retrieve or display this key ever again.
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
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-white/5 hover:text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                          title={isPlainKeyVisible ? "Hide API key" : "Show API key"}
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
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                            copiedKey 
                              ? "bg-emerald-500 text-zinc-950 animate-pulse" 
                              : "bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
                          }`}
                          title={copiedKey ? "Copied" : "Copy secure session key"}
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
                  <div className="mt-10 flex items-center justify-end pt-4 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => setCreatedPlainKey(null)}
                      className="group flex items-center justify-center gap-3 rounded-full bg-white px-10 py-4 text-xs font-black uppercase tracking-widest text-zinc-950 transition-all hover:bg-zinc-200 hover:scale-105 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                    >
                      I have secured this key
                      <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor">
                        <path d="M5 12h14m-7-7l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
            <Toast toast={toast} />
          </div>
    </DashboardShell>
  );
}
