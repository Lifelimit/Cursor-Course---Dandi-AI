"use client";

import { useState } from "react";
import Link from "next/link";
import { useApiKeys } from "@/hooks/useApiKeys";
import { useToast } from "@/hooks/useToast";
import { useSession } from "next-auth/react";
import type { Session } from "next-auth";
import { ApiKey } from "@/types/api";
import { Toast } from "@/components/ui/Toast";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { ApiKeyModal } from "@/components/dashboard/ApiKeyModal";
import { ApiKeyTable } from "@/components/dashboard/ApiKeyTable";
import { SubscriptionModal } from "@/components/dashboard/SubscriptionModal";

export default function DashboardClient({ initialSession }: { initialSession: Session | null }) {
  const { data: session } = useSession();
  // Prioritize the server-side session (initialSession) because it's fetched fresh on every load
  const activeSession = initialSession || session; 
  
  const { apiKeys, isLoading, errorMessage, createKey, updateKey, deleteKey } = useApiKeys();
  const totalUsage = apiKeys.reduce((acc, key) => acc + (key.usage_count || 0), 0);
  
  // Dynamic Tier Logic - Using the most recent session data available
  const currentPlan = activeSession?.user?.plan || "Hobby"; 
  const PLAN_LIMITS = {
    Hobby: 1000,
    Premium: 5000,
    Researcher: 1000000 // High number for visual progress on "Unlimited"
  };
  const currentLimit = PLAN_LIMITS[currentPlan as keyof typeof PLAN_LIMITS] || 1000;
  const isUnlimited = currentPlan === "Researcher";

  const { toast, showToast } = useToast();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);

  const handleOpenCreateModal = () => {
    setEditingKey(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (key: ApiKey) => {
    setEditingKey(key);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (data: { name: string; keyType: string; monthlyLimit: number | null }) => {
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
          onManageClick={() => setIsSubModalOpen(true)}
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

            {/* Plan Status Card */}
            <div className="rounded-[32px] border border-zinc-200 bg-white p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Current Active Plan</p>
                  <h2 className="font-serif text-4xl font-bold italic">{currentPlan}</h2>
                </div>
                <button 
                  onClick={() => setIsSubModalOpen(true)}
                  className="rounded-full bg-[#18181b] px-6 py-2 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-zinc-800"
                >
                  Manage
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-1000 ease-out" 
                    style={{ width: `${isUnlimited ? 100 : Math.min((totalUsage / currentLimit) * 100, 100)}%` }}
                  ></div>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                  {totalUsage.toLocaleString()} / {isUnlimited ? "∞" : currentLimit.toLocaleString()} <span className="text-zinc-900">{isUnlimited ? "Unlimited Requests Enabled" : "Total Requests Consumed"}</span>
                </p>
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
                apiKeys={apiKeys}
                isLoading={isLoading}
                onEdit={handleOpenEditModal}
                onDelete={handleDelete}
                onCopySuccess={() => showToast("success", "API key copied to clipboard.")}
                onCopyError={(msg) => showToast("error", msg)}
                onUpgradePrompt={() => setIsSubModalOpen(true)}
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
            <SubscriptionModal 
              isOpen={isSubModalOpen}
              onClose={() => setIsSubModalOpen(false)}
              planName={currentPlan}
              onSuccess={(msg) => showToast("success", msg)}
              onError={(msg) => showToast("error", msg)}
            />
            <Toast toast={toast} />
          </div>
        </main>
      </div>
    </div>
  );
}
