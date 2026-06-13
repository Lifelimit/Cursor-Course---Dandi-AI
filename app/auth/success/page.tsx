"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AuthSuccessPage() {
  useEffect(() => {
    // Attempt to close the window automatically
    // Note: Most modern browsers block window.close() unless the window was opened by a script,
    // but we try anyway just in case it works for the user's specific browser/flow.
    const timer = setTimeout(() => {
      try {
        window.close();
      } catch {
        // Ignore errors if blocked
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

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

        {/* Success Message Card */}
        <div className="overflow-hidden rounded-[28px] border border-emerald-400/15 bg-slate-950/72 p-6 text-center shadow-2xl shadow-black/40 animate-in fade-in zoom-in duration-500 sm:p-8">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/10 border border-emerald-400/20 text-emerald-300">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-8 w-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          
          <h2 className="mb-4 font-serif text-2xl font-bold text-white">
            Sign-in complete
          </h2>
          
          <p className="mb-8 text-sm leading-relaxed text-slate-400">
            Your session is ready. If this window does not close automatically, you can continue to your dashboard.
          </p>

          <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/10 p-4">
            <p className="text-sm font-medium text-emerald-200">
              You can safely close this window.
            </p>
          </div>

          <div className="mt-8 border-t border-white/10 pt-8">
            <Link
              href="/dashboards" 
              className="inline-flex w-full items-center justify-center rounded-2xl bg-emerald-400 px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-slate-950 transition-all hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:w-auto"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
