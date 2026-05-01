"use client";

import React from "react";
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
  // 1. Smart Sorting: Critical (100%+) > Warning (Threshold Hit) > High Usage (>70%) > Normal
  const sortedKeys = [...keys].sort((a, b) => {
    const getRank = (k: KeyData) => {
      if (k.pct >= 100) return 0;
      if (k.alert_threshold !== null && k.pct >= k.alert_threshold) return 1;
      if (k.pct >= 70) return 2;
      return 3;
    };
    return getRank(a) - getRank(b);
  });

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {sortedKeys.map((key) => {
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

        // 2. Predict Runway
        const avgDaily = key.dailyTrend.length > 0 
          ? key.dailyTrend.reduce((acc, curr) => acc + curr.count, 0) / key.dailyTrend.length 
          : 0;
        const remaining = key.monthly_limit ? key.monthly_limit - key.usage_count : 0;
        const daysLeft = avgDaily > 0 ? Math.floor(remaining / avgDaily) : null;

        return (
          <div 
            key={key.id} 
            className={`flex flex-col rounded-[32px] border bg-white p-8 transition-all shadow-sm ${alertStyles} ${isExhausted ? 'opacity-95' : ''}`}
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
                  <p className="text-[10px] font-medium text-zinc-400">
                    {key.is_active ? 'Currently Active' : 'Soft Disabled'}
                  </p>
                )}
              </div>
              
              <div className="relative h-12 w-12 shrink-0">
                <svg className="h-full w-full" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" fill="none" className="stroke-zinc-50" strokeWidth="3" />
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    stroke={color}
                    strokeWidth="3"
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
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">30D Velocity</p>
                <UsageSparkline data={key.dailyTrend} color={color} />
              </div>
            </div>

            <AlertThresholdControl 
              keyId={key.id} 
              initialThreshold={key.alert_threshold}
              initialChannels={key.alert_channels || ['email', 'in-page']}
              initialPhone={key.alert_phone || ''}
              limit={key.monthly_limit}
              onUpdate={onUpdate}
            />
          </div>
        );
      })}
    </div>
  );
}
