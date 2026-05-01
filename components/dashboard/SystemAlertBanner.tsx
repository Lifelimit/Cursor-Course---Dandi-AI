"use client";

import React from "react";
import Link from "next/link";

type Alert = {
  keyName: string;
  pct: number;
  threshold: number;
};

export function SystemAlertBanner({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] animate-in slide-in-from-top fill-mode-forwards">
      {alerts.map((alert, i) => {
        const isCritical = alert.pct >= 100;
        return (
          <div 
            key={i}
            className={`flex items-center justify-center gap-3 px-4 py-2 text-center shadow-lg backdrop-blur-md ${
              isCritical 
                ? 'bg-red-600/90 text-white' 
                : 'bg-amber-400/90 text-zinc-900'
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-[10px] font-black uppercase tracking-widest">
              {isCritical ? "Critical Alert" : "Quota Warning"}: 
              <span className="mx-1 opacity-80">[{alert.keyName}]</span> 
              has reached {Math.round(alert.pct)}% of its monthly limit.
            </p>
            <Link 
              href="/billing" 
              className={`rounded-full px-3 py-0.5 text-[8px] font-black uppercase tracking-widest transition-colors ${
                isCritical 
                  ? 'bg-white text-red-600 hover:bg-zinc-100' 
                  : 'bg-zinc-900 text-white hover:bg-zinc-800'
              }`}
            >
              Upgrade Now
            </Link>
          </div>
        );
      })}
    </div>
  );
}
