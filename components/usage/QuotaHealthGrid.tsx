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
  pct: number;
  dailyTrend: { date: string, count: number }[];
};

export function QuotaHealthGrid({ keys, onUpdate }: { keys: KeyData[], onUpdate: () => void }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {keys.map((key) => {
        const isAlerted = key.alert_threshold !== null && key.pct >= key.alert_threshold;
        const color = key.pct >= 90 ? "#ef4444" : key.pct >= 70 ? "#fbbf24" : "#10b981";

        return (
          <div 
            key={key.id} 
            className={`flex flex-col rounded-[32px] border bg-white p-8 transition-all shadow-sm ${
              isAlerted ? 'border-amber-200 ring-2 ring-amber-50 shadow-amber-100/20' : 'border-zinc-200'
            }`}
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
                <p className="text-[10px] font-medium text-zinc-400">
                  {key.is_active ? 'Currently Active' : 'Soft Disabled'}
                </p>
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
                    strokeDasharray={`${key.pct}, 100`}
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
                <span className="text-2xl font-serif font-bold italic">{key.usage_count.toLocaleString()}</span>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                   / {key.monthly_limit ? key.monthly_limit.toLocaleString() : "∞"} Credits
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
              limit={key.monthly_limit}
              onUpdate={onUpdate}
            />
          </div>
        );
      })}
    </div>
  );
}
