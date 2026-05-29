"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { getURL } from "@/lib/utils/url-helper";

interface AuthFormProps {
  defaultMode: "login" | "signup";
}

export function AuthForm({ defaultMode }: AuthFormProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

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
      <div className="rounded-2xl border border-emerald-100 dark:border-emerald-950/30 bg-emerald-50/50 dark:bg-emerald-950/10 p-6 text-center animate-in fade-in zoom-in duration-300">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>
        <h3 className="font-serif text-lg font-bold text-emerald-900 dark:text-emerald-100">Check your inbox</h3>
        <p className="mt-2 text-sm text-emerald-700/80 dark:text-emerald-300/80 leading-relaxed">
          We&apos;ve sent a magic link to <span className="font-bold">{email}</span>.
        </p>
        <button 
          onClick={() => setIsMagicLinkSent(false)}
          className="mt-6 text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
        >
          Try a different email
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="space-y-2">
        <h2 className="font-serif text-2xl font-bold transition-all duration-300 text-zinc-900 dark:text-white">
          {isSignUp ? "Create your account" : "Welcome back"}
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 transition-all duration-300">
          {!usePassword 
            ? "Sign in securely with a one-time link sent directly to your inbox."
            : isSignUp 
              ? "Join Dandi AI to manage your secure API credentials."
              : "Access your dashboard and monitor orchestration nodes."}
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-950/30 bg-rose-50 dark:bg-rose-950/10 p-4 text-sm text-rose-700 dark:text-rose-400 animate-in slide-in-from-top-2 duration-300">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-950/30 bg-emerald-50 dark:bg-emerald-950/10 p-4 text-sm text-emerald-700 dark:text-emerald-400 animate-in slide-in-from-top-2 duration-300">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleAuth} className="space-y-4">
        {usePassword && isSignUp && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 ml-1">Full Name</label>
            <input 
              type="text" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required={usePassword && isSignUp}
              disabled={isLoading}
              className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-4 focus:ring-zinc-900/5 dark:focus:ring-zinc-100/5 transition-all disabled:opacity-50"
              placeholder="Jane Doe"
            />
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 ml-1">Email Address</label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-4 focus:ring-zinc-900/5 dark:focus:ring-zinc-100/5 transition-all disabled:opacity-50"
            placeholder="name@company.com"
          />
        </div>

        {usePassword && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 ml-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={usePassword}
              disabled={isLoading}
              className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-4 focus:ring-zinc-900/5 dark:focus:ring-zinc-100/5 transition-all disabled:opacity-50"
              placeholder="••••••••"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="relative group w-full overflow-hidden rounded-full bg-zinc-900 dark:bg-zinc-100 py-4 text-[10px] font-black uppercase tracking-widest text-white dark:text-zinc-950 transition-all hover:bg-zinc-800 dark:hover:bg-zinc-200 hover:shadow-xl active:scale-[0.98] disabled:opacity-50"
        >
          <span className={isLoading ? "opacity-0" : "opacity-100 transition-opacity"}>
            {!usePassword 
              ? "Continue with Magic Link" 
              : isSignUp ? "Sign Up" : "Sign In"}
          </span>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-500 dark:border-zinc-400 border-t-white dark:border-t-zinc-950" />
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
            className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            {usePassword ? "Use magic link instead" : "Sign in with password instead"}
          </button>
        </div>
      </form>

      <div className="relative flex items-center py-2">
        <div className="flex-grow border-t border-zinc-100 dark:border-zinc-800"></div>
        <span className="flex-shrink-0 px-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Or continue with social</span>
        <div className="flex-grow border-t border-zinc-100 dark:border-zinc-800"></div>
      </div>

      <button
        onClick={signInWithGoogle}
        disabled={isLoading}
        className="group flex w-full items-center justify-center gap-4 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-900 dark:text-zinc-100 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:shadow-lg active:scale-[0.98] disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c3.11 0 5.72-1.03 7.63-2.79l-3.57-2.77c-.99.66-2.23 1.06-3.79 1.06-2.91 0-5.38-1.97-6.26-4.62H2.18v2.87A11.992 11.992 0 0 0 12 23z" fill="#34A853" />
          <path d="M5.74 13.88c-.23-.66-.36-1.37-.36-2.12s.13-1.46.36-2.12V6.77H2.18C1.4 8.35 1 10.12 1 12s.4 3.65 1.18 5.23l3.56-2.77z" fill="#FBBC05" />
          <path d="M12 4.64c1.69 0 3.21.58 4.41 1.72l3.31-3.31C17.71 1.06 15.1 0 12 0 7.37 0 3.4 2.65 1.18 6.77l3.56 2.77c.88-2.65 3.35-4.62 6.26-4.62z" fill="#EA4335" />
        </svg>
        Continue with Google
      </button>

      <div className="pt-4 text-center text-sm text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800">
        {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
        <button 
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError(null);
            setSuccessMessage(null);
          }}
          className="font-bold text-zinc-900 dark:text-white hover:underline"
        >
          {isSignUp ? "Sign in" : "Sign up"}
        </button>
      </div>
    </div>
  );
}
