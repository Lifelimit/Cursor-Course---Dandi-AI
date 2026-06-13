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
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#05070b] p-6 selection:bg-emerald-500/20 selection:text-emerald-200">
      <div className="w-full max-w-sm space-y-12">
        {/* Branding */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-col items-center gap-4">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/35 bg-emerald-500/10 text-emerald-100 shadow-[0_0_30px_rgba(52,211,153,0.15)]">
              <span className="font-serif text-2xl font-bold italic drop-shadow-[0_0_12px_rgba(52,211,153,0.3)]">D</span>
            </div>
            <div className="text-center">
              <h1 className="font-serif text-3xl font-bold tracking-tight uppercase text-white">Dandi AI</h1>
            </div>
          </div>
        </div>

        {/* Success Message Card */}
        <div className="rounded-[32px] border border-emerald-500/10 bg-slate-950/40 p-10 shadow-2xl shadow-black/50 backdrop-blur-2xl text-center animate-in fade-in zoom-in duration-500">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-8 w-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          
          <h2 className="font-serif text-2xl font-bold text-white mb-4">
            Successfully Authenticated
          </h2>
          
          <p className="text-sm text-zinc-400 leading-relaxed mb-8">
            You have been securely logged in. Your original tab has been automatically redirected to the dashboard.
          </p>

          <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-4">
            <p className="text-sm font-medium text-emerald-300">
              You can safely close this window.
            </p>
          </div>

          <div className="mt-8 pt-8 border-t border-white/5">
            <Link 
              href="/dashboards" 
              className="text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
            >
              Or go to dashboard here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
