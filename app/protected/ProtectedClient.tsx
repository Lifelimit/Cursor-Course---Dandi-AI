"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { GuidedError } from "@/components/ui/GuidedError";
import { useApiKeys } from "@/hooks/useApiKeys";
import type { Session } from "@supabase/supabase-js";
import { getPlanLimits } from "@/lib/constants";
import { CommandPanel, StatusPill } from "@/components/command";
import { getErrorGuidance, getToastErrorMessage } from "@/lib/error-guidance";

function ProtectedContent() {
  const searchParams = useSearchParams();
  const key = searchParams.get("key");
  const { toast, showToast } = useToast();
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [keyName, setKeyName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    const initializeState = async () => {
      await Promise.resolve();
      setIsLoading(true);
      setIsValid(null);
      setKeyName(null);
      setValidationError(null);

      if (!key) {
        setIsValid(false);
        setValidationError("API key is missing from the protected route URL.");
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
          const message = data.error || "Invalid API key.";
          setValidationError(message);
          showToast("error", getToastErrorMessage("api-key", message));
        }
      } catch (err) {
        setIsValid(false);
        const message = err instanceof Error ? err.message : "Error validating key.";
        setValidationError(message);
        showToast("error", getToastErrorMessage("api-key", message));
      } finally {
        setIsLoading(false);
      }
    };

    initializeState();
  }, [key, showToast]);

  return (
    <>
    <CommandPanel className="flex h-full flex-col p-8">
      <div className="space-y-2">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300/75">API Key Verification</p>
        <h1 className="font-serif text-4xl font-bold text-white md:text-5xl">Protected Area.</h1>
        <p className="mt-4 text-sm font-medium text-slate-400">Validate an API key before showing protected content.</p>
      </div>
      
      <div className="mt-12 flex-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-300 border-t-transparent"></div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Validating API key...</p>
          </div>
        ) : isValid ? (
          <div className="space-y-8">
            <div className="rounded-[24px] border border-emerald-500/20 bg-emerald-950/20 p-8 text-emerald-200">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-zinc-950 shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-serif text-2xl font-bold">API key valid</h2>
                  <p className="text-sm font-medium opacity-70 italic">API key: {keyName}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/5 bg-slate-950/40 p-8 shadow-xl backdrop-blur-xl">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-6">Restricted Resources</h3>
              <ul className="space-y-4">
                {[
                  { label: "Protected API Response", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
                  { label: "Current Key Status", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
                  { label: "Validation Result", icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" }
                ].map((item) => (
                  <li key={item.label} className="flex items-center gap-4 group cursor-pointer transition-colors text-slate-300 hover:text-white">
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
          <div className="space-y-6">
            <GuidedError
              {...getErrorGuidance({ workflow: "api-key", message: validationError || "Invalid API key." })}
              technicalDetails={{
                message: validationError || "Invalid API key.",
                route: "/protected",
                hasKeyQueryParam: Boolean(key),
              }}
            />
            <button 
              onClick={() => window.history.back()}
              className="rounded-full bg-rose-500 px-8 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-rose-400 shadow-lg shadow-rose-500/20 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] active:scale-95 cursor-pointer"
            >
              Go Back
            </button>
          </div>
        )}
      </div>

      <div className="mt-auto pt-8 flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
          <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <StatusPill tone="success" compact>Protected Route</StatusPill>
      </div>
    </CommandPanel>
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
      variant="account"
      sidebar={{
        totalUsage,
        plan: currentPlan,
        limit: currentLimit,
        isUnlimited,
      }}
    >
      <Suspense fallback={
        <div className="flex-1 rounded-[32px] border border-white/5 bg-slate-950/40 p-8 backdrop-blur-xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-slate-900 rounded-full"></div>
            <div className="h-32 w-full bg-slate-900/50 rounded-[24px]"></div>
          </div>
        </div>
      }>
        <ProtectedContent />
      </Suspense>
      <Toast toast={toast} />
    </DashboardShell>
  );
}
