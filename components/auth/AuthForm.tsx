"use client";

import { useState, useEffect, useId } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { getURL } from "@/lib/utils/url-helper";
import { GuidedError } from "@/components/ui/GuidedError";
import { getErrorGuidance, type AuthErrorFlow } from "@/lib/error-guidance";

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorAuthFlow, setErrorAuthFlow] = useState<AuthErrorFlow | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isMagicLinkSent, setIsMagicLinkSent] = useState(false);
  const authFlow: AuthErrorFlow = isSignUp ? "signup" : usePassword ? "login" : "magic-link";

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
    setErrorAuthFlow(authFlow);
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
    setError(null);
    setErrorAuthFlow("oauth");
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
    <div className="w-full space-y-6">
      <div className="space-y-2">
        <h2 className="font-serif text-2xl font-bold transition-all duration-300 text-white">
          {isSignUp ? "Create your account" : "Welcome back"}
        </h2>
        <p className="text-sm text-slate-400 transition-all duration-300">
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
            {...getErrorGuidance({ workflow: "auth", message: error, authFlow: errorAuthFlow ?? authFlow })}
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

      <form onSubmit={handleAuth} className="space-y-4">
        {usePassword && isSignUp && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <label htmlFor={fullNameId} className="ml-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Full Name</label>
            <input
              id={fullNameId}
              type="text" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required={usePassword && isSignUp}
              disabled={isLoading}
              aria-describedby={error && error.toLowerCase().includes("name") ? errorId : undefined}
              aria-invalid={Boolean(error && error.toLowerCase().includes("name")) || undefined}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-5 py-4 text-sm font-medium text-white placeholder-slate-600 outline-none transition-all focus:border-emerald-300/50 focus:ring-4 focus:ring-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Jane Doe"
            />
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor={emailId} className="ml-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Email Address</label>
          <input
            id={emailId}
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            aria-describedby={error && error.toLowerCase().includes("email") ? errorId : undefined}
            aria-invalid={Boolean(error && error.toLowerCase().includes("email")) || undefined}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-5 py-4 text-sm font-medium text-white placeholder-slate-600 outline-none transition-all focus:border-emerald-300/50 focus:ring-4 focus:ring-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="name@company.com"
          />
        </div>

        {usePassword && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <label htmlFor={passwordId} className="ml-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Password</label>
            <input
              id={passwordId}
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={usePassword}
              disabled={isLoading}
              aria-describedby={error && error.toLowerCase().includes("password") ? errorId : undefined}
              aria-invalid={Boolean(error && error.toLowerCase().includes("password")) || undefined}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-5 py-4 text-sm font-medium text-white placeholder-slate-600 outline-none transition-all focus:border-emerald-300/50 focus:ring-4 focus:ring-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="••••••••"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          aria-busy={isLoading || undefined}
          className="group relative w-full cursor-pointer overflow-hidden rounded-2xl bg-emerald-400 py-4 text-[10px] font-black uppercase tracking-[0.14em] text-slate-950 transition-all hover:bg-emerald-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
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
            className="cursor-pointer rounded-lg px-1 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
          >
            {usePassword ? "Use email link instead" : "Use password instead"}
          </button>
        </div>
      </form>

      <div className="relative flex items-center py-2">
        <div className="flex-grow border-t border-white/10"></div>
        <span className="flex-shrink-0 px-4 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Or continue with</span>
        <div className="flex-grow border-t border-white/10"></div>
      </div>

      <button
        onClick={signInWithGoogle}
        disabled={isLoading}
        aria-busy={isLoading || undefined}
        className="group flex w-full cursor-pointer items-center justify-center gap-4 rounded-2xl border border-white/10 bg-slate-950/70 px-6 py-4 text-[10px] font-bold uppercase tracking-[0.14em] text-white transition-all hover:bg-white/5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c3.11 0 5.72-1.03 7.63-2.79l-3.57-2.77c-.99.66-2.23 1.06-3.79 1.06-2.91 0-5.38-1.97-6.26-4.62H2.18v2.87A11.992 11.992 0 0 0 12 23z" fill="#34A853" />
          <path d="M5.74 13.88c-.23-.66-.36-1.37-.36-2.12s.13-1.46.36-2.12V6.77H2.18C1.4 8.35 1 10.12 1 12s.4 3.65 1.18 5.23l3.56-2.77z" fill="#FBBC05" />
          <path d="M12 4.64c1.69 0 3.21.58 4.41 1.72l3.31-3.31C17.71 1.06 15.1 0 12 0 7.37 0 3.4 2.65 1.18 6.77l3.56 2.77c.88-2.65 3.35-4.62 6.26-4.62z" fill="#EA4335" />
        </svg>
        Continue with Google
      </button>

      <div className="border-t border-white/10 pt-4 text-center text-sm text-slate-500">
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
