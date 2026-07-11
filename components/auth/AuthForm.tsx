"use client";

import { useState, useEffect, useId } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { getURL } from "@/lib/utils/url-helper";
import { GuidedError } from "@/components/ui/GuidedError";
import { getErrorGuidance } from "@/lib/error-guidance";

interface AuthFormProps {
  defaultMode: "login" | "signup";
}

export function AuthForm({ defaultMode }: AuthFormProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const formId = useId();
  const fullNameId = `${formId}-full-name`;
  const emailId = `${formId}-email`;
  const passwordId = `${formId}-password`;
  const errorId = `${formId}-error`;
  const successId = `${formId}-success`;

  // Initialize based on pathname if available, otherwise fallback to defaultMode
  const [isSignUp, setIsSignUp] = useState(
    pathname === "/signup" ? true : pathname === "/login" ? false : defaultMode === "signup"
  );
  const [usePassword, setUsePassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isMagicLinkSent, setIsMagicLinkSent] = useState(false);

  // Sync state to URL
  useEffect(() => {
    if (isSignUp && pathname === "/login") {
      router.replace("/signup", { scroll: false });
    } else if (!isSignUp && pathname === "/signup") {
      router.replace("/login", { scroll: false });
    }
  }, [isSignUp, pathname, router]);

  // Sync URL to state (handles manual navigation / browser back/forward)
  useEffect(() => {
    const shouldBeSignUp = pathname === "/signup";
    if ((pathname === "/signup" || pathname === "/login") && isSignUp !== shouldBeSignUp) {
      const timer = setTimeout(() => setIsSignUp(shouldBeSignUp), 0);
      return () => clearTimeout(timer);
    }
  }, [pathname, isSignUp]);

  // Listen for authentication across tabs (e.g. user clicks magic link in another tab)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        router.push("/dashboards");
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth, router]);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setIsLoading(true);

    try {
      if (usePassword) {
        if (isSignUp) {
          if (!password || password.length < 6) {
            setError("Password must be at least 6 characters.");
            setIsLoading(false);
            return;
          }

          const { data, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: fullName },
              emailRedirectTo: `${getURL()}/auth/callback?next=/auth/success`,
            },
          });

          if (authError) throw authError;

          if (data.session) {
            router.push("/dashboards");
            router.refresh();
          } else {
            setSuccessMessage("Account created! Please check your email to confirm your registration.");
          }
        } else {
          const { error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (authError) throw authError;

          router.push("/dashboards");
          router.refresh();
        }
      } else {
        // Magic Link Flow
        const { error: authError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/auth/success`,
          },
        });

        if (authError) throw authError;

        setIsMagicLinkSent(true);
        setSuccessMessage("Magic link sent! Please check your inbox.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function signInWithGoogle() {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (error) throw error;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to sign in with Google";
      setError(message);
      setIsLoading(false);
    }
  }

  if (isMagicLinkSent) {
    return (
      <div role="status" aria-live="polite" aria-atomic="true" className="rounded-2xl border border-emerald-400/15 bg-emerald-400/10 p-6 text-center animate-in fade-in zoom-in duration-300">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>
        <h3 className="font-serif text-lg font-bold text-white">Check your inbox</h3>
        <p className="mt-2 break-words text-sm leading-relaxed text-slate-400">
          We&apos;ve sent a sign-in link to <span className="font-bold text-emerald-300">{email}</span>.
        </p>
        <button
          onClick={() => setIsMagicLinkSent(false)}
          className="mt-6 rounded-lg px-2 py-1 text-xs font-bold uppercase tracking-[0.14em] text-emerald-300 transition-colors hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
        >
          Try a different email
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-7">
      <div className="space-y-2">
        <h2 className="font-serif text-3xl font-bold tracking-tight text-white transition-all duration-300">
          {isSignUp ? "Create your account" : "Welcome back"}
        </h2>
        <p className="max-w-sm text-sm leading-6 text-slate-400 transition-all duration-300">
          {!usePassword
            ? "Use a one-time link sent to your inbox."
            : isSignUp
              ? "Create a Dandi workspace for API keys, usage, and repository insights."
              : "Access your dashboard, API keys, usage, and billing."}
        </p>
      </div>

      {error && (
        <div id={errorId}>
          <GuidedError
            {...getErrorGuidance({ workflow: "auth", message: error })}
            technicalDetails={error}
            compact
            className="animate-in slide-in-from-top-2 duration-300"
          />
        </div>
      )}

      {successMessage && (
        <div id={successId} role="status" aria-live="polite" aria-atomic="true" className="rounded-xl border border-emerald-400/15 bg-emerald-400/10 p-4 text-sm font-medium text-emerald-200 animate-in slide-in-from-top-2 duration-300">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleAuth} className="space-y-5">
        {usePassword && isSignUp && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <label htmlFor={fullNameId} className="dandi-label ml-1">Full Name</label>
            <input
              id={fullNameId}
              name="name"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required={usePassword && isSignUp}
              disabled={isLoading}
              aria-describedby={error && error.toLowerCase().includes("name") ? errorId : undefined}
              aria-invalid={Boolean(error && error.toLowerCase().includes("name")) || undefined}
              className="dandi-field px-4 py-3.5 text-sm font-medium sm:px-5"
              placeholder="Jane Doe"
            />
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor={emailId} className="dandi-label ml-1">Email Address</label>
          <input
            id={emailId}
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            aria-describedby={error && error.toLowerCase().includes("email") ? errorId : undefined}
            aria-invalid={Boolean(error && error.toLowerCase().includes("email")) || undefined}
            className="dandi-field px-4 py-3.5 text-sm font-medium sm:px-5"
            placeholder="name@company.com"
          />
        </div>

        {usePassword && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <label htmlFor={passwordId} className="dandi-label ml-1">Password</label>
            <div className="relative">
              <input
                id={passwordId}
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={usePassword}
                disabled={isLoading}
                aria-describedby={error && error.toLowerCase().includes("password") ? errorId : undefined}
                aria-invalid={Boolean(error && error.toLowerCase().includes("password")) || undefined}
                className="dandi-field px-4 py-3.5 pr-14 text-sm font-medium sm:px-5 sm:pr-14"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                disabled={isLoading}
                className="absolute inset-y-0 right-3 flex w-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 4.3A10.7 10.7 0 0112 4c5.2 0 8.6 4 9.8 6.3a3.2 3.2 0 01-.2.4M6.2 6.2C4.4 7.4 3.2 9 2.2 10.8 3.4 13 6.8 17 12 17c1 0 1.9-.2 2.7-.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M2.2 12C3.4 9.7 6.8 6 12 6s8.6 3.7 9.8 6c-1.2 2.3-4.6 6-9.8 6s-8.6-3.7-9.8-6z" /><circle cx="12" cy="12" r="2.5" /></svg>
                )}
              </button>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          aria-busy={isLoading || undefined}
          className="group relative min-h-12 w-full cursor-pointer overflow-hidden rounded-xl bg-emerald-300 px-4 py-3.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-950 shadow-[0_12px_30px_rgba(52,211,153,0.14)] transition-all hover:bg-emerald-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          <span className={isLoading ? "opacity-0" : "opacity-100 transition-opacity"}>
            {!usePassword 
              ? "Continue with Email Link"
              : isSignUp ? "Sign Up" : "Sign In"}
          </span>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-950/30 border-t-zinc-950" aria-hidden="true" />
            </div>
          )}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setUsePassword(!usePassword);
              setError(null);
            }}
            className="cursor-pointer rounded-lg px-1 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 transition-colors hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
          >
            {usePassword ? "Use email link instead" : "Use password instead"}
          </button>
        </div>
      </form>

      <div className="relative flex items-center py-2">
        <div className="flex-grow border-t border-white/10"></div>
        <span className="flex-shrink-0 px-4 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">Or continue with</span>
        <div className="flex-grow border-t border-white/10"></div>
      </div>

      <button
        onClick={signInWithGoogle}
        disabled={isLoading}
        aria-busy={isLoading || undefined}
        className="group flex min-h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-white/12 bg-white/[0.045] px-6 py-3.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white transition-all hover:border-emerald-300/30 hover:bg-white/[0.08] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c3.11 0 5.72-1.03 7.63-2.79l-3.57-2.77c-.99.66-2.23 1.06-3.79 1.06-2.91 0-5.38-1.97-6.26-4.62H2.18v2.87A11.992 11.992 0 0 0 12 23z" fill="#34A853" />
          <path d="M5.74 13.88c-.23-.66-.36-1.37-.36-2.12s.13-1.46.36-2.12V6.77H2.18C1.4 8.35 1 10.12 1 12s.4 3.65 1.18 5.23l3.56-2.77z" fill="#FBBC05" />
          <path d="M12 4.64c1.69 0 3.21.58 4.41 1.72l3.31-3.31C17.71 1.06 15.1 0 12 0 7.37 0 3.4 2.65 1.18 6.77l3.56 2.77c.88-2.65 3.35-4.62 6.26-4.62z" fill="#EA4335" />
        </svg>
        Continue with Google
      </button>

      <div className="border-t border-white/10 pt-5 text-center text-sm text-slate-500">
        {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
        <button 
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError(null);
            setSuccessMessage(null);
          }}
          className="cursor-pointer rounded-lg px-1 py-1 font-bold text-emerald-300 transition-colors hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
        >
          {isSignUp ? "Sign in" : "Sign up"}
        </button>
      </div>
    </div>
  );
}
