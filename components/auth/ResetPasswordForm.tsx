"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthStatusCard } from "@/components/auth/AuthStatusCard";
import { GuidedError } from "@/components/ui/GuidedError";
import { getAuthErrorGuidance, normalizeAuthError, type AuthErrorKind } from "@/lib/auth-errors";
import { DEFAULT_AUTH_REDIRECT, getSafeAuthRedirect } from "@/lib/auth-utils";
import { AUTH_PASSWORD_MIN_LENGTH, getPasswordValidationError } from "@/lib/auth-validation";
import { createClient } from "@/lib/supabase/client";

type ResetState = "checking" | "ready" | "invalid";

type ResetPasswordFormProps = {
  nextPath?: string;
  hasServerRecoveryMarker?: boolean;
  callbackError?: boolean;
};

export function ResetPasswordForm({
  nextPath = DEFAULT_AUTH_REDIRECT,
  hasServerRecoveryMarker = false,
  callbackError = false,
}: ResetPasswordFormProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
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
    if (!updated) return;
    const timer = window.setTimeout(() => router.replace(safeNext), 1600);
    return () => window.clearTimeout(timer);
  }, [router, safeNext, updated]);

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(() => {
      if (active) setState("invalid");
    }, 8000);
    const hasRecoveryHash = (() => {
      const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      return params.get("type") === "recovery" && Boolean(params.get("access_token") && params.get("refresh_token"));
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "PASSWORD_RECOVERY" || !session) return;
      setState("ready");
      if (window.location.hash) {
        window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
      }
    });

    const markInvalid = () => window.setTimeout(() => {
      if (active) setState("invalid");
    }, 0);

    if (callbackError) {
      window.clearTimeout(timeout);
      markInvalid();
    } else if (hasServerRecoveryMarker || hasRecoveryHash) {
      void supabase.auth.getSession().then(({ data, error }) => {
        if (!active) return;
        window.clearTimeout(timeout);
        setState(!error && data.session ? "ready" : "invalid");
        if (hasRecoveryHash && window.location.hash) {
          window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
        }
      });
    } else {
      window.clearTimeout(timeout);
      markInvalid();
    }

    return () => {
      active = false;
      window.clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [callbackError, hasServerRecoveryMarker, supabase.auth]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;
    setErrorKind(null);
    setTechnicalDetails(undefined);

    const validationError = getPasswordValidationError(password, confirmPassword);
    if (validationError) {
      setErrorKind(validationError);
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setConfirmPassword("");
      setUpdated(true);
      void fetch("/auth/recovery/complete", { method: "POST" });
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
    const requestHref = safeNext === DEFAULT_AUTH_REDIRECT ? "/forgot-password" : `/forgot-password?next=${encodeURIComponent(safeNext)}`;
    return <AuthStatusCard tone="neutral" eyebrow="Recovery session" title="This reset link is no longer active" description="The link may have expired, already been used, or opened without the secure session it needs." primaryHref={requestHref} primaryLabel="Request a new link" secondaryHref="/login" secondaryLabel="Return to sign in" />;
  }

  if (updated) {
    return <AuthStatusCard title="Password updated" description="Your password has been changed securely. You’ll be returned to your workspace shortly." primaryHref={safeNext} primaryLabel="Continue to workspace" secondaryHref="/login" secondaryLabel="Return to sign in" />;
  }

  const guidance = errorKind ? getAuthErrorGuidance(errorKind) : null;

  return (
    <div className="space-y-7">
      {guidance && <div id="reset-error"><GuidedError {...guidance} technicalDetails={technicalDetails} compact /></div>}
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="space-y-2">
          <label htmlFor="new-password" className="dandi-label ml-1">New password</label>
          <div className="relative">
            <input id="new-password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => { setPassword(event.target.value); setErrorKind(null); setTechnicalDetails(undefined); }} required minLength={AUTH_PASSWORD_MIN_LENGTH} disabled={isLoading} aria-describedby={errorKind ? "reset-error password-requirements" : "password-requirements"} aria-invalid={errorKind === "weak-password" ? "true" : undefined} className="dandi-field px-4 py-3.5 pr-14 text-sm font-medium sm:px-5 sm:pr-14" placeholder="••••••••" />
            <button type="button" onClick={() => setShowPassword((visible) => !visible)} disabled={isLoading} className="absolute inset-y-0 right-3 flex w-10 items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "◉" : "◌"}</button>
          </div>
          <p id="password-requirements" className="px-1 text-xs leading-5 text-slate-500">Use at least {AUTH_PASSWORD_MIN_LENGTH} characters.</p>
        </div>
        <div className="space-y-2">
          <label htmlFor="confirm-password" className="dandi-label ml-1">Confirm new password</label>
          <input id="confirm-password" name="confirm-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); setErrorKind(null); setTechnicalDetails(undefined); }} required minLength={AUTH_PASSWORD_MIN_LENGTH} disabled={isLoading} aria-describedby={errorKind ? "reset-error" : undefined} aria-invalid={errorKind === "password-mismatch" ? "true" : undefined} className="dandi-field px-4 py-3.5 text-sm font-medium sm:px-5" placeholder="••••••••" />
        </div>
        <button type="submit" disabled={isLoading} aria-busy={isLoading || undefined} className="min-h-12 w-full rounded-xl bg-emerald-300 px-4 py-3.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">{isLoading ? "Updating securely…" : "Update password"}</button>
      </form>
    </div>
  );
}
