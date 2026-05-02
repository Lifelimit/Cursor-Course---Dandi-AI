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

              {/* Horizontal Flyout Increase Form */}
              <div 
                className={`absolute inset-y-0 right-0 z-[110] flex items-center transition-all duration-500 ease-out ${
                  isFlying ? 'translate-x-[calc(100%+12px)] opacity-100' : 'translate-x-0 opacity-0 pointer-events-none'
                }`}
              >
                <div className="flex flex-col gap-4 rounded-[24px] border border-zinc-200 bg-white p-5 shadow-2xl min-w-[200px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Update Quota</span>
                    <button 
                      onClick={() => setFlyoutKey(null)}
                      className="rounded-full p-1 text-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 transition-all"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
                        <path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-bold text-zinc-500 uppercase">New Limit</span>
                      <span className="text-[8px] font-black text-zinc-300 uppercase">Credits</span>
                    </div>
                    <input 
                      type="number" 
                      value={newLimit}
                      onChange={(e) => setNewLimit(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-100 bg-zinc-50/50 px-3 py-2.5 font-serif text-lg font-bold text-zinc-900 focus:border-zinc-900 focus:bg-white focus:outline-none transition-all"
                    />
                  </div>

                  <button 
                    onClick={() => handleIncrease(alert)}
                    disabled={isUpdating}
                    className="w-full rounded-xl bg-[#18181b] py-3 text-[9px] font-black uppercase tracking-widest text-white shadow-xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                  >
                    {isUpdating ? 'Updating...' : 'Save New Quota'}
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
