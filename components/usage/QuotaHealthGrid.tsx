"use client";

import React from "react";
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
      if (res.ok) onUpdate();
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
                : 'border-zinc-200';

          const avgDaily = key.dailyTrend.length > 0 
            ? key.dailyTrend.reduce((acc, curr) => acc + curr.count, 0) / key.dailyTrend.length 
            : 0;
          const remaining = key.monthly_limit ? key.monthly_limit - key.usage_count : 0;
          const daysLeft = avgDaily > 0 ? Math.floor(remaining / avgDaily) : null;

          return (
            <div 
              key={key.id} 
              className={`flex flex-col rounded-[32px] border bg-white p-8 transition-all shadow-sm ${alertStyles}`}
            >
              <div className="flex items-start justify-between mb-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-lg font-bold">{key.name}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${
                      key.key_type === 'production' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500'
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
                      onClick={() => handleToggleStatus(key.id, true)}
                      className="group/kill rounded-full p-2 text-zinc-300 hover:bg-rose-50 hover:text-rose-500 transition-all"
                      title="Deactivate Key"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
                        <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  )}
                  <div className="relative h-12 w-12 shrink-0">
                    <svg className="h-full w-full" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="16" fill="none" className="stroke-zinc-50" strokeWidth="3" />
                      <circle
                        cx="18" cy="18" r="16" fill="none"
                        stroke={color} strokeWidth="3"
                        strokeDasharray={`${Math.min(key.pct, 100)}, 100`}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                        transform="rotate(-90 18 18)"
                      />
                      <text x="18" y="20" textAnchor="middle" className="font-serif text-[8px] font-bold fill-zinc-900">
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
                        Est. {daysLeft} Days Runway
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
                      onClick={() => handleToggleStatus(key.id, true)}
                      className="flex items-center justify-center rounded-xl border border-red-200 bg-white px-3 py-2 text-[8px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50"
                    >
                      Move to Dead
                    </button>
                  </div>
                  <button 
                    onClick={async () => {
                      if (confirm(`Are you sure you want to PERMANENTLY delete "${key.name}"? This cannot be undone.`)) {
                        await fetch(`/api/keys/${key.id}`, { method: 'DELETE' });
                        onUpdate();
                      }
                    }}
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
        <div className="space-y-8 pt-8 border-t border-zinc-100">
          <div className="flex items-center justify-between px-4">
            <h2 className="font-serif text-xl font-bold italic text-zinc-400">Dead Keys Archive</h2>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              {deadKeys.length} Archived
            </span>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {deadKeys.map((key) => (
              <div key={key.id} className="group relative rounded-[32px] border border-zinc-100 bg-zinc-50/50 p-8 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-1">
                    <h3 className="font-serif text-lg font-bold text-zinc-400 group-hover:text-zinc-900">{key.name}</h3>
                    <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">Service Deactivated</p>
                  </div>
                  <div className="h-1.5 w-1.5 rounded-full bg-zinc-300 group-hover:bg-zinc-400" />
                </div>
                
                <div className="mb-6 flex items-baseline justify-between opacity-40">
                   <span className="text-xl font-serif font-bold italic">{key.usage_count.toLocaleString()}</span>
                   <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">/ {key.monthly_limit?.toLocaleString()} Credits</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => handleToggleStatus(key.id, false)}
                    className="flex items-center justify-center rounded-xl bg-zinc-900 px-3 py-3 text-[8px] font-black uppercase tracking-widest text-white shadow-xl hover:scale-[1.02] transition-all"
                  >
                    Re-enable Key
                  </button>
                  <button 
                    onClick={async () => {
                      if (confirm(`Are you sure you want to PERMANENTLY delete "${key.name}"? This cannot be undone.`)) {
                        await fetch(`/api/keys/${key.id}`, { method: 'DELETE' });
                        onUpdate();
                      }
                    }}
                    className="flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 py-3 text-[8px] font-black uppercase tracking-widest text-zinc-400 hover:text-red-600 transition-colors"
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
