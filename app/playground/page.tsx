"use client";

import { Sidebar } from "@/components/dashboard/Sidebar";
import { useApiKeys } from "@/hooks/useApiKeys";
import { useSession } from "next-auth/react";

export default function PlaygroundPage() {
  const { data: session } = useSession();
  const { apiKeys } = useApiKeys();
  const totalUsage = apiKeys.reduce((acc, key) => acc + (key.usage_count || 0), 0);
  
  // Dynamic Tier Logic
  const currentPlan = "Researcher"; 
  const PLAN_LIMITS = {
    Hobby: 1000,
    Premium: 5000,
    Researcher: 1000000 
  };
  const currentLimit = PLAN_LIMITS[currentPlan as keyof typeof PLAN_LIMITS] || 1000;
  const isUnlimited = currentPlan === "Researcher";

  return (
    <div className="min-h-screen bg-[#f4f2ed] text-[#18181b] selection:bg-zinc-200">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-stretch gap-8 p-6 md:flex-row md:py-12">
        <Sidebar totalUsage={totalUsage} plan={currentPlan} limit={currentLimit} isUnlimited={isUnlimited} />
        
        <main className="w-full min-w-0 flex-1 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex h-full flex-col rounded-[32px] border border-zinc-200 bg-white/50 p-8 backdrop-blur-sm">
            <div className="space-y-2">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">Environment / Testing</p>
              <h1 className="font-serif text-4xl font-bold md:text-5xl">API Playground.</h1>
              <p className="mt-4 text-sm font-medium text-zinc-500">Validate your secure credentials and monitor live orchestration response times.</p>
            </div>
            
            <form action="/protected" method="GET" className="mt-12 max-w-lg space-y-8">
              <div className="space-y-3">
                <label htmlFor="api-key" className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">
                  Enter Secure Access Token
                </label>
                <input
                  id="api-key"
                  name="key"
                  type="text"
                  required
                  placeholder="sk_live_..."
                  className="w-full rounded-2xl border border-zinc-200 bg-white/80 px-6 py-4 font-mono text-sm outline-none transition-all focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5"
                />
              </div>
              <button
                type="submit"
                className="group flex w-full items-center justify-center gap-3 rounded-full bg-[#18181b] px-8 py-5 text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-zinc-800 shadow-xl shadow-zinc-900/10"
              >
                Validate Key
                <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor">
                  <path d="M5 12h14m-7-7l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </form>

            <div className="mt-auto pt-12">
              <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Edge Simulation Active
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
