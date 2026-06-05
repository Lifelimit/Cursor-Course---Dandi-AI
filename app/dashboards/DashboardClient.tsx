"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useApiKeys } from "@/hooks/useApiKeys";
import { useToast } from "@/hooks/useToast";
import { ApiKey } from "@/types/api";
import { Toast } from "@/components/ui/Toast";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { ApiKeyModal } from "@/components/dashboard/ApiKeyModal";
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
    refreshInterval: 10000 
  });

  const [lastSyncedTime, setLastSyncedTime] = useState<string>("Just now");
  const totalUsage = usageData?.totalUsage ?? apiKeys.reduce((acc, key) => acc + (key.usage_count || 0), 0);

  const realtimePlan = usageData?.plan || null;
  const avgLatency = typeof usageData?.avgLatency === 'number' ? usageData.avgLatency : initialAvgLatency;
  const successRate = typeof usageData?.successRate === 'number' ? usageData.successRate : initialSuccessRate;
  const resetDate = usageData?.resetDate || initialResetDate;
  const isSyncing = isValidating;

  // Dynamic Tier Logic - Using the most recent session data available
  const currentPlan = realtimePlan || initialPlan || (activeUser?.user_metadata as { plan?: string })?.plan || "Hobby"; 
  const { monthlyLimit: currentLimit, isUnlimited } = getPlanLimits(currentPlan);

  // Handle mock UI timer for "last synced" display. Resets when usageData updates.
  useEffect(() => {
    const resetTimer = setTimeout(() => {
      setLastSyncedTime("Just now");
    }, 0);
    
    let syncCount = 0;
    const syncTimeInterval = setInterval(() => {
      syncCount += 2;
      setLastSyncedTime(`${syncCount}s ago`);
    }, 2000);

    return () => {
      clearTimeout(resetTimer);
      clearInterval(syncTimeInterval);
    };
  }, [usageData]);

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
                <Link href="/" className="group flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 transition hover:text-zinc-900 dark:hover:text-white">
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
                <div className="flex max-w-full items-center gap-2.5 rounded-full border border-zinc-200 bg-white/80 px-4 py-2 shadow-sm transition-all dark:border-zinc-800 dark:bg-zinc-950 sm:self-center">
                  <div className="relative flex h-2 w-2">
                    <span className={`absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 ${isSyncing ? "animate-ping scale-150" : "animate-pulse"}`} />
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isSyncing ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-emerald-500"}`} />
                  </div>
                  <span className="flex min-w-0 items-center gap-1.5 font-mono text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 select-none">
                    {isSyncing ? (
                      <span className="text-emerald-500 font-bold animate-pulse">Syncing Telemetry...</span>
                    ) : (
                      <>
                        Telemetry Active <span className="text-zinc-250 dark:text-zinc-750">|</span> <span className="text-[8px] font-bold text-zinc-400 tabular-nums">Synced {lastSyncedTime}</span>
                      </>
                    )}
                  </span>
                </div>
              }
            />

            {/* Metric Tiles Row */}
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { label: "Avg. Latency", value: avgLatency > 0 ? `${avgLatency}ms` : "--", icon: "M13 10V3L4 14h7v7l9-11h-7z", color: "text-amber-500", bg: "bg-amber-50" },
                { label: "Success Rate", value: `${successRate.toFixed(1)}%`, icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", color: "text-emerald-500", bg: "bg-emerald-50" },
                { label: "Active Keys", value: apiKeys.length.toString(), icon: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z", color: "text-blue-500", bg: "bg-blue-50" }
              ].map((m, i) => (
                <div key={i} className="rounded-[32px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm transition-all hover:shadow-md">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${m.bg} dark:bg-zinc-950/50 ${m.color}`}>
                      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor">
                        <path d={m.icon} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">{m.label}</p>
                      <p className="text-2xl font-black tabular-nums">{m.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Plan Status Card */}
            <div className="group relative overflow-hidden rounded-[32px] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8 md:rounded-[40px] md:p-10">
              {/* Background Glow Decoration */}
              <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-emerald-50/50 dark:bg-emerald-950/10 blur-3xl transition-all group-hover:bg-emerald-100/50 dark:group-hover:bg-emerald-900/10" />
              
              <div className="relative flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
                <div className="flex-1 space-y-8">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">Current Strategic Tier</p>
                      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                        <h2 className="font-serif text-4xl font-bold italic tracking-tight sm:text-5xl">{currentPlan}</h2>
                        {isUnlimited && (
                          <span className="rounded-full bg-zinc-900 dark:bg-zinc-100 px-3 py-1 text-[8px] font-black uppercase tracking-widest text-white dark:text-zinc-950 shadow-lg shadow-zinc-900/10 dark:shadow-none">Unlimited</span>
                        )}
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => router.push("/billing")}
                      className="w-full rounded-full border border-zinc-200 bg-white px-8 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 transition-all hover:border-zinc-900 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500 dark:hover:border-zinc-100 dark:hover:text-zinc-100 sm:w-auto"
                    >
                      Management
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
                        Consumption <span className="mx-2 opacity-20">/</span> <span className="text-zinc-900 dark:text-zinc-100">{totalUsage.toLocaleString()} Units Used</span>
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 italic">
                          Next Reset: {resetDate ? new Date(resetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    
                    <div className="relative h-3 w-full overflow-hidden rounded-full bg-zinc-50 dark:bg-zinc-950">
                      <div 
                        className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all duration-1000 ease-out" 
                        style={{ width: `${isUnlimited ? 100 : Math.min((totalUsage / currentLimit) * 100, 100)}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between gap-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                      <span>0 Units</span>
                      <span>Target Limit: {isUnlimited ? "∞" : currentLimit.toLocaleString()} Units</span>
                    </div>
                  </div>
                </div>

                {/* Simulated Usage Pulse Visual */}
                <div className="hidden h-32 w-48 shrink-0 items-center justify-center rounded-3xl bg-zinc-50 dark:bg-zinc-950 p-6 md:flex border border-zinc-100/50 dark:border-zinc-800/50">
                  <div className="flex items-end gap-1 h-full w-full">
                    {[35, 65, 45, 85, 55, 75, 40, 90, 60, 80].map((h, i) => (
                      <div 
                        key={i} 
                        className="flex-1 rounded-t-sm bg-emerald-500/20 dark:bg-emerald-500/10 transition-all hover:bg-emerald-500"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Keys Section */}
            <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8 md:rounded-[32px]">
              <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="font-serif text-2xl font-bold">Encrypted Keys</h2>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-zinc-50 dark:bg-zinc-950 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 border border-zinc-100 dark:border-zinc-800">
                    {apiKeys.length} Records
                  </span>
                  <button
                    type="button"
                    onClick={handleOpenCreateModal}
                    className="rounded-full bg-zinc-900 px-5 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-zinc-900/10 transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:shadow-none dark:hover:bg-zinc-200"
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
            </section>

            <ApiKeyModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              initialData={editingKey}
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
              <div className="fixed inset-0 z-[1100] flex items-start justify-center overflow-y-auto bg-zinc-950/40 dark:bg-zinc-950/60 p-3 backdrop-blur-sm animate-in fade-in duration-300 sm:items-center sm:p-6">
                <div className="my-3 w-full max-w-xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-[28px] border border-zinc-200 dark:border-zinc-800 bg-[#f4f2ed] dark:bg-zinc-900 p-6 shadow-2xl animate-in zoom-in-95 duration-300 sm:my-0 sm:max-h-[calc(100dvh-3rem)] sm:rounded-[40px] sm:p-10">
                  <div className="mb-8 text-center space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500">Security Warning</p>
                    <h3 className="font-serif text-3xl font-bold tracking-tight italic text-zinc-900 dark:text-zinc-100 sm:text-4xl">
                      Secure Key Generated.
                    </h3>
                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      Copy your credentials now. This token will not be displayed again.
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* Callout box */}
                    <div className="rounded-3xl border border-red-200 dark:border-red-950/30 bg-red-50 dark:bg-red-950/10 p-6 flex gap-4 items-start">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400">
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
                          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-red-800 dark:text-red-400">One-Time Visibility Only</p>
                        <p className="text-[11px] font-medium text-red-600 dark:text-red-500 leading-relaxed">
                          For compliance and security, we only hash this credential in our database. We cannot retrieve or display this key ever again.
                        </p>
                      </div>
                    </div>

                    {/* Key Display Area */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 px-1">
                        Your Generated Plaintext API Key
                      </label>
                      <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-2 pl-4 dark:border-zinc-800 dark:bg-zinc-950 sm:pl-6">
                        <code className="min-w-0 flex-1 break-all font-mono text-xs font-bold tracking-wider text-zinc-800 dark:text-zinc-200">
                          <DecryptingKeyText 
                            text={createdPlainKey || ""} 
                            visible={isPlainKeyVisible} 
                            maskedText={createdPlainKey ? `${createdPlainKey.substring(0, 16)}••••••••••••••••••••${createdPlainKey.substring(createdPlainKey.length - 4)}` : ""}
                          />
                        </code>
                        <button
                          type="button"
                          onClick={() => setIsPlainKeyVisible(!isPlainKeyVisible)}
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-zinc-400 dark:text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white"
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
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all ${
                            copiedKey 
                              ? "bg-emerald-500 text-white animate-pulse" 
                              : "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200"
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
                  <div className="mt-10 flex items-center justify-end pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setCreatedPlainKey(null)}
                      className="group flex items-center justify-center gap-3 rounded-full bg-zinc-900 dark:bg-zinc-100 px-10 py-4 text-xs font-black uppercase tracking-widest text-white dark:text-zinc-950 shadow-xl shadow-zinc-900/10 dark:shadow-none transition-all hover:bg-zinc-800 dark:hover:bg-zinc-200 hover:scale-105 active:scale-95"
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
