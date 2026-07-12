"use client";

import { useState, type FormEvent } from "react";
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
  const { toast, showToast } = useToast();
  const [key, setKey] = useState("");
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [keyName, setKeyName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateKey = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading) return;

    const submittedKey = key.trim();
    setIsValid(null);
    setKeyName(null);
    setValidationError(null);

    if (!submittedKey) {
      const message = "Enter an API key to validate.";
      setIsValid(false);
      setValidationError(message);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: submittedKey }),
      });
      const data = await response.json().catch(() => null) as { valid?: boolean; name?: string; error?: string } | null;

      if (response.ok && data?.valid) {
        setIsValid(true);
        setKeyName(data.name || "Validated key");
        setKey("");
        showToast("success", `Valid API Key: ${data.name || "Validated key"}`);
      } else {
        setIsValid(false);
        const message = data?.error || "Invalid API key.";
        setValidationError(message);
        showToast("error", getToastErrorMessage("api-key", message));
      }
    } catch {
      setIsValid(false);
      const message = "API key validation is temporarily unavailable.";
      setValidationError(message);
      showToast("error", getToastErrorMessage("api-key", message));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <CommandPanel className="flex h-full flex-col p-8">
        <div className="space-y-2">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300/75">API Key Verification</p>
          <h1 className="font-serif text-4xl font-bold text-white md:text-5xl">Protected Area.</h1>
          <p className="mt-4 text-sm font-medium text-slate-400">Validate an API key before showing protected content.</p>
        </div>

        <form className="mt-10 space-y-3" onSubmit={validateKey}>
          <label htmlFor="protected-api-key" className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
            API key
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="protected-api-key"
              name="api-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={key}
              onChange={(event) => setKey(event.target.value)}
              disabled={isLoading}
              aria-describedby="protected-api-key-help"
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950/70 px-4 font-mono text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-300/50 focus:ring-4 focus:ring-emerald-300/10 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="dandi_…"
            />
            <button
              type="submit"
              disabled={isLoading || !key.trim()}
              aria-busy={isLoading}
              className="min-h-11 rounded-xl bg-emerald-300 px-6 text-[10px] font-black uppercase tracking-widest text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Validating…" : "Validate key"}
            </button>
          </div>
          <p id="protected-api-key-help" className="text-xs leading-5 text-slate-500">
            The key is sent in the request body and is never placed in the page URL.
          </p>
        </form>

        <div className="mt-10 flex-1" aria-live="polite">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-300 border-t-transparent"></div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Validating API key...</p>
          </div>
        ) : isValid === true ? (
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
        ) : isValid === false ? (
          <div className="space-y-6">
            <GuidedError
              {...getErrorGuidance({ workflow: "api-key", message: validationError || "Invalid API key." })}
              technicalDetails={{
                message: validationError || "Invalid API key.",
                route: "/protected",
                keyProvided: Boolean(key),
              }}
            />
          </div>
        ) : (
          <div className="rounded-[24px] border border-white/10 bg-slate-950/40 p-6 text-sm leading-6 text-slate-400">
            Enter a workspace API key above to run the validation check. This hidden route does not unlock additional product capabilities.
          </div>
        )}
        </div>

        <div className="mt-auto flex items-center gap-2 pt-8 text-[9px] font-bold uppercase tracking-widest text-slate-500">
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
      <ProtectedContent />
    </DashboardShell>
  );
}
