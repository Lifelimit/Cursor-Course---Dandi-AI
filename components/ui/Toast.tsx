import { useEffect, useState } from "react";
import { ToastState } from "../../hooks/useToast";

export function Toast({ toast }: { toast: ToastState }) {
  const [visible, setVisible] = useState(false);
  const [activeToast, setActiveToast] = useState<ToastState>(null);

  useEffect(() => {
    if (toast) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveToast(toast);
      setVisible(true);
    } else {
      const timer = setTimeout(() => {
        setVisible(false);
        setActiveToast(null);
      }, 300); // Allow fade out/slide down animation to finish
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (!activeToast && !visible) return null;

  const isSuccess = activeToast?.type === "success";

  return (
    <>
      <div className="pointer-events-none fixed bottom-4 left-4 right-4 z-[9999] flex flex-col items-stretch sm:bottom-6 sm:left-auto sm:right-6 sm:items-end">
        <div
          role={isSuccess ? "status" : "alert"}
          aria-live={isSuccess ? "polite" : "assertive"}
          aria-atomic="true"
          className={`pointer-events-auto flex w-full min-w-0 items-center gap-3.5 rounded-2xl border px-4 py-4 shadow-[0_20px_40px_rgba(0,0,0,0.06)] backdrop-blur-xl transition-all duration-300 dark:shadow-[0_20px_40px_rgba(0,0,0,0.3)] sm:w-auto sm:max-w-sm sm:px-5 ${
            toast ? "animate-toast-in" : "animate-toast-out"
          } ${
            isSuccess
              ? "border-emerald-500/20 bg-white/90 dark:bg-zinc-900/90 text-zinc-900 dark:text-white shadow-emerald-100/10 dark:shadow-emerald-950/5"
              : "border-red-500/20 bg-white/90 dark:bg-zinc-900/90 text-zinc-900 dark:text-white shadow-red-100/10 dark:shadow-red-950/5"
          }`}
        >
          {/* Animated Status Icon */}
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-white/5 animate-icon-scale" aria-hidden="true">
            {isSuccess ? (
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 text-emerald-500 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" className="animate-stroke" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 text-red-500 dark:text-red-400 animate-pulse" fill="none" stroke="currentColor" strokeWidth="3">
                <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {isSuccess ? "Notification" : "Alert System"}
            </span>
            <span className="break-words text-xs font-semibold leading-snug text-zinc-800 dark:text-zinc-100">
              {activeToast?.message}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
