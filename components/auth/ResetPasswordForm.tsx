"use client";

import { useEffect, useMemo, useState } from "react";
import { GuidedError } from "@/components/ui/GuidedError";
import { AuthStatusCard } from "@/components/auth/AuthStatusCard";
import { getAuthErrorGuidance, normalizeAuthError, type AuthErrorKind } from "@/lib/auth-errors";
import { getSafeAuthRedirect } from "@/lib/auth-utils";
import { createClient } from "@/lib/supabase/client";

type ResetState = "checking" | "ready" | "invalid";

export function ResetPasswordForm({ nextPath = "/dashboards" }: { nextPath?: string }) {
  const supabase = useMemo(() => createClient(), []);
  const safeNext = getSafeAuthRedirect(nextPath);
  const [state, setState] = useState<ResetState>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [errorKind, setErrorKind] = useState<AuthErrorKind | null>(null);
  const [technicalDetails, setTechnicalDetails] = useState<string>();

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active) setState("invalid");
    }, 8000);

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      clearTimeout(timer);
      setState(!error && data.session ? "ready" : "invalid");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) setState("ready");
    });

    return () => {
      active = false;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;
    setErrorKind(null);
    setTechnicalDetails(undefined);

    if (password.length < 6) {
      setErrorKind("weak-password");
      return;
    }
    if (password !== confirmPassword) {
      setErrorKind("password-mismatch");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setConfirmPassword("");
      setUpdated(true);
    } catch (authError) {
      const normalized = normalizeAuthError(authError);
      setErrorKind(normalized.kind);
      setTechnicalDetails(normalized.technicalDetails);
    } finally {
      setIsLoading(false);
    }
  }

  if (state === "checking") {
    return <div role="status" aria-live="polite" className="space-y-4 text-center"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-emerald-300/20 border-t-emerald-300" aria-hidden="true" /><p className="text-sm text-slate-400">Validating your recovery session…</p></div>;
  }

  if (state === "invalid") {
    return <AuthStatusCard tone="neutral" eyebrow="Recovery session" title="This reset link is no longer active" description="The link may have expired, already been used, or opened without the secure session it needs." primaryHref="/forgot-password" primaryLabel="Request a new link" secondaryHref="/login" secondaryLabel="Return to sign in" />;
  }

  if (updated) {
    return <AuthStatusCard title="Password updated" description="Your password has been changed securely. Continue to your workspace when you’re ready." primaryHref={safeNext} primaryLabel="Continue to workspace" secondaryHref="/login" secondaryLabel="Return to sign in" />;
  }

  const guidance = errorKind ? getAuthErrorGuidance(errorKind) : null;

  return (
    <div className="space-y-7">
      {guidance && <div id="reset-error"><GuidedError {...guidance} technicalDetails={technicalDetails} compact /></div>}
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="space-y-2"><label htmlFor="new-password" className="dandi-label ml-1">New password</label><div className="relative"><input id="new-password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={isLoading} aria-invalid={errorKind === "weak-password" ? "true" : undefined} className="dandi-field px-4 py-3.5 pr-14 text-sm font-medium sm:px-5 sm:pr-14" placeholder="••••••••" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} disabled={isLoading} className="absolute inset-y-0 right-3 flex w-10 items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "◉" : "◌"}</button></div><p className="px-1 text-xs leading-5 text-slate-500">Use at least 6 characters.</p></div>
        <div className="space-y-2"><label htmlFor="confirm-password" className="dandi-label ml-1">Confirm new password</label><input id="confirm-password" name="confirm-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required disabled={isLoading} aria-invalid={errorKind === "password-mismatch" ? "true" : undefined} className="dandi-field px-4 py-3.5 text-sm font-medium sm:px-5" placeholder="••••••••" /></div>
        <button type="submit" disabled={isLoading} aria-busy={isLoading || undefined} className="min-h-12 w-full rounded-xl bg-emerald-300 px-4 py-3.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">{isLoading ? "Updating securely…" : "Update password"}</button>
      </form>
    </div>
  );
}
