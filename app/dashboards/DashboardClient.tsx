"use client";

import { useState } from "react";
import Link from "next/link";
import { useApiKeys } from "@/hooks/useApiKeys";
import { useToast } from "@/hooks/useToast";
import { Session } from "@supabase/supabase-js";
import { ApiKey } from "@/types/api";
import { Toast } from "@/components/ui/Toast";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { ApiKeyModal } from "@/components/dashboard/ApiKeyModal";
import { ApiKeyTable } from "@/components/dashboard/ApiKeyTable";
import { useRouter } from "next/navigation";

export default function DashboardClient({ 
  initialSession, 
  initialKeys = [],
  initialPlan = "Hobby"
}: { 
  initialSession: Session | null;
  initialKeys?: ApiKey[];
  initialPlan?: string;
}) {
  const router = useRouter();
  const activeSession = initialSession; 
  
  const { apiKeys, isLoading, errorMessage, createKey, updateKey, deleteKey } = useApiKeys(initialKeys);
  const totalUsage = apiKeys.reduce((acc, key) => acc + (key.usage_count || 0), 0);
  
  const [realtimePlan, setRealtimePlan] = useState<string | null>(null);
  
  // Dynamic Tier Logic - Using the most recent session data available
  const currentPlan = realtimePlan || initialPlan || (activeSession?.user?.user_metadata as { plan?: string })?.plan || "Hobby"; 
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
                { label: "Avg. Latency", value: "242ms", icon: "M13 10V3L4 14h7v7l9-11h-7z", color: "text-amber-500", bg: "bg-amber-50" },
                { label: "Success Rate", value: "99.9%", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", color: "text-emerald-500", bg: "bg-emerald-50" },
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
            <Toast toast={toast} />
          </div>
        </main>
      </div>
    </div>
  );
}
