"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { getURL } from "@/lib/utils/url-helper";

interface AuthFormProps {
  defaultMode: "login" | "signup";
}

export function AuthForm({ defaultMode }: AuthFormProps) {
  const [isSignUp, setIsSignUp] = useState(defaultMode === "signup");
  const [usePassword, setUsePassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isMagicLinkSent, setIsMagicLinkSent] = useState(false);

  const router = useRouter();
  const supabase = createClient();

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
              emailRedirectTo: `${getURL()}/auth/callback`,
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
            emailRedirectTo: `${getURL()}/auth/callback`,
          },
        });

        if (authError) throw authError;

        setIsMagicLinkSent(true);
        setSuccessMessage("Magic link sent! Please check your inbox.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  if (isMagicLinkSent) {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6 text-center animate-in fade-in zoom-in duration-300">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>
        <h3 className="font-serif text-lg font-bold text-emerald-900">Check your inbox</h3>
        <p className="mt-2 text-sm text-emerald-700/80 leading-relaxed">
          We&apos;ve sent a magic link to <span className="font-bold">{email}</span>.
        </p>
        <button 
          onClick={() => setIsMagicLinkSent(false)}
          className="mt-6 text-xs font-bold uppercase tracking-widest text-emerald-600 hover:text-emerald-700 transition-colors"
        >
          Try a different email
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="space-y-2">
        <h2 className="font-serif text-2xl font-bold transition-all duration-300">
          {isSignUp ? "Create your account" : "Welcome back"}
        </h2>
        <p className="text-sm text-zinc-500 transition-all duration-300">
          {!usePassword 
            ? "Sign in securely with a one-time link sent directly to your inbox."
            : isSignUp 
              ? "Join Dandi AI to manage your secure API credentials."
              : "Access your dashboard and monitor orchestration nodes."}
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 animate-in slide-in-from-top-2 duration-300">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 animate-in slide-in-from-top-2 duration-300">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleAuth} className="space-y-4">
        {usePassword && isSignUp && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Full Name</label>
            <input 
              type="text" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required={usePassword && isSignUp}
              disabled={isLoading}
              className="w-full rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-sm font-medium outline-none focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5 transition-all disabled:opacity-50"
              placeholder="Jane Doe"
            />
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Email Address</label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            className="w-full rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-sm font-medium outline-none focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5 transition-all disabled:opacity-50"
            placeholder="name@company.com"
          />
        </div>

        {usePassword && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={usePassword}
              disabled={isLoading}
              className="w-full rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-sm font-medium outline-none focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5 transition-all disabled:opacity-50"
              placeholder="••••••••"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="relative group w-full overflow-hidden rounded-full bg-zinc-900 py-4 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-zinc-800 hover:shadow-xl active:scale-[0.98] disabled:opacity-50"
        >
          <span className={isLoading ? "opacity-0" : "opacity-100 transition-opacity"}>
            {!usePassword 
              ? "Continue with Magic Link" 
              : isSignUp ? "Sign Up" : "Sign In"}
          </span>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-500 border-t-white" />
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
            className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors"
          >
            {usePassword ? "Use magic link instead" : "Sign in with password instead"}
          </button>
        </div>
      </form>

      <div className="pt-4 text-center text-sm text-zinc-500 border-t border-zinc-100">
        {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
        <button 
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError(null);
            setSuccessMessage(null);
          }}
          className="font-bold text-zinc-900 hover:underline"
        >
          {isSignUp ? "Sign in" : "Sign up"}
        </button>
      </div>
    </div>
  );
}
