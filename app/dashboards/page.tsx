"use client";

import { useState } from "react";
import Link from "next/link";
import { useApiKeys } from "../../hooks/useApiKeys";
import { useToast } from "../../hooks/useToast";
import { ApiKey } from "../../types/api";
import { Toast } from "../../components/ui/Toast";
import { Sidebar } from "../../components/dashboard/Sidebar";
import { ApiKeyModal } from "../../components/dashboard/ApiKeyModal";
import { ApiKeyTable } from "../../components/dashboard/ApiKeyTable";

export default function DashboardsPage() {
  const { apiKeys, isLoading, errorMessage, createKey, updateKey, deleteKey } = useApiKeys();
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
    <div className="min-h-screen bg-[#f4f2ed] text-zinc-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:flex-row md:p-6">
        <Sidebar />

        <main className="min-w-0 flex-1 space-y-4">
          <div className="rounded-2xl border border-[#e3dfd4] bg-[#efebe2] p-5">
            <div className="flex items-center justify-between gap-4">
              <Link href="/" className="group flex items-center gap-2 text-sm text-zinc-600 transition hover:text-zinc-900">
                <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor">
                  <path d="M15 18l-6-6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                PAGES / OVERVIEW
              </Link>
              <Link href="/" className="rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-sm font-medium transition hover:bg-zinc-50">
                Back Home
              </Link>
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Overview</h1>
            {errorMessage ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {errorMessage}
              </div>
            ) : (
              <p className="mt-4 rounded-lg bg-white px-3 py-2 text-sm text-zinc-600">
                API key management for your workspace.
              </p>
            )}
          </div>

          <section className="rounded-2xl border border-[#e3dfd4] bg-[#efebe2] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500">Current plan</p>
                <h2 className="text-3xl font-semibold">Researcher</h2>
              </div>
              <button
                type="button"
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
              >
                Manage Plan
              </button>
            </div>
            <div className="h-2 rounded-full bg-zinc-200">
              <div className="h-full w-[15%] rounded-full bg-zinc-500" />
            </div>
            <p className="mt-2 text-sm text-zinc-600">0 / 1000 credits used</p>
          </section>

          <section className="rounded-2xl border border-[#e3dfd4] bg-[#efebe2] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">API Keys</h2>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-zinc-700">
                  {apiKeys.length} total
                </span>
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-zinc-700"
                >
                  Create New Key
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
            />

            {!isLoading && apiKeys.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-600">No keys yet. Create your first one.</p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-[#e3dfd4] bg-[#efebe2] p-5">
            <h2 className="text-xl font-semibold">Coupon</h2>
            <p className="mt-1 text-sm text-zinc-600">Have a coupon code to redeem free credits?</p>
            <div className="mt-4 flex max-w-md items-center gap-2">
              <input
                type="text"
                placeholder="Enter coupon code"
                className="h-10 flex-1 rounded-lg border border-zinc-300 px-3 text-sm outline-none ring-blue-500/20 transition focus:ring-4"
              />
              <button type="button" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white">
                Apply
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-[#e3dfd4] bg-[#efebe2] p-5">
            <h2 className="text-xl font-semibold">Remote MCP</h2>
            <p className="mt-1 text-sm text-zinc-600">Connect directly to your MCP server for seamless local development.</p>
            <div className="mt-4 flex max-w-md items-center gap-2">
              <select className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none ring-blue-500/20 transition focus:ring-4">
                <option>default</option>
              </select>
              <button type="button" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white">
                Generate MCP Link
              </button>
            </div>
          </section>
        </main>
      </div>

      <ApiKeyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={editingKey}
        onSubmit={handleModalSubmit}
      />
      <Toast toast={toast} />
    </div>
  );
}
