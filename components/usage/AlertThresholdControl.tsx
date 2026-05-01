"use client";

import { useState, useRef } from "react";

type Props = {
  keyId: string;
  initialThreshold: number | null;
  limit: number | null;
  onUpdate: () => void;
};

export function AlertThresholdControl({ keyId, initialThreshold, limit, onUpdate }: Props) {
  const [threshold, setThreshold] = useState<number>(initialThreshold ?? 80);
  const [isSaving, setIsSaving] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveThreshold = async (val: number) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/usage/alert", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId, threshold: val })
      });
      if (res.ok) onUpdate();
    } catch (err) {
      console.error("Failed to save threshold", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setThreshold(val);
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      saveThreshold(val);
    }, 1000);
  };

  if (limit === null) return null;

  const triggerCount = Math.floor((threshold / 100) * limit);

  return (
    <div className="space-y-3 mt-4 pt-4 border-t border-zinc-100">
      <div className="flex items-center justify-between">
        <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">
          Usage Alert Threshold
        </label>
        <span className={`text-[9px] font-black tabular-nums ${threshold >= 90 ? 'text-red-500' : 'text-zinc-900'}`}>
          {threshold}% ({triggerCount.toLocaleString()} req)
        </span>
      </div>
      
      <div className="flex items-center gap-4">
        <input
          type="range"
          min="1"
          max="100"
          value={threshold}
          onChange={handleChange}
          className="h-1 flex-1 cursor-pointer appearance-none rounded-lg bg-zinc-100 accent-zinc-900 focus:outline-none"
        />
        {isSaving && (
          <div className="h-2 w-2 animate-spin rounded-full border border-zinc-200 border-t-zinc-900" />
        )}
      </div>
      
      <p className="text-[8px] text-zinc-400 italic">
        The dashboard will highlight this key when usage exceeds {threshold}%.
      </p>
    </div>
  );
}
