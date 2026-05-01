"use client";

import React from "react";
import Link from "next/link";

import { IncreaseLimitModal } from "./IncreaseLimitModal";

type Alert = {
  id: string;
  keyName: string;
  pct: number;
  threshold: number;
  currentLimit: number;
};

export function SidebarAlerts({ alerts, onUpdate }: { alerts: Alert[], onUpdate: () => void }) {
  const [activeModal, setActiveModal] = React.useState<Alert | null>(null);

  if (alerts.length === 0) return null;

  return (
    <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="flex items-center justify-between px-2">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">System Alerts</h4>
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-900 text-[8px] font-bold text-white">
          {alerts.length}
        </span>
      </div>
      
      <div className="space-y-2">
        {alerts.map((alert, i) => {
          const isMaxed = alert.pct >= 100;
          const isCritical = alert.pct >= 95;
          const isWarning = alert.pct >= 80 && alert.pct < 95;
          
          return (
            <div 
              key={i}
              className={`group block rounded-2xl border bg-white p-3 transition-all hover:shadow-md ${
                isMaxed ? 'border-red-200' : 'border-zinc-100 hover:border-zinc-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  isMaxed ? 'bg-red-600 animate-pulse' :
                  isCritical ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 
                  isWarning ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 
                  'bg-zinc-400'
                }`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Link href="/billing" className="block truncate text-[10px] font-black uppercase tracking-tight text-zinc-900 hover:underline">
                      {alert.keyName}
                    </Link>
                    {isMaxed && (
                      <span className="text-[8px] font-black text-red-600 uppercase">
                        [CRITICAL]
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-[9px] font-bold text-zinc-400">
                      {Math.round(alert.pct)}%
                    </p>
                    {(isCritical || isWarning || isMaxed) && (
                      <button 
                        onClick={() => setActiveModal(alert)}
                        className="text-[8px] font-black uppercase tracking-widest text-emerald-600 hover:underline"
                      >
                        + Increase
                      </button>
                    )}
                  </div>
                </div>
                <Link href="/billing">
                  <svg viewBox="0 0 24 24" className="h-3 w-3 translate-x-1 text-zinc-300 transition-all group-hover:translate-x-2 group-hover:text-zinc-900" fill="none" stroke="currentColor">
                    <path d="M9 18l6-6-6-6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {activeModal && (
        <IncreaseLimitModal 
          keyId={activeModal.id}
          keyName={activeModal.keyName}
          currentLimit={activeModal.currentLimit}
          onClose={() => setActiveModal(null)}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
}
