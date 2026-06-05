"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { useApiKeys } from "@/hooks/useApiKeys";
import type { Session } from "@supabase/supabase-js";
import { getPlanLimits } from "@/lib/constants";

function ProtectedContent() {
  const searchParams = useSearchParams();
  const key = searchParams.get("key");
  const { toast, showToast } = useToast();
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [keyName, setKeyName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeState = async () => {
      await Promise.resolve();
      setIsLoading(true);
      setIsValid(null);
      setKeyName(null);

      if (!key) {
        setIsValid(false);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key }),
        });
        const data = await response.json();

        if (data.valid) {
          setIsValid(true);
          setKeyName(data.name);
          showToast("success", `Valid API Key: ${data.name}`);
        } else {
          setIsValid(false);
          showToast("error", "Invalid API Key. Access Denied.");
        }
      } catch {
        setIsValid(false);
        showToast("error", "Error validating key.");
      } finally {
        setIsLoading(false);
      }
    };

    initializeState();
  }, [key, showToast]);

  return (
    <>
    <div className="flex h-full flex-col rounded-[32px] border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 p-8 backdrop-blur-sm">
      <div className="space-y-2">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 dark:text-zinc-500">Security / Vault</p>
        <h1 className="font-serif text-4xl font-bold md:text-5xl">Protected Area.</h1>
        <p className="mt-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">Secure credential verification and encrypted resource access.</p>
      </div>
      
      <div className="mt-12 flex-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-900 dark:border-zinc-100 border-t-transparent"></div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Decrypting Access Node...</p>
          </div>
        ) : isValid ? (
          <div className="space-y-8">
            <div className="rounded-[24px] border border-emerald-100 dark:border-emerald-950/20 bg-emerald-50/50 dark:bg-emerald-950/10 p-8 text-emerald-900 dark:text-emerald-400">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-serif text-2xl font-bold">Access Granted</h2>
                  <p className="text-sm font-medium opacity-70 italic">Credential: {keyName}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 p-8 shadow-sm">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-6">Restricted Resources</h3>
              <ul className="space-y-4">
                {[
                  { label: "Proprietary Algorithm Documentation", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
                  { label: "Real-time Node Telemetry", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
                  { label: "Encrypted Strategy Modules", icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" }
                ].map((item) => (
                  <li key={item.label} className="flex items-center gap-4 group cursor-pointer transition-colors text-zinc-800 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
                      <path d={item.icon} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-sm font-bold uppercase tracking-wider">{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="rounded-[24px] border border-rose-100 dark:border-rose-950/20 bg-rose-50/50 dark:bg-rose-950/10 p-10 text-rose-900 dark:text-rose-400 text-center space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500 text-white shadow-xl shadow-rose-500/20">
              <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="font-serif text-3xl font-bold">Access Denied</h2>
              <p className="text-sm font-medium opacity-70 text-rose-800 dark:text-rose-300">The provided API key is invalid or has been revoked by the orchestrator.</p>
            </div>
            <button 
              onClick={() => window.history.back()}
              className="rounded-full bg-rose-900 px-8 py-3 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-rose-800 shadow-lg shadow-rose-900/10"
            >
              Return to Safety
            </button>
          </div>
        )}
      </div>

      <div className="mt-auto pt-8 flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
          <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        End-to-End Encryption Enabled
      </div>
    </div>
      <Toast toast={toast} />
    </>
  );
}

export default function ProtectedClient({ initialSession }: { initialSession: Session | null }) {
  const activeSession = initialSession;
  const { toast } = useToast();
  const { apiKeys } = useApiKeys();
  const totalUsage = apiKeys.reduce((acc, key) => acc + (key.usage_count || 0), 0);
  
  // Dynamic Tier Logic
  const currentPlan = activeSession?.user?.user_metadata?.plan || "Hobby"; 
  const { monthlyLimit: currentLimit, isUnlimited } = getPlanLimits(currentPlan);

  return (
    <DashboardShell
      sidebar={{
        totalUsage,
        plan: currentPlan,
        limit: currentLimit,
        isUnlimited,
      }}
    >
      <Suspense fallback={
        <div className="flex-1 rounded-[32px] border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 p-8 backdrop-blur-sm">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-full"></div>
            <div className="h-32 w-full bg-zinc-100 dark:bg-zinc-800/50 rounded-[24px]"></div>
          </div>
        </div>
      }>
        <ProtectedContent />
      </Suspense>
      <Toast toast={toast} />
    </DashboardShell>
  );
}
