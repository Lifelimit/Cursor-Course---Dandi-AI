"use client";

import React from "react";

import { UsageSparkline } from "../usage/UsageSparkline";

type Alert = {
  id: string;
  keyName: string;
  pct: number;
  threshold: number;
  currentLimit: number;
  dailyTrend: { date: string, count: number }[];
};

export function SidebarAlerts({ alerts, onUpdate }: { alerts: Alert[], onUpdate: () => void }) {
  const [peekingKey, setPeekingKey] = React.useState<string | null>(null);
  const [flyoutKey, setFlyoutKey] = React.useState<string | null>(null);
  const [newLimit, setNewLimit] = React.useState<string>("");
  const [isUpdating, setIsUpdating] = React.useState(false);

  if (peekingKey === null && peekingKey !== undefined) {} // lint keep

  if (alerts.length === 0) return null;

  const handleIncrease = async (alert: Alert) => {
    const parsedLimit = parseInt(newLimit.replace(/,/g, ''), 10);
    if (isNaN(parsedLimit) || parsedLimit <= 0) return;
    if (alert.pct >= 100 && parsedLimit <= alert.currentLimit) return;
    setIsUpdating(true);
    try {
      const res = await fetch("/api/usage/alert", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId: alert.id, monthlyLimit: parsedLimit })
      });
      if (res.ok) {
        onUpdate();
        setFlyoutKey(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center justify-between px-2">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">System Alerts</h4>
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-900 dark:bg-zinc-100 text-[8px] font-bold text-white dark:text-zinc-900 animate-in zoom-in duration-500">
          {alerts.length}
        </span>
      </div>
      
      <div className="space-y-3">
        {alerts.map((alert) => {
          const isMaxed = alert.pct >= 100;
          const isCritical = alert.pct >= 95;
          const isWarning = alert.pct >= 80 && alert.pct < 95;
          const isPeeking = peekingKey === alert.id;
          const isFlying = flyoutKey === alert.id;
          
          const dotColor = isMaxed ? 'bg-red-600 animate-pulse' :
                          isCritical ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 
                          isWarning ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 
                          'bg-zinc-400';

          return (
            <div key={alert.id} className="relative group">
              {/* Main Card */}
              <div 
                className={`relative z-10 block rounded-2xl border bg-white dark:bg-zinc-900/60 p-3 transition-all duration-500 ${
                  isMaxed ? 'border-red-200 dark:border-red-900/50 shadow-lg shadow-red-50/50 dark:shadow-none' : 'border-zinc-100 dark:border-zinc-800'
                } ${isFlying ? 'translate-x-[-20px] opacity-40 grayscale' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotColor}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="block truncate text-[10px] font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100">
                        {alert.keyName}
                      </span>
                      {isMaxed && <span className="text-[8px] font-black text-red-600 dark:text-red-400 uppercase">[CRITICAL]</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-[9px] font-bold text-zinc-400">{Math.round(alert.pct)}%</p>
                      <button 
                        onClick={() => {
                          setNewLimit("");
                          setFlyoutKey(isFlying ? null : alert.id);
                        }}
                        className="text-[8px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 hover:underline transition-all active:scale-95"
                      >
                        + Increase
                      </button>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setPeekingKey(isPeeking ? null : alert.id)}
                    className={`rounded-full p-1 transition-all ${isPeeking ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rotate-90' : 'text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
                  >
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
                      <path d="M9 18l6-6-6-6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>

                {/* Vertical Stats Peek */}
                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isPeeking ? 'mt-4 max-h-32 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="space-y-3 pt-2 border-t border-zinc-50 dark:border-zinc-800">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Activity Trend</span>
                      <span className="text-[8px] font-bold text-zinc-900 dark:text-zinc-100">{alert.currentLimit.toLocaleString()} Limit</span>
                    </div>
                    <UsageSparkline data={alert.dailyTrend} color={isMaxed ? "#ef4444" : isWarning ? "#fbbf24" : "#10b981"} />
                  </div>
                </div>
              </div>

              {/* Horizontal Flyout Increase Form - Seamless Extension with Elastic Growth */}
              <div 
                className={`absolute left-full top-1/2 z-[110] -translate-y-1/2 flex items-center transition-all duration-500 origin-left ${
                  isFlying 
                    ? 'translate-x-3 opacity-100 scale-100 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]' 
                    : '-translate-x-4 opacity-0 scale-0 pointer-events-none ease-[cubic-bezier(0.6,-0.28,0.735,0.045)]'
                }`}
              >
                {/* iMessage-Style Tail Connector */}
                <div className="relative -mr-[1px] z-20 flex items-center h-full">
                  <svg width="12" height="24" viewBox="0 0 12 24" fill="none" className="drop-shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                    <path 
                      d="M12 0C12 0 12 6 8 10C4 14 0 14 0 14C0 14 4 14 8 18C12 22 12 24 12 24V0Z" 
                      fill="currentColor"
                      className="text-white dark:text-zinc-900"
                    />
                    <path 
                      d="M12 0C12 0 12 6 8 10C4 14 0 14 0 14M0 14C0 14 4 14 8 18C12 22 12 24 12 24" 
                      stroke="currentColor" 
                      strokeWidth="1"
                      className="text-zinc-200 dark:text-zinc-800"
                    />
                  </svg>
                </div>
                
                <div className="flex flex-col gap-5 rounded-[24px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-none min-w-[240px] relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 leading-none">Management</span>
                      <span className="mt-1 text-[8px] font-bold text-zinc-300 uppercase italic">Quota Increase</span>
                    </div>
                    <button 
                      onClick={() => setFlyoutKey(null)}
                      className="rounded-full bg-zinc-50 dark:bg-zinc-800 p-1.5 text-zinc-400 hover:bg-zinc-900 dark:hover:bg-zinc-100 hover:text-white dark:hover:text-zinc-900 transition-all"
                    >
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
                        <path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[9px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">New Monthly Limit</span>
                    </div>
                    <div className="relative">
                      <input 
                        type="text" 
                        inputMode="numeric"
                        value={newLimit}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setNewLimit(val);
                        }}
                        placeholder="500"
                        className="w-full rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 px-4 py-4 font-serif text-2xl font-bold text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 dark:focus:border-zinc-100 focus:bg-white dark:focus:bg-zinc-900 focus:outline-none transition-all"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[8px] font-black text-zinc-300 uppercase">Credits</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="px-1 text-[8px] font-medium text-zinc-400 italic">
                        Current: {alert.currentLimit.toLocaleString()}
                      </p>
                      {isMaxed && parseInt(newLimit.replace(/,/g, ''), 10) <= alert.currentLimit && (
                        <p className="px-1 text-[8px] font-bold text-red-500">
                          Must be greater than current limit when quota is reached.
                        </p>
                      )}
                    </div>
                  </div>

                  <button 
                    onClick={() => handleIncrease(alert)}
                    disabled={isUpdating || (isMaxed && parseInt(newLimit.replace(/,/g, ''), 10) <= alert.currentLimit)}
                    className="group relative w-full overflow-hidden rounded-2xl bg-[#18181b] dark:bg-zinc-100 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white dark:text-zinc-900 shadow-xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                  >
                    <span className="relative z-10">{isUpdating ? 'Synchronizing...' : 'Update Quota'}</span>
                    <div className="absolute inset-0 z-0 bg-gradient-to-r from-emerald-600 to-teal-600 opacity-0 transition-opacity group-hover:opacity-10" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
