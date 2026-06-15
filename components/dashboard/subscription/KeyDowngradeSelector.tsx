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
        <div className="h-12 w-12 animate-spin rounded-full border-[6px] border-white/5 border-t-white" />
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Checking API Keys...</p>
      </div>
    );
  }

  const HOBBY_REQUEST_LIMIT = 1000;

  return (
    <div className="flex flex-1 flex-col gap-8 sm:gap-12">
      {/* Quota Header */}
      <div className="flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Key Allocation</p>
          <h4 className="text-xl font-bold tracking-tight text-white">Select 3 keys to retain</h4>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-1.5">
            {[...Array(HOBBY_KEY_LIMIT)].map((_, i) => (
              <div
                key={i}
                className={`h-2 w-6 rounded-full transition-all duration-500 ${i < selectedCount ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-slate-800'}`}
              />
            ))}
          </div>
          <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-slate-400">
            {slotsRemaining} Slots Remaining
          </p>
        </div>
      </div>

      {/* Key Grid/List */}
      <div className="space-y-3 max-h-[440px] overflow-y-auto pr-3 -mr-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pb-4">
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
              className={`group relative w-full rounded-2xl border p-4 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:p-6 ${
                isSelected
                  ? "border-emerald-500/50 bg-emerald-950/10 shadow-sm"
                  : isDisabled
                  ? "cursor-not-allowed border-white/5 bg-slate-950/10 opacity-30"
                  : "border-white/5 bg-slate-950/30 hover:border-white/10 hover:bg-slate-950/60 cursor-pointer"
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                {/* Left: Key Identity */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <p className="text-lg font-bold tracking-tight text-white truncate">{key.name}</p>
                    {isSelected && (
                      <span className="flex-shrink-0 rounded-full bg-emerald-950/40 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-emerald-400">Retaining</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`h-1.5 w-1.5 rounded-full ${key.type === 'production' ? 'bg-indigo-400' : 'bg-amber-400'}`} />
                    <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 truncate">
                      {key.key_value.slice(0, 8)}••••
                    </p>
                  </div>
                </div>

                {/* Right: Usage Ledger */}
                <div className="flex w-full flex-col gap-2 sm:w-40">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-slate-400">Usage</span>
                    <span className="text-[10px] font-bold text-white">{key.usage_count.toLocaleString()} <span className="text-slate-400 font-medium">/ {currentLimit.toLocaleString()}</span></span>
                  </div>

                  <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ${isSelected ? intensityColor : 'bg-slate-800'}`}
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
        <button
          type="button"
          className="px-6 py-4 rounded-[24px] bg-slate-950/50 border border-white/5 flex w-full items-center justify-between gap-4 text-left group cursor-pointer hover:bg-slate-950/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          onClick={() => setKeepCard(!keepCard)}
          aria-pressed={keepCard}
        >
          <div className="space-y-1">
            <p className="text-xs font-bold text-white">Retain payment method</p>
            <p className="text-[10px] text-slate-400">Reuse card details for future upgrades</p>
          </div>
          <div className={`h-6 w-12 rounded-full p-1 transition-all duration-300 ${keepCard ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-slate-800'}`}>
            <div className={`h-4 w-4 rounded-full bg-white transition-all duration-300 ${keepCard ? 'translate-x-6' : 'translate-x-0'}`} />
          </div>
        </button>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row pt-4 border-t border-white/5">
        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="flex-1 rounded-full border border-white/10 bg-slate-950/40 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition hover:border-white/20 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 cursor-pointer"
        >
          Go Back
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canConfirm}
          className="flex-1 rounded-full bg-slate-100 py-5 text-[10px] font-black uppercase tracking-widest text-slate-950 hover:bg-slate-200 transition shadow-xl disabled:opacity-30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          {isLoading ? "Scheduling..." : "Schedule Downgrade"}
        </button>
      </div>
    </div>
  );
}
