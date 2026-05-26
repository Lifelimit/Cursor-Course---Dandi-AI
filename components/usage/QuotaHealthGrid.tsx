"use client";

import React, { useState } from "react";
import Link from "next/link";
import { UsageSparkline } from "./UsageSparkline";
import { AlertThresholdControl } from "./AlertThresholdControl";

type KeyData = {
  id: string;
  name: string;
  key_type: string;
  usage_count: number;
  monthly_limit: number | null;
  is_active: boolean;
  alert_threshold: number | null;
  alert_channels: string[] | null;
  alert_phone: string | null;
  pct: number;
  dailyTrend: { date: string, count: number }[];
};

export function QuotaHealthGrid({ keys, onUpdate }: { keys: KeyData[], onUpdate: () => void }) {
  const [confirmingKillId, setConfirmingKillId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const activeKeys = keys.filter(k => k.is_active);
  const deadKeys = keys.filter(k => !k.is_active);

  // 1. Smart Sorting for Active Keys
  const sortedActive = [...activeKeys].sort((a, b) => {
    const getRank = (k: KeyData) => {
      if (k.pct >= 100) return 0;
      if (k.alert_threshold !== null && k.pct >= k.alert_threshold) return 1;
      if (k.pct >= 70) return 2;
      return 3;
    };
    return getRank(a) - getRank(b);
  });

  const handleToggleStatus = async (keyId: string, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/usage/alert", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId, isActive: !currentStatus })
      });
      if (res.ok) {
        setConfirmingKillId(null);
        onUpdate();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-16">
      {/* Active Keys Section */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sortedActive.map((key) => {
          const isExhausted = key.pct >= 100;
          const isCritical = key.pct >= 95;
          const isWarning = key.alert_threshold !== null && key.pct >= key.alert_threshold;
          const color = isExhausted ? "#ef4444" : isCritical ? "#ef4444" : isWarning ? "#fbbf24" : "#10b981";
          
          const alertStyles = isExhausted
            ? 'border-red-400 ring-4 ring-red-50 shadow-xl shadow-red-100/50 animate-pulse'
            : isCritical 
              ? 'border-red-200 ring-2 ring-red-50 shadow-red-100/20' 
              : isWarning 
                ? 'border-amber-200 ring-2 ring-amber-50 shadow-amber-100/20' 
                : 'border-zinc-200 dark:border-zinc-800';

          const avgDaily = key.dailyTrend.length > 0 
            ? key.dailyTrend.reduce((acc, curr) => acc + curr.count, 0) / key.dailyTrend.length 
            : 0;
          const remaining = key.monthly_limit ? key.monthly_limit - key.usage_count : 0;
          const daysLeft = avgDaily > 0 ? Math.floor(remaining / avgDaily) : null;

          return (
            <div 
              key={key.id} 
              className={`relative flex flex-col rounded-[32px] border bg-white dark:bg-zinc-900 p-8 transition-all shadow-sm ${alertStyles}`}
            >
              {confirmingDeleteId === key.id && (
                <div className="absolute inset-0 z-[20] flex flex-col items-center justify-center rounded-[32px] bg-zinc-900/95 p-8 text-white backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
                  <div className="mb-4 rounded-full bg-red-500/20 p-4 border border-red-500/50">
                    <svg viewBox="0 0 24 24" className="h-8 w-8 text-red-500" fill="none" stroke="currentColor">
                      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <h3 className="mb-2 font-serif text-xl font-bold italic tracking-tight">PERMANENT PURGE?</h3>
                  <p className="mb-8 text-center text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
                    This will erase <br/> 
                    <span className="text-white">&quot;{key.name}&quot;</span> <br/>
                    forever.
                  </p>
                  <div className="grid grid-cols-2 gap-3 w-full">
                    <button 
                      onClick={() => setConfirmingDeleteId(null)}
                      className="rounded-2xl bg-white/20 border border-white/40 px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-white/30 transition-all active:scale-95 backdrop-blur-md"
                    >
                      Abort
                    </button>
                    <button 
                      onClick={async () => {
                        await fetch(`/api/keys/${key.id}`, { method: 'DELETE' });
                        setConfirmingDeleteId(null);
                        onUpdate();
                      }}
                      className="rounded-2xl bg-red-600 px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-red-700 transition-all active:scale-95 shadow-xl shadow-red-900/40"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}
              {confirmingKillId === key.id && (
                <div className="absolute inset-0 z-[20] flex flex-col items-center justify-center rounded-[32px] bg-red-600/95 p-8 text-white backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
                  <div className="mb-4 rounded-full bg-white/20 p-4">
                    <svg viewBox="0 0 24 24" className="h-8 w-8 text-white" fill="none" stroke="currentColor">
                      <path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <h3 className="mb-2 font-serif text-2xl font-bold italic tracking-tight">INITIATE KILL?</h3>
                  <p className="mb-8 text-center text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
                    This will immediately deactivate <br/> 
                    <span className="text-white">&quot;{key.name}&quot;</span>
                  </p>
                  <div className="flex w-full gap-3">
                    <button 
                      onClick={() => setConfirmingKillId(null)}
                      className="flex-1 rounded-2xl bg-white/10 border border-white/30 px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-white/20 transition-all active:scale-95"
                    >
                      Abort
                    </button>
                    <button 
                      onClick={() => handleToggleStatus(key.id, true)}
                      className="flex-1 rounded-2xl bg-white px-4 py-4 text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-zinc-100 transition-all active:scale-95 shadow-xl"
                    >
                      Confirm Kill
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-start justify-between mb-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-lg font-bold text-zinc-900 dark:text-zinc-100">{key.name}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${
                      key.key_type === 'production' ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                    }`}>
                      {key.key_type === 'production' ? 'PROD' : 'DEV'}
                    </span>
                  </div>
                  {isExhausted ? (
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-ping" />
                      Service Interrupted
                    </p>
                  ) : (
                    <p className="text-[10px] font-medium text-zinc-400">Active Monitoring</p>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  {!isExhausted && (
                    <button 
                      onClick={() => setConfirmingKillId(key.id)}
                      className="group/kill rounded-full bg-rose-50 p-2.5 text-rose-400 hover:bg-rose-600 hover:text-white transition-all shadow-sm border border-rose-100 hover:border-rose-600 active:scale-95"
                      title="Kill API Key"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
                        <path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  )}
                  <div className="relative h-12 w-12 shrink-0">
                    <svg className="h-full w-full" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="16" fill="none" className="stroke-zinc-50 dark:stroke-zinc-800" strokeWidth="3" />
                      <circle
                        cx="18" cy="18" r="16" fill="none"
                        stroke={color} strokeWidth="3"
                        strokeDasharray={`${Math.min(key.pct, 100)}, 100`}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                        transform="rotate(-90 18 18)"
                      />
                      <text x="18" y="20" textAnchor="middle" className="font-serif text-[8px] font-bold fill-zinc-900 dark:fill-zinc-100">
                        {Math.round(key.pct)}%
                      </text>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <div className="flex flex-col">
                    <span className={`text-2xl font-serif font-bold italic ${isExhausted ? 'text-red-600' : ''}`}>
                      {key.usage_count.toLocaleString()}
                    </span>
                    {!isExhausted && daysLeft !== null && (
                      <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-tight">
                        Est. {daysLeft > 365 ? (daysLeft > 1825 ? "5+ Years" : `${Math.round(daysLeft / 365 * 10) / 10} Years`) : `${daysLeft} Days`} Runway
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">
                     / {key.monthly_limit ? key.monthly_limit.toLocaleString() : "∞"} <br/>Credits
                  </span>
                </div>
                
                <div className="space-y-2">
                  <UsageSparkline data={key.dailyTrend} color={color} />
                </div>
              </div>

              {isExhausted ? (
                <div className="mt-6 space-y-4 rounded-2xl bg-red-50/50 p-4 border border-red-100 animate-in fade-in zoom-in-95 duration-500">
                  <div className="grid grid-cols-2 gap-2">
                    <Link 
                      href="/billing"
                      className="flex items-center justify-center rounded-xl bg-red-600 px-3 py-2 text-[8px] font-black uppercase tracking-widest text-white hover:bg-red-700"
                    >
                      Increase Limit
                    </Link>
                    <button 
                      onClick={() => setConfirmingKillId(key.id)}
                      className="flex items-center justify-center rounded-xl border border-red-200 dark:border-red-950/50 bg-white dark:bg-zinc-900 px-3 py-2 text-[8px] font-black uppercase tracking-widest text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      Kill Switch
                    </button>
                  </div>
                  <button 
                    onClick={() => setConfirmingDeleteId(key.id)}
                    className="w-full text-center text-[8px] font-black uppercase tracking-widest text-zinc-400 hover:text-red-600 transition-colors pt-2"
                  >
                    Remove Permanently
                  </button>
                </div>
              ) : (
                <div className="mt-6">
                  <AlertThresholdControl 
                    keyId={key.id} 
                    initialThreshold={key.alert_threshold}
                    initialChannels={key.alert_channels || ['email', 'in-page']}
                    initialPhone={key.alert_phone || ''}
                    limit={key.monthly_limit}
                    onUpdate={onUpdate}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Dead Keys Section */}
      {deadKeys.length > 0 && (
        <div className="space-y-8 pt-8 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between px-4">
            <h2 className="font-serif text-xl font-bold italic text-zinc-400 dark:text-zinc-500">Dead Keys Archive</h2>
            <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-3 py-1 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
              {deadKeys.length} Archived
            </span>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {deadKeys.map((key) => (
              <div key={key.id} className="group relative rounded-[32px] border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/10 p-8 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all">
                {confirmingDeleteId === key.id && (
                  <div className="absolute inset-0 z-[20] flex flex-col items-center justify-center rounded-[32px] bg-zinc-900/95 p-8 text-white backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
                    <div className="mb-4 rounded-full bg-red-500/20 p-4 border border-red-500/50">
                      <svg viewBox="0 0 24 24" className="h-8 w-8 text-red-500" fill="none" stroke="currentColor">
                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <h3 className="mb-2 font-serif text-xl font-bold italic tracking-tight">PERMANENT PURGE?</h3>
                    <p className="mb-8 text-center text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
                      This will erase <br/> 
                      <span className="text-white">&quot;{key.name}&quot;</span> <br/>
                      forever.
                    </p>
                    <div className="grid grid-cols-2 gap-3 w-full">
                      <button 
                        onClick={() => setConfirmingDeleteId(null)}
                        className="rounded-2xl bg-white/20 border border-white/40 px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-white/30 transition-all active:scale-95 backdrop-blur-md"
                      >
                        Abort
                      </button>
                      <button 
                        onClick={async () => {
                          await fetch(`/api/keys/${key.id}`, { method: 'DELETE' });
                          setConfirmingDeleteId(null);
                          onUpdate();
                        }}
                        className="rounded-2xl bg-red-600 px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-red-700 transition-all active:scale-95 shadow-xl shadow-red-900/40"
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-1">
                    <h3 className="font-serif text-lg font-bold text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100">{key.name}</h3>
                    <p className="text-[10px] font-black text-zinc-300 dark:text-zinc-500 uppercase tracking-widest">Service Deactivated</p>
                  </div>
                  <div className="h-1.5 w-1.5 rounded-full bg-zinc-300 dark:bg-zinc-500 group-hover:bg-zinc-400 dark:group-hover:bg-zinc-300" />
                </div>
                
                <div className="mb-6 flex items-baseline justify-between opacity-40">
                   <span className="text-xl font-serif font-bold italic">{key.usage_count.toLocaleString()}</span>
                   <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">/ {key.monthly_limit?.toLocaleString()} Credits</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => handleToggleStatus(key.id, false)}
                    className="flex items-center justify-center rounded-xl bg-zinc-900 dark:bg-zinc-100 px-3 py-3 text-[8px] font-black uppercase tracking-widest text-white dark:text-zinc-900 shadow-xl hover:scale-[1.02] transition-all"
                  >
                    Re-enable Key
                  </button>
                  <button 
                    onClick={() => setConfirmingDeleteId(key.id)}
                    className="flex items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-3 text-[8px] font-black uppercase tracking-widest text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
