"use client";

import { useState, useEffect } from "react";
import { ApiKey, ApiKeyApiResponse, mapApiKey } from "@/types/api";

const HOBBY_KEY_LIMIT = 3;

type KeyDowngradeSelectorProps = {
  isLoading: boolean;
  onConfirm: (idsToDelete: string[]) => void;
  onBack: () => void;
};

export function KeyDowngradeSelector({ isLoading, onConfirm, onBack }: KeyDowngradeSelectorProps) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchKeys = async () => {
      setIsFetching(true);
      try {
        const res = await fetch("/api/keys");
        const data = (await res.json()) as ApiKeyApiResponse[];
        if (Array.isArray(data)) {
          const mapped = data.map(mapApiKey);
          setKeys(mapped);
          // Pre-select the 3 most recently created keys to keep
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
        if (next.size >= HOBBY_KEY_LIMIT) return prev; // Enforce max
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const idsToDelete = keys.filter((k) => !selectedIds.has(k.id)).map((k) => k.id);
    onConfirm(idsToDelete);
  };

  const selectedCount = selectedIds.size;
  const canConfirm = selectedCount > 0 && selectedCount <= HOBBY_KEY_LIMIT && !isLoading;

  if (isFetching) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900" />
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Loading keys…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Instructions */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-medium text-amber-800">
          The <span className="font-bold">Hobby plan</span> allows a maximum of{" "}
          <span className="font-bold">{HOBBY_KEY_LIMIT} active API keys</span>. You currently have{" "}
          <span className="font-bold">{keys.length}</span>. Please select which{" "}
          <span className="font-bold">{HOBBY_KEY_LIMIT}</span> to keep — the rest will be permanently deleted.
        </p>
      </div>

      {/* Counter */}
      <div className="flex items-center justify-between px-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Keys to Keep</p>
        <span
          className={`text-xs font-bold tabular-nums transition-colors ${
            selectedCount > HOBBY_KEY_LIMIT
              ? "text-red-500"
              : selectedCount === HOBBY_KEY_LIMIT
              ? "text-emerald-500"
              : "text-zinc-400"
          }`}
        >
          {selectedCount} / {HOBBY_KEY_LIMIT} selected
        </span>
      </div>

      {/* Key List */}
      <div className="flex flex-col gap-3">
        {keys.map((key) => {
          const isSelected = selectedIds.has(key.id);
          const isDisabled = !isSelected && selectedCount >= HOBBY_KEY_LIMIT;

          return (
            <button
              key={key.id}
              type="button"
              onClick={() => toggleKey(key.id)}
              disabled={isDisabled}
              className={`group flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all ${
                isSelected
                  ? "border-zinc-900 bg-zinc-50 shadow-sm"
                  : isDisabled
                  ? "cursor-not-allowed border-zinc-100 bg-zinc-50 opacity-40"
                  : "border-zinc-200 bg-white hover:border-zinc-300"
              }`}
            >
              {/* Checkbox */}
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                  isSelected ? "border-zinc-900 bg-zinc-900" : "border-zinc-300 bg-white"
                }`}
              >
                {isSelected && (
                  <svg viewBox="0 0 24 24" className="h-3 w-3 text-white" fill="none" stroke="currentColor">
                    <path d="M20 6L9 17l-5-5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>

              {/* Key Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold text-zinc-900">{key.name}</p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                      key.type === "production"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {key.type}
                  </span>
                </div>
                <p className="mt-0.5 font-mono text-[10px] text-zinc-400">
                  {key.key_value.slice(0, 16)}••••
                </p>
              </div>

              {/* Usage */}
              <div className="shrink-0 text-right">
                <p className="text-xs font-bold text-zinc-900">{key.usage_count.toLocaleString()}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">requests</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="mt-auto flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="flex-1 rounded-full border border-zinc-200 py-3.5 text-xs font-bold uppercase tracking-widest text-zinc-400 transition-all hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-50"
        >
          Go Back
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canConfirm}
          className="flex-1 rounded-full bg-rose-600 py-3.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg transition-all hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Deleting…
            </span>
          ) : (
            `Keep ${selectedCount} & Downgrade`
          )}
        </button>
      </div>
    </div>
  );
}
