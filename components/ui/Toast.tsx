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
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes toast-slide-in {
          0% {
            transform: translateY(24px) scale(0.95);
            opacity: 0;
          }
          60% {
            transform: translateY(-4px) scale(1.02);
            opacity: 1;
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        @keyframes toast-slide-out {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(16px) scale(0.95);
            opacity: 0;
          }
        }
        @keyframes stroke-draw {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes scale-up {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-toast-in {
          animation: toast-slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-toast-out {
          animation: toast-slide-out 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-stroke {
          stroke-dasharray: 20;
          stroke-dashoffset: 20;
          animation: stroke-draw 0.35s cubic-bezier(0.4, 0, 0.2, 1) 0.15s forwards;
        }
        .animate-icon-scale {
          animation: scale-up 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}} />

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
