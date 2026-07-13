"use client";

import { useMemo, useState } from "react";
import { GuidedError } from "@/components/ui/GuidedError";
import { getAuthErrorGuidance, normalizeAuthError, type AuthErrorKind } from "@/lib/auth-errors";
import { getAuthCallbackUrl, getSafeAuthRedirect, PASSWORD_RESET_ROUTE } from "@/lib/auth-utils";
import { isValidAuthEmail, normalizeAuthEmail } from "@/lib/auth-validation";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm({ nextPath = "/dashboards" }: { nextPath?: string }) {
  const supabase = useMemo(() => createClient(), []);
  const safeNext = getSafeAuthRedirect(nextPath);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [errorKind, setErrorKind] = useState<AuthErrorKind | null>(null);
  const [technicalDetails, setTechnicalDetails] = useState<string>();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;
    setErrorKind(null);
    setTechnicalDetails(undefined);

    const normalizedEmail = normalizeAuthEmail(email);
    if (!isValidAuthEmail(normalizedEmail)) {
      setErrorKind("invalid-email");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: getAuthCallbackUrl(PASSWORD_RESET_ROUTE, { flow: "recovery", returnTo: safeNext }),
      });
      if (error) throw error;
      setEmail(normalizedEmail);
      setIsSent(true);
    } catch (authError) {
      const normalized = normalizeAuthError(authError);
      setErrorKind(normalized.kind);
      setTechnicalDetails(normalized.technicalDetails);
    } finally {
      setIsLoading(false);
    }
  }

  if (isSent) {
    return (
      <div role="status" aria-live="polite" aria-atomic="true" className="space-y-5 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-400/10 text-emerald-200"><span aria-hidden="true">✓</span></div>
        <div>
          <p className="dandi-type-metadata font-bold uppercase text-emerald-200/75">Recovery email requested</p>
          <h1 className="dandi-type-display mt-3 text-3xl font-bold text-white">Check your inbox</h1>
          <p className="mt-4 text-sm leading-6 text-slate-400">If an eligible account exists for this address, a recovery email has been sent.</p>
          <p className="mt-4 break-words font-mono text-sm text-emerald-200">{email}</p>
        </div>
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-4">
          <button type="button" onClick={() => setIsSent(false)} className="rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300 transition hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70">Send another email</button>
          <button type="button" onClick={() => { setEmail(""); setIsSent(false); }} className="rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70">Use a different email</button>
        </div>
      </div>
    );
  }

  const guidance = errorKind ? getAuthErrorGuidance(errorKind) : null;

  return (
    <div className="space-y-7">
      {guidance && <div id="recovery-error"><GuidedError {...guidance} technicalDetails={technicalDetails} compact /></div>}
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="space-y-2">
          <label htmlFor="recovery-email" className="dandi-label ml-1">Email address</label>
          <input id="recovery-email" name="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); if (errorKind) { setErrorKind(null); setTechnicalDetails(undefined); } }} required disabled={isLoading} aria-describedby={errorKind ? "recovery-error" : undefined} aria-invalid={errorKind === "invalid-email" ? "true" : undefined} className="dandi-field px-4 py-3.5 text-sm font-medium sm:px-5" placeholder="name@company.com" />
        </div>
        <button type="submit" disabled={isLoading} aria-busy={isLoading || undefined} className="min-h-12 w-full rounded-xl bg-emerald-300 px-4 py-3.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">{isLoading ? "Preparing secure recovery…" : "Send recovery email"}</button>
      </form>
    </div>
  );
}
