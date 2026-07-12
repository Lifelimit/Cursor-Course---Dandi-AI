"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GuidedError } from "@/components/ui/GuidedError";
import { getAuthErrorGuidance, normalizeAuthError, type AuthErrorKind } from "@/lib/auth-errors";
import { getAuthCallbackUrl, getSafeAuthRedirect } from "@/lib/auth-utils";

interface AuthFormProps {
  defaultMode: "login" | "signup";
  nextPath?: string;
}

export function AuthForm({ defaultMode, nextPath = "/dashboards" }: AuthFormProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const formId = useId();
  const fullNameId = `${formId}-full-name`;
  const emailId = `${formId}-email`;
  const passwordId = `${formId}-password`;
  const errorId = `${formId}-error`;
  const safeNext = getSafeAuthRedirect(nextPath);
  const hasNavigated = useRef(false);

  const isSignUp = pathname === "/signup" ? true : pathname === "/login" ? false : defaultMode === "signup";
  const [usePassword, setUsePassword] = useState(defaultMode === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorKind, setErrorKind] = useState<AuthErrorKind | null>(null);
  const [technicalDetails, setTechnicalDetails] = useState<string | undefined>();
  const [isMagicLinkSent, setIsMagicLinkSent] = useState(false);
  const [isAccountCreated, setIsAccountCreated] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        if (hasNavigated.current) return;
        hasNavigated.current = true;
        router.replace(safeNext);
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [router, safeNext, supabase.auth]);

  function clearError() {
    setErrorKind(null);
    setTechnicalDetails(undefined);
  }

  function setAuthError(value: unknown) {
    const normalized = normalizeAuthError(value);
    setErrorKind(normalized.kind);
    setTechnicalDetails(normalized.technicalDetails);
  }

  function switchMode(nextMode: "login" | "signup") {
    setUsePassword(nextMode === "signup");
    setPassword("");
    setShowPassword(false);
    clearError();
    setIsMagicLinkSent(false);
    setIsAccountCreated(false);
    const route = nextMode === "signup" ? "/signup" : "/login";
    const query = safeNext === "/dashboards" ? "" : `?next=${encodeURIComponent(safeNext)}`;
    router.push(`${route}${query}`, { scroll: false });
  }

  async function handleAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;
    clearError();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setAuthError(new Error("Invalid email"));
      return;
    }
    if (usePassword && isSignUp && !fullName.trim()) {
      setAuthError(new Error("Name is required"));
      return;
    }
    if (usePassword && (!password || (isSignUp && password.length < 6))) {
      setAuthError(new Error("Password must be at least 6 characters"));
      return;
    }

    setIsLoading(true);
    try {
      if (usePassword && isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: getAuthCallbackUrl("/auth/success", { flow: "signup", returnTo: safeNext }),
          },
        });

        if (error) throw error;
        if (data.session) {
          if (!hasNavigated.current) {
            hasNavigated.current = true;
            router.replace(safeNext);
          }
          router.refresh();
        } else {
          setIsAccountCreated(true);
        }
        return;
      }

      if (usePassword) {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        if (!hasNavigated.current) {
          hasNavigated.current = true;
          router.replace(safeNext);
        }
        router.refresh();
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: getAuthCallbackUrl(safeNext) },
      });
      if (error) throw error;
      setIsMagicLinkSent(true);
    } catch (authError) {
      setAuthError(authError);
    } finally {
      setIsLoading(false);
    }
  }

  async function signInWithGoogle() {
    if (isLoading) return;
    clearError();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getAuthCallbackUrl(safeNext),
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (error) throw error;
    } catch (authError) {
      setAuthError(authError);
      setIsLoading(false);
    }
  }

  if (isMagicLinkSent || isAccountCreated) {
    const accountCreated = isAccountCreated;
    return (
      <div role="status" aria-live="polite" aria-atomic="true" className="rounded-2xl border border-emerald-400/15 bg-emerald-400/10 p-6 text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 14.5z" /><path d="m4.5 5 7.5 6 7.5-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <p className="dandi-type-metadata font-bold uppercase text-emerald-200/75">{accountCreated ? "Account created" : "Magic link sent"}</p>
        <h2 className="dandi-type-display mt-3 text-2xl font-bold text-white">Check your inbox</h2>
        <p className="mt-3 break-words text-sm leading-6 text-slate-400">{accountCreated ? "We sent a confirmation link to:" : "We sent a secure sign-in link to:"}</p>
        <p className="mt-2 break-words font-mono text-sm text-emerald-200">{email}</p>
        <p className="mt-4 text-xs leading-5 text-slate-500">Open the newest message in this browser when possible. Links are single-use and time-limited.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button type="button" onClick={() => { setIsMagicLinkSent(false); setIsAccountCreated(false); }} className="min-h-10 rounded-xl border border-white/12 bg-white/[0.04] px-4 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300 transition hover:border-emerald-300/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70">Use a different email</button>
          {accountCreated && <button type="button" onClick={() => switchMode("login")} className="min-h-10 rounded-xl px-4 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300 transition hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70">Return to sign in</button>}
        </div>
      </div>
    );
  }

  const guidance = errorKind ? getAuthErrorGuidance(errorKind) : null;

  return (
    <div className="w-full space-y-7">
      <div className="space-y-2">
        <h2 className="dandi-type-display text-3xl font-bold tracking-tight text-white">{isSignUp ? "Create your Dandi workspace" : "Welcome back"}</h2>
        <p className="max-w-sm text-sm leading-6 text-slate-400">{!usePassword ? "Use a one-time link sent to your inbox." : isSignUp ? "Analyze repositories, build source-backed understanding, and connect private code when ready." : "Access your dashboard, API keys, usage, and repository insights."}</p>
      </div>

      {guidance && <div id={errorId}><GuidedError {...guidance} technicalDetails={technicalDetails} compact /></div>}

      <form onSubmit={handleAuth} className="space-y-5" noValidate>
        {usePassword && isSignUp && <div className="space-y-2">
          <label htmlFor={fullNameId} className="dandi-label ml-1">Full name</label>
          <input id={fullNameId} name="name" type="text" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} required disabled={isLoading} aria-describedby={errorKind === "missing-name" ? errorId : undefined} aria-invalid={errorKind === "missing-name" ? "true" : undefined} className="dandi-field px-4 py-3.5 text-sm font-medium sm:px-5" placeholder="Jane Doe" />
        </div>}

        <div className="space-y-2">
          <label htmlFor={emailId} className="dandi-label ml-1">Email address</label>
          <input id={emailId} name="email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => { setEmail(event.target.value); if (errorKind === "invalid-email") clearError(); }} required disabled={isLoading} aria-describedby={guidance ? errorId : undefined} aria-invalid={errorKind === "invalid-email" ? "true" : undefined} className="dandi-field px-4 py-3.5 text-sm font-medium sm:px-5" placeholder="name@company.com" />
        </div>

        {usePassword && <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor={passwordId} className="dandi-label ml-1">Password</label>
            {!isSignUp && <a href={`/forgot-password?next=${encodeURIComponent(safeNext)}`} className="text-xs font-semibold text-emerald-300 hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70">Forgot password?</a>}
          </div>
          <div className="relative">
            <input id={passwordId} name="password" type={showPassword ? "text" : "password"} autoComplete={isSignUp ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} required disabled={isLoading} aria-describedby={isSignUp ? `${passwordId}-hint` : guidance ? errorId : undefined} aria-invalid={errorKind === "weak-password" ? "true" : undefined} className="dandi-field px-4 py-3.5 pr-14 text-sm font-medium sm:px-5 sm:pr-14" placeholder="••••••••" />
            <button type="button" onClick={() => setShowPassword((visible) => !visible)} disabled={isLoading} className="absolute inset-y-0 right-3 flex w-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70" aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? "◉" : "◌"}
            </button>
          </div>
          {isSignUp && <p id={`${passwordId}-hint`} className="px-1 text-xs leading-5 text-slate-500">Use at least 6 characters. A password manager can generate and save one for you.</p>}
        </div>}

        <button type="submit" disabled={isLoading} aria-busy={isLoading || undefined} className="group relative min-h-12 w-full cursor-pointer overflow-hidden rounded-xl bg-emerald-300 px-4 py-3.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-950 shadow-[0_12px_30px_rgba(52,211,153,0.14)] transition-all hover:bg-emerald-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
          {isLoading ? "Connecting securely…" : !usePassword ? "Email me a sign-in link" : isSignUp ? "Create workspace" : "Sign in"}
        </button>

        <div className="text-center">
          <button type="button" onClick={() => { setUsePassword((value) => !value); setPassword(""); setShowPassword(false); clearError(); }} disabled={isLoading} className="cursor-pointer rounded-lg px-1 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 transition-colors hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70">{usePassword ? "Use email link instead" : "Use password instead"}</button>
        </div>
      </form>

      <div className="relative flex items-center py-2"><div className="flex-grow border-t border-white/10" /><span className="flex-shrink-0 px-4 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">Or continue with</span><div className="flex-grow border-t border-white/10" /></div>

      <button type="button" onClick={signInWithGoogle} disabled={isLoading} aria-busy={isLoading || undefined} className="group flex min-h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-white/12 bg-white/[0.045] px-6 py-3.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white transition-all hover:border-emerald-300/30 hover:bg-white/[0.08] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-black text-slate-950" aria-hidden="true">G</span>
        {isLoading ? "Connecting securely…" : "Continue with Google"}
      </button>

      <div className="border-t border-white/10 pt-5 text-center text-sm text-slate-500">
        {isSignUp ? "Already have an account?" : "Don't have an account?"} {" "}
        <button type="button" onClick={() => switchMode(isSignUp ? "login" : "signup")} disabled={isLoading} className="cursor-pointer rounded-lg px-1 py-1 font-bold text-emerald-300 transition-colors hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70">{isSignUp ? "Sign in" : "Sign up"}</button>
      </div>
    </div>
  );
}
