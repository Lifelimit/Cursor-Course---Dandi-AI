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
  const [newLimit, setNewLimit] = React.useState<number>(0);
  const [isUpdating, setIsUpdating] = React.useState(false);

  if (alerts.length === 0) return null;

  const handleIncrease = async (alert: Alert) => {
    setIsUpdating(true);
    try {
      const res = await fetch("/api/usage/alert", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId: alert.id, monthlyLimit: newLimit })
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
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-900 text-[8px] font-bold text-white animate-in zoom-in duration-500">
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
                className={`relative z-10 block rounded-2xl border bg-white p-3 transition-all duration-500 ${
                  isMaxed ? 'border-red-200 shadow-lg shadow-red-50' : 'border-zinc-100'
                } ${isFlying ? 'translate-x-[-20px] opacity-40 grayscale' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotColor}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="block truncate text-[10px] font-black uppercase tracking-tight text-zinc-900">
                        {alert.keyName}
                      </span>
                      {isMaxed && <span className="text-[8px] font-black text-red-600 uppercase">[CRITICAL]</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-[9px] font-bold text-zinc-400">{Math.round(alert.pct)}%</p>
                      <button 
                        onClick={() => {
                          setNewLimit(alert.currentLimit + 1000);
                          setFlyoutKey(isFlying ? null : alert.id);
                        }}
                        className="text-[8px] font-black uppercase tracking-widest text-emerald-600 hover:underline transition-all active:scale-95"
                      >
                        + Increase
                      </button>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setPeekingKey(isPeeking ? null : alert.id)}
                    className={`rounded-full p-1 transition-all ${isPeeking ? 'bg-zinc-900 text-white rotate-90' : 'text-zinc-300 hover:bg-zinc-50 hover:text-zinc-900'}`}
                  >
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
                      <path d="M9 18l6-6-6-6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>

                {/* Vertical Stats Peek */}
                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isPeeking ? 'mt-4 max-h-32 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="space-y-3 pt-2 border-t border-zinc-50">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Activity Trend</span>
                      <span className="text-[8px] font-bold text-zinc-900">{alert.currentLimit.toLocaleString()} Limit</span>
                    </div>
                    <UsageSparkline data={alert.dailyTrend} color={isMaxed ? "#ef4444" : isWarning ? "#fbbf24" : "#10b981"} />
                  </div>
                </div>
              </div>

              {/* Horizontal Flyout Increase Form - Seamless Extension */}
              <div 
                className={`absolute left-full top-1/2 z-[110] -translate-y-1/2 flex items-center transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                  isFlying ? 'translate-x-3 opacity-100' : '-translate-x-4 opacity-0 pointer-events-none'
                }`}
              >
                {/* Connector Bridge */}
                <div className="h-6 w-3 bg-white border-y border-zinc-200 -mr-[1px] relative z-20" />
                
                <div className="flex flex-col gap-5 rounded-[24px] border border-zinc-200 bg-white p-6 shadow-[0_20px_50px_rgba(0,0,0,0.15)] min-w-[240px] relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 leading-none">Management</span>
                      <span className="mt-1 text-[8px] font-bold text-zinc-300 uppercase italic">Quota Increase</span>
                    </div>
                    <button 
                      onClick={() => setFlyoutKey(null)}
                      className="rounded-full bg-zinc-50 p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-white transition-all"
                    >
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
                        <path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[9px] font-black text-zinc-900 uppercase tracking-widest">New Monthly Limit</span>
                    </div>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={newLimit}
                        onChange={(e) => setNewLimit(Number(e.target.value))}
                        className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 font-serif text-2xl font-bold text-zinc-900 focus:border-zinc-900 focus:bg-white focus:outline-none transition-all"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[8px] font-black text-zinc-300 uppercase">Credits</span>
                    </div>
                    <p className="px-1 text-[8px] font-medium text-zinc-400 italic">
                      Current: {alert.currentLimit.toLocaleString()}
                    </p>
                  </div>

                  <button 
                    onClick={() => handleIncrease(alert)}
                    disabled={isUpdating}
                    className="group relative w-full overflow-hidden rounded-2xl bg-[#18181b] py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
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
