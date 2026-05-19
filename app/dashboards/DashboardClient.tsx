"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useApiKeys } from "@/hooks/useApiKeys";
import { useToast } from "@/hooks/useToast";
import { ApiKey } from "@/types/api";
import { Toast } from "@/components/ui/Toast";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { ApiKeyModal } from "@/components/dashboard/ApiKeyModal";
import { ApiKeyTable } from "@/components/dashboard/ApiKeyTable";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { EyeIcon, EyeOffIcon, ShieldIcon, CopyLockedIcon, CopyCheckIcon } from "@/components/icons";

export default function DashboardClient({ 
  initialUser, 
  initialKeys = [],
  initialPlan = "Hobby"
}: { 
  initialUser: User | null;
  initialKeys?: ApiKey[];
  initialPlan?: string;
}) {
  const router = useRouter();
  const activeUser = initialUser; 
  
  const { apiKeys, isLoading, errorMessage, createKey, updateKey, deleteKey } = useApiKeys(initialKeys);
  const totalUsage = apiKeys.reduce((acc, key) => acc + (key.usage_count || 0), 0);
  
  const [realtimePlan, setRealtimePlan] = useState<string | null>(null);
  const [avgLatency, setAvgLatency] = useState<number>(0);
  const [successRate, setSuccessRate] = useState<number>(100);
  
  // Dynamic Tier Logic - Using the most recent session data available
  const currentPlan = realtimePlan || initialPlan || (activeUser?.user_metadata as { plan?: string })?.plan || "Hobby"; 
  const PLAN_LIMITS = {
    Hobby: 1000,
    Premium: 5000,
    Researcher: 1000000 // High number for visual progress on "Unlimited"
  };
  const currentLimit = PLAN_LIMITS[currentPlan as keyof typeof PLAN_LIMITS] || 1000;
  const isUnlimited = currentPlan === "Researcher";

  // Fetch real-time plan from usage endpoint
  useEffect(() => {
    fetch("/api/usage")
      .then(res => res.json())
      .then(data => {
        if (data.plan) setRealtimePlan(data.plan);
        if (typeof data.avgLatency === 'number') setAvgLatency(data.avgLatency);
        if (typeof data.successRate === 'number') setSuccessRate(data.successRate);
      })
      .catch(() => {});
  }, []);

  const alerts = apiKeys
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

  const { toast, showToast } = useToast();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [createdPlainKey, setCreatedPlainKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [sessionPlainKeys, setSessionPlainKeys] = useState<Record<string, string>>({});
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
          if (createdResult.key?.id) {
            setSessionPlainKeys(prev => ({
              ...prev,
              [createdResult.key!.id]: createdResult.plainKey!
            }));
          }
        }
      }
      return result;
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteKey(id);
    if (result.success) {
      showToast("success", "API key deleted successfully.");
      if (editingKey?.id === id) {
        setIsModalOpen(false);
      }
    } else {
      showToast("error", result.error || "Delete failed.");
    }
    return result;
  };

  return (
    <div className="min-h-screen bg-[#f4f2ed] text-[#18181b] selection:bg-zinc-200">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col items-start gap-8 p-6 md:flex-row md:py-12">
        <Sidebar 
          totalUsage={totalUsage} 
          plan={currentPlan} 
          limit={currentLimit} 
          isUnlimited={isUnlimited} 
          alerts={alerts}
          onUpdate={() => router.refresh()}
        />
        
        <main className="min-w-0 flex-1">
          <div className="space-y-8">
            {/* Header Section */}
            <div className="rounded-[32px] border border-zinc-200 bg-white/50 p-8 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-4">
                <Link href="/" className="group flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 transition hover:text-zinc-900">
                  <svg viewBox="0 0 24 24" className="h-3 w-3 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor">
                    <path d="M15 18l-6-6 6-6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Back to Home
                </Link>
              </div>
              <h1 className="mt-4 font-serif text-5xl font-bold tracking-tight">Overview</h1>
              {errorMessage ? (
                <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {errorMessage}
                </div>
              ) : (
                <p className="mt-4 text-sm font-medium text-zinc-500">
                  System status and secure credentials management.
                </p>
              )}
            </div>

            {/* Metric Tiles Row */}
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { label: "Avg. Latency", value: avgLatency > 0 ? `${avgLatency}ms` : "--", icon: "M13 10V3L4 14h7v7l9-11h-7z", color: "text-amber-500", bg: "bg-amber-50" },
                { label: "Success Rate", value: `${successRate.toFixed(1)}%`, icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", color: "text-emerald-500", bg: "bg-emerald-50" },
                { label: "Active Keys", value: apiKeys.length.toString(), icon: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z", color: "text-blue-500", bg: "bg-blue-50" }
              ].map((m, i) => (
                <div key={i} className="rounded-[32px] border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${m.bg} ${m.color}`}>
                      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor">
                        <path d={m.icon} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">{m.label}</p>
                      <p className="text-2xl font-black tabular-nums">{m.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Plan Status Card */}
            <div className="relative overflow-hidden rounded-[40px] border border-zinc-200 bg-white p-10 shadow-sm group">
              {/* Background Glow Decoration */}
              <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-emerald-50/50 blur-3xl transition-all group-hover:bg-emerald-100/50" />
              
              <div className="relative flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
                <div className="flex-1 space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Current Strategic Tier</p>
                      <div className="flex items-center gap-4">
                        <h2 className="font-serif text-5xl font-bold italic tracking-tight">{currentPlan}</h2>
                        {isUnlimited && (
                          <span className="rounded-full bg-zinc-900 px-3 py-1 text-[8px] font-black uppercase tracking-widest text-white shadow-lg shadow-zinc-900/10">Unlimited</span>
                        )}
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => router.push("/billing")}
                      className="rounded-full border border-zinc-200 bg-white px-8 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 transition-all hover:border-zinc-900 hover:text-zinc-900"
                    >
                      Management
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between px-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                        Consumption <span className="mx-2 opacity-20">/</span> <span className="text-zinc-900">{totalUsage.toLocaleString()} Units Used</span>
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 italic">Next Reset: May 24</span>
                      </div>
                    </div>
                    
                    <div className="relative h-3 w-full overflow-hidden rounded-full bg-zinc-50">
                      <div 
                        className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all duration-1000 ease-out" 
                        style={{ width: `${isUnlimited ? 100 : Math.min((totalUsage / currentLimit) * 100, 100)}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                      <span>0 Units</span>
                      <span>Target Limit: {isUnlimited ? "∞" : currentLimit.toLocaleString()} Units</span>
                    </div>
                  </div>
                </div>

                {/* Simulated Usage Pulse Visual */}
                <div className="hidden h-32 w-48 shrink-0 items-center justify-center rounded-3xl bg-zinc-50 p-6 md:flex border border-zinc-100/50">
                  <div className="flex items-end gap-1 h-full w-full">
                    {[35, 65, 45, 85, 55, 75, 40, 90, 60, 80].map((h, i) => (
                      <div 
                        key={i} 
                        className="flex-1 rounded-t-sm bg-emerald-500/20 transition-all hover:bg-emerald-500"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Keys Section */}
            <section className="rounded-[32px] border border-zinc-200 bg-white p-8 shadow-sm">
              <div className="mb-8 flex items-center justify-between">
                <h2 className="font-serif text-2xl font-bold">Encrypted Keys</h2>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-zinc-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400 border border-zinc-100">
                    {apiKeys.length} Records
                  </span>
                  <button
                    type="button"
                    onClick={handleOpenCreateModal}
                    className="rounded-full bg-zinc-900 px-5 py-2 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-zinc-800 shadow-lg shadow-zinc-900/10"
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
                onCopySuccess={() => showToast("success", "API key copied to clipboard.")}
                onCopyError={(msg) => showToast("error", msg)}
                onUpgradePrompt={() => router.push("/usage")}
                currentPlan={currentPlan}
                sessionPlainKeys={sessionPlainKeys}
              />

              {!isLoading && apiKeys.length === 0 ? (
                <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-100 py-12 text-center">
                  <p className="text-sm font-medium text-zinc-400">No encrypted keys found in this workspace.</p>
                  <button onClick={handleOpenCreateModal} className="mt-4 text-xs font-bold uppercase tracking-widest text-zinc-900 hover:underline">Create first key</button>
                </div>
              ) : null}
            </section>

            <ApiKeyModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              initialData={editingKey}
              onSubmit={handleModalSubmit}
            />
            {createdPlainKey && (
              <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-zinc-950/40 backdrop-blur-sm px-4 animate-in fade-in duration-300">
                <div className="w-full max-w-xl rounded-[40px] border border-zinc-200 bg-[#f4f2ed] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
                  <div className="mb-8 text-center space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500">Security Warning</p>
                    <h3 className="font-serif text-4xl font-bold tracking-tight italic">
                      Secure Key Generated.
                    </h3>
                    <p className="text-sm font-medium text-zinc-500">
                      Copy your credentials now. This token will not be displayed again.
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* Callout box */}
                    <div className="rounded-3xl border border-red-200 bg-red-50 p-6 flex gap-4 items-start">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
                          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-red-800">One-Time Visibility Only</p>
                        <p className="text-[11px] font-medium text-red-600 leading-relaxed">
                          For compliance and security, we only hash this credential in our database. We cannot retrieve or display this key ever again.
                        </p>
                      </div>
                    </div>

                    {/* Key Display Area */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">
                        Your Generated Plaintext API Key
                      </label>
                      <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-2 pl-6">
                        <code className="flex-1 break-all font-mono text-xs font-bold text-zinc-800 tracking-wider">
                          {isPlainKeyVisible 
                            ? createdPlainKey 
                            : createdPlainKey 
                              ? `${createdPlainKey.substring(0, 16)}••••••••••••••••••••${createdPlainKey.substring(createdPlainKey.length - 4)}`
                              : ""
                          }
                        </code>
                        <button
                          type="button"
                          onClick={() => setIsPlainKeyVisible(!isPlainKeyVisible)}
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900"
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
                              : "bg-zinc-900 text-white hover:bg-zinc-800"
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
                  <div className="mt-10 flex items-center justify-end pt-4 border-t border-zinc-100">
                    <button
                      type="button"
                      onClick={() => setCreatedPlainKey(null)}
                      className="group flex items-center justify-center gap-3 rounded-full bg-zinc-900 px-10 py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-zinc-900/10 transition-all hover:bg-zinc-800 hover:scale-105 active:scale-95"
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
        </main>
      </div>
    </div>
  );
}
