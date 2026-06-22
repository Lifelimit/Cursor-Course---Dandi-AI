"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type AuthSuccessState = "checking" | "authenticated" | "unauthenticated";

export default function AuthSuccessPage() {
  const [authState, setAuthState] = useState<AuthSuccessState>("checking");

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    const verifySession = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!active) return;

      const hasVerifiedSession = Boolean(data.user && !error);
      setAuthState(hasVerifiedSession ? "authenticated" : "unauthenticated");

      if (hasVerifiedSession) {
        const timer = setTimeout(() => {
          try {
            window.close();
          } catch {
            // Browsers usually block this unless the window was script-opened.
          }
        }, 3000);

        return () => clearTimeout(timer);
      }
    };

    let cleanupTimer: (() => void) | undefined;
    void verifySession().then((cleanup) => {
      cleanupTimer = cleanup;
    });

    return () => {
      active = false;
      cleanupTimer?.();
    };
  }, []);

  const isAuthenticated = authState === "authenticated";
  const isChecking = authState === "checking";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center overflow-x-hidden bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.08),transparent_32rem),linear-gradient(180deg,#05070b_0%,#070b12_48%,#05070b_100%)] px-4 py-10 selection:bg-emerald-500/20 selection:text-emerald-200 sm:px-6">
      <div className="w-full max-w-md space-y-8">
        {/* Branding */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-col items-center gap-4">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/35 bg-emerald-400/10 text-emerald-100 shadow-[0_0_24px_rgba(52,211,153,0.12)]">
              <span className="font-serif text-2xl font-bold italic drop-shadow-[0_0_10px_rgba(52,211,153,0.25)]">D</span>
            </div>
            <div className="text-center">
              <h1 className="font-serif text-3xl font-bold tracking-tight text-white">Dandi AI</h1>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-emerald-400/15 bg-slate-950/72 p-6 text-center shadow-2xl shadow-black/40 animate-in fade-in zoom-in duration-500 sm:p-8">
          <div className={`mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border ${
            isAuthenticated
              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
              : "border-amber-400/20 bg-amber-400/10 text-amber-200"
          }`}>
            {isChecking ? (
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-current/25 border-t-current" aria-hidden="true" />
            ) : isAuthenticated ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-8 w-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.25} stroke="currentColor" className="h-8 w-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            )}
          </div>
          
          <h2 className="mb-4 font-serif text-2xl font-bold text-white">
            {isChecking ? "Checking your session" : isAuthenticated ? "Sign-in complete" : "Check your email or continue signing in"}
          </h2>
          
          <p className="mb-8 text-sm leading-relaxed text-slate-400">
            {isChecking
              ? "Dandi is confirming whether this browser has an active session."
              : isAuthenticated
                ? "Your session is ready. If this window does not close automatically, you can continue to your dashboard."
                : "We could not confirm an active session in this browser. If you used an email link, open the latest link from your inbox or continue signing in."}
          </p>

          <div className={`rounded-xl border p-4 ${
            isAuthenticated
              ? "border-emerald-400/15 bg-emerald-400/10"
              : "border-amber-400/15 bg-amber-400/10"
          }`}>
            <p className={`text-sm font-medium ${isAuthenticated ? "text-emerald-200" : "text-amber-100"}`}>
              {isChecking
                ? "One moment while we check your account."
                : isAuthenticated
                  ? "You can safely close this window."
                  : "No sign-in has been completed on this page yet."}
            </p>
          </div>

          <div className="mt-8 border-t border-white/10 pt-8">
            <Link
              href={isAuthenticated ? "/dashboards" : "/login"}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-emerald-400 px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-slate-950 transition-all hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:w-auto"
            >
              {isAuthenticated ? "Go to Dashboard" : "Continue Signing In"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
