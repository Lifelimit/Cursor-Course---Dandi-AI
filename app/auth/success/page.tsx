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
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f4f2ed] dark:bg-zinc-950 p-6 selection:bg-zinc-200 dark:selection:bg-zinc-800">
      <div className="w-full max-w-sm space-y-12">
        {/* Branding */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#18181b] dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-2xl shadow-zinc-900/20 dark:shadow-none">
              <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="text-center">
              <h1 className="font-serif text-3xl font-bold tracking-tight uppercase text-zinc-900 dark:text-zinc-100">Dandi AI</h1>
            </div>
          </div>
        </div>

        {/* Success Message Card */}
        <div className="rounded-[32px] border border-emerald-200 dark:border-emerald-900/30 bg-white dark:bg-zinc-900 p-10 shadow-2xl shadow-emerald-200/20 dark:shadow-none text-center animate-in fade-in zoom-in duration-500">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-8 w-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          
          <h2 className="font-serif text-2xl font-bold text-zinc-900 dark:text-white mb-4">
            Successfully Authenticated
          </h2>
          
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-8">
            You have been securely logged in. Your original tab has been automatically redirected to the dashboard.
          </p>

          <div className="rounded-xl border border-emerald-100 dark:border-emerald-950/30 bg-emerald-50 dark:bg-emerald-950/10 p-4">
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
              You can safely close this window.
            </p>
          </div>

          <div className="mt-8 pt-8 border-t border-zinc-100 dark:border-zinc-800">
            <Link 
              href="/dashboards" 
              className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              Or go to dashboard here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
