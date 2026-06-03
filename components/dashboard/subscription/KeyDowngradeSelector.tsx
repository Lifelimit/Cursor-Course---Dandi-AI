"use client";

import { useState, useEffect } from "react";
import { ApiKey, ApiKeyApiResponse, mapApiKey } from "@/types/api";

const HOBBY_KEY_LIMIT = 3;

type KeyDowngradeSelectorProps = {
  isLoading: boolean;
  hasCard: boolean;
  onConfirm: (keysToKeep: string[], keepCard: boolean) => void;
  onBack: () => void;
};

export function KeyDowngradeSelector({ isLoading, hasCard, onConfirm, onBack }: KeyDowngradeSelectorProps) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [keepCard, setKeepCard] = useState(true);

  useEffect(() => {
    const fetchKeys = async () => {
      setIsFetching(true);
      try {
        const res = await fetch("/api/keys");
        const data = (await res.json()) as ApiKeyApiResponse[];
        if (Array.isArray(data)) {
          const mapped = data.map(mapApiKey);
          setKeys(mapped);
          const preSelected = mapped.slice(0, HOBBY_KEY_LIMIT).map((k) => k.id);
          setSelectedIds(new Set(preSelected));
        }
      } finally {
        setIsFetching(false);
      }
    };
    fetchKeys();
  }, []);

  const toggleKey = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= HOBBY_KEY_LIMIT) return prev;
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const keysToKeep = keys.filter((k) => selectedIds.has(k.id)).map((k) => k.id);
    onConfirm(keysToKeep, keepCard);
  };

  const selectedCount = selectedIds.size;
  const slotsRemaining = HOBBY_KEY_LIMIT - selectedCount;
  const canConfirm = selectedCount > 0 && selectedCount <= HOBBY_KEY_LIMIT && !isLoading;

  if (isFetching) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 py-24">
        <div className="h-12 w-12 animate-spin rounded-full border-[6px] border-zinc-100 dark:border-zinc-800 border-t-zinc-900 dark:border-t-zinc-100" />
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-400 dark:text-zinc-500">Auditing Asset Quota...</p>
      </div>
    );
  }

  const HOBBY_REQUEST_LIMIT = 1000;

  return (
    <div className="flex flex-1 flex-col gap-12">
      {/* Quota Header */}
      <div className="flex items-center justify-between px-2">
        <div className="space-y-1">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">Quota Allocation</p>
          <h4 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Select 3 keys to retain</h4>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-1.5">
            {[...Array(HOBBY_KEY_LIMIT)].map((_, i) => (
              <div 
                key={i} 
                className={`h-2 w-6 rounded-full transition-all duration-500 ${i < selectedCount ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-zinc-100 dark:bg-zinc-800'}`} 
              />
            ))}
          </div>
          <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            {slotsRemaining} Slots Remaining
          </p>
        </div>
      </div>

      {/* Key Grid/List */}
      <div className="space-y-3 max-h-[440px] overflow-y-auto pr-3 -mr-3 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800 scrollbar-track-transparent pb-4">
        {keys.map((key) => {
          const isSelected = selectedIds.has(key.id);
          const isDisabled = !isSelected && selectedCount >= HOBBY_KEY_LIMIT;
          
          const currentLimit = key.monthly_limit || HOBBY_REQUEST_LIMIT;
          const usagePercent = Math.min((key.usage_count / currentLimit) * 100, 100);
          
          // Color Logic: Emerald (Safe), Amber (Warning), Rose-Red (Critical)
          const intensityColor = usagePercent > 90 
            ? 'bg-rose-500' 
            : usagePercent > 70 
              ? 'bg-amber-500' 
              : 'bg-emerald-500';

          return (
            <button
              key={key.id}
              type="button"
              onClick={() => toggleKey(key.id)}
              disabled={isDisabled}
              className={`group relative w-full rounded-2xl border p-6 text-left transition-all duration-300 ${
                isSelected
                  ? "border-zinc-900 dark:border-zinc-100 bg-zinc-50/50 dark:bg-zinc-900/60 shadow-sm"
                  : isDisabled
                  ? "cursor-not-allowed border-zinc-50 dark:border-zinc-900 bg-zinc-50/20 dark:bg-zinc-900/10 opacity-40"
                  : "border-zinc-100 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50/30 dark:hover:bg-zinc-800/40"
              }`}
            >
              <div className="flex items-center justify-between gap-6">
                {/* Left: Key Identity */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <p className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 truncate">{key.name}</p>
                    {isSelected && (
                      <span className="flex-shrink-0 rounded-full bg-emerald-100/50 dark:bg-emerald-950/40 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Retaining</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`h-1.5 w-1.5 rounded-full ${key.type === 'production' ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-200 dark:bg-zinc-800'}`} />
                    <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 truncate">
                      {key.key_value.slice(0, 8)}••••
                    </p>
                  </div>
                </div>

                {/* Right: Usage Ledger */}
                <div className="w-40 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Usage</span>
                    <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100">{key.usage_count.toLocaleString()} <span className="text-zinc-400 dark:text-zinc-500 font-medium">/ {currentLimit.toLocaleString()}</span></span>
                  </div>
                  
                  <div className="h-1 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${isSelected ? intensityColor : 'bg-zinc-200 dark:bg-zinc-700'}`} 
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Card Retention Toggle */}
      {hasCard && (
        <div className="px-6 py-4 rounded-[24px] bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between group cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors" onClick={() => setKeepCard(!keepCard)}>
          <div className="space-y-1">
            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Retain payment method</p>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Reuse card details for future upgrades</p>
          </div>
          <div className={`h-6 w-12 rounded-full p-1 transition-all duration-300 ${keepCard ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-zinc-200 dark:bg-zinc-800'}`}>
            <div className={`h-4 w-4 rounded-full bg-white dark:bg-zinc-900 shadow-md transition-all duration-300 ${keepCard ? 'translate-x-6' : 'translate-x-0'}`} />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="flex-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 transition hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Go Back
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canConfirm}
          className="flex-1 rounded-full bg-[#18181b] dark:bg-zinc-100 py-5 text-[10px] font-black uppercase tracking-widest text-white dark:text-zinc-950 transition hover:bg-black dark:hover:bg-zinc-200 shadow-xl shadow-zinc-900/10 dark:shadow-black/20 disabled:opacity-50"
        >
          {isLoading ? "Scheduling..." : "Schedule Downgrade"}
        </button>
      </div>
    </div>
  );
}
