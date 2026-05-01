"use client";

import React, { useState } from "react";
import Link from "next/link";

type Alert = {
  keyName: string;
  pct: number;
  threshold: number;
};

export function SystemAlertBanner({ alerts }: { alerts: Alert[] }) {
  const [dismissedAlerts, setDismissedAlerts] = useState<number[]>([]);

  const visibleAlerts = alerts.filter((_, i) => !dismissedAlerts.includes(i));
  if (visibleAlerts.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex flex-col gap-0.5">
      {alerts.map((alert, i) => {
        if (dismissedAlerts.includes(i)) return null;

        const isCritical = alert.pct >= 95;
        const isWarning = alert.pct >= 80 && alert.pct < 95;
        const isInfo = alert.pct < 80;

        // Adaptive styling based on severity
        const styles = {
          critical: "bg-red-500/10 border-red-500/20 text-red-700",
          warning: "bg-amber-500/10 border-amber-500/20 text-amber-700",
          info: "bg-zinc-900/5 border-zinc-900/10 text-zinc-600",
        };

        const currentStyle = isCritical ? styles.critical : isWarning ? styles.warning : styles.info;
        const label = isCritical ? "Critical" : isWarning ? "Warning" : "Usage Update";

        return (
          <div 
            key={i}
            className={`group relative flex items-center justify-center gap-4 border-b px-4 py-2.5 transition-all animate-in slide-in-from-top duration-500 backdrop-blur-xl ${currentStyle}`}
          >
            <div className="flex items-center gap-2.5">
              <div className={`flex h-5 w-5 items-center justify-center rounded-full bg-white/50 shadow-sm`}>
                {isCritical ? (
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
                    <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              
              <p className="text-[10px] font-bold tracking-wide">
                <span className="uppercase opacity-60 mr-1.5">{label}:</span>
                <span className="font-black">[{alert.keyName}]</span> 
                {" has reached "}
                <span className="font-black tabular-nums">{Math.round(alert.pct)}%</span>
                {" of its limit."}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link 
                href="/billing" 
                className="rounded-full border border-current px-3 py-1 text-[8px] font-black uppercase tracking-widest transition-all hover:bg-current hover:text-white"
              >
                View Plans
              </Link>
              
              <button 
                onClick={() => setDismissedAlerts(prev => [...prev, i])}
                className="rounded-full p-1 opacity-40 transition-opacity hover:bg-black/5 hover:opacity-100"
              >
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
                  <path d="M6 18L18 6M6 6l12 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
