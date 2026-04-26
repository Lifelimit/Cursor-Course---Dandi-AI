"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";

export default function PlaygroundPage() {
  const [key, setKey] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (key.trim()) {
      router.push(`/protected?key=${encodeURIComponent(key.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f2ed] text-zinc-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:flex-row md:p-6">
        <Sidebar />
        <main className="min-w-0 flex-1 space-y-6">
          <div className="rounded-2xl border border-[#e3dfd4] bg-[#efebe2] p-6">
            <h1 className="text-3xl font-bold tracking-tight">API Playground</h1>
            <p className="mt-2 text-zinc-600">Test your API keys by submitting them below.</p>
            
            <form onSubmit={handleSubmit} className="mt-8 max-w-lg space-y-4">
              <div>
                <label htmlFor="api-key" className="block text-sm font-medium text-zinc-700 mb-1">
                  Enter API Key
                </label>
                <input
                  id="api-key"
                  type="text"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="sk_live_..."
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none ring-blue-500/20 transition focus:ring-4 focus:border-blue-400"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700"
              >
                Validate Key
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
