"use client";

import { useState, useRef } from "react";
import { getEffectiveAlertThresholdPct } from "@/lib/alerts";

type Props = {
  keyId: string;
  initialThreshold: number | null;
  initialChannels: string[];
  initialPhone: string;
  limit: number | null;
  onUpdate: () => void;
};

export function AlertThresholdControl({ 
  keyId, 
  initialThreshold, 
  initialChannels, 
  initialPhone,
  limit, 
  onUpdate 
}: Props) {
  const isSmallLimit = limit !== null && limit <= 20;

  const roundedInitialThreshold = initialThreshold !== null && initialThreshold !== undefined
    ? (isSmallLimit
        ? getEffectiveAlertThresholdPct(limit, initialThreshold) ?? initialThreshold
        : Math.round(initialThreshold / 5) * 5)
    : 80;

  const [threshold, setThreshold] = useState<number>(roundedInitialThreshold);
  const [channels, setChannels] = useState<string[]>(initialChannels);
  const [phone, setPhone] = useState<string>(initialPhone);
  const [isSaving, setIsSaving] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const savePreferences = async (updates: { threshold?: number, channels?: string[], phone?: string }) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/usage/alert", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          keyId, 
          threshold: updates.threshold ?? threshold,
          channels: updates.channels ?? channels,
          phone: updates.phone ?? phone
        })
      });
      if (res.ok) onUpdate();
    } catch (err) {
      console.error("Failed to save alert preferences", err);
    } finally {
      setIsSaving(false);
    }
  };

  const debounceSave = (updates: { threshold?: number, channels?: string[], phone?: string }) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      savePreferences(updates);
    }, 1000);
  };

  const handleThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (isSmallLimit && limit !== null) {
      const newPct = Math.round((val / limit) * 100);
      setThreshold(newPct);
      debounceSave({ threshold: newPct });
    } else {
      setThreshold(val);
      debounceSave({ threshold: val });
    }
  };

  const toggleChannel = (channel: string) => {
    const newChannels = channels.includes(channel)
      ? channels.filter(c => c !== channel)
      : [...channels, channel];
    setChannels(newChannels);
    savePreferences({ channels: newChannels }); // Save immediately for toggles
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPhone(val);
    debounceSave({ phone: val });
  };

  if (limit === null) return null;

  const sliderValue = isSmallLimit
    ? Math.max(1, Math.round((threshold / 100) * limit))
    : threshold;

  const triggerCount = isSmallLimit
    ? sliderValue
    : Math.floor((threshold / 100) * limit);
  const thresholdId = `alert-threshold-${keyId}`;
  const phoneId = `alert-phone-${keyId}`;

  return (
    <div className="space-y-6 mt-4 pt-4 border-t border-white/10">
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0">
          <label htmlFor={thresholdId} className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
            Usage Alert Threshold
          </label>
          <span className={`text-[9px] font-black tabular-nums ${threshold >= 90 ? 'text-red-400' : 'text-slate-100'}`}>
            {threshold}% ({triggerCount.toLocaleString()} req)
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <input
            id={thresholdId}
            type="range"
            min={isSmallLimit ? 1 : 5}
            max={isSmallLimit ? limit : 100}
            step={isSmallLimit ? 1 : 5}
            value={sliderValue}
            aria-valuetext={`${threshold}% threshold, ${triggerCount.toLocaleString()} requests`}
            onChange={handleThresholdChange}
            className="h-1 flex-1 cursor-pointer appearance-none rounded-lg bg-white/10 accent-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
          />
          {isSaving && (
            <div role="status" aria-live="polite" className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-widest text-emerald-300">
              <span className="h-2 w-2 animate-spin rounded-full border border-white/20 border-t-emerald-300" aria-hidden="true" />
              <span className="sr-only">Saving alert preferences</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Alert Me Via</p>
        <div className="flex flex-wrap gap-2">
          {['email', 'phone', 'in-page'].map((channel) => (
            <button
              key={channel}
              type="button"
              onClick={() => toggleChannel(channel)}
              aria-pressed={channels.includes(channel)}
              className={`flex-1 min-w-[70px] rounded-xl border px-2 py-2 sm:px-3 text-[8px] font-black uppercase tracking-widest transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 ${
                channels.includes(channel)
                  ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200 shadow-lg shadow-emerald-900/10'
                  : 'border-white/10 bg-slate-950/60 text-slate-500 hover:border-white/20 hover:text-slate-300'
              }`}
            >
              {channel}
            </button>
          ))}
        </div>
      </div>

      {channels.includes('phone') && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
          <label htmlFor={phoneId} className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Phone Number</label>
          <input
            id={phoneId}
            type="tel"
            placeholder="+1 (555) 000-0000"
            value={phone}
            onChange={handlePhoneChange}
            className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-slate-100 outline-none transition-colors focus:border-emerald-300/40 focus:ring-2 focus:ring-emerald-300/20"
          />
        </div>
      )}
      
      <p className="text-[8px] text-slate-500 italic leading-relaxed">
        {channels.includes('in-page') && "• Persistent banners will appear in the playground when exceeded. "}
        {channels.includes('email') && "• Email notifications will be sent to your account. "}
        {channels.includes('phone') && "• SMS alerts will be triggered if available."}
      </p>
    </div>
  );
}
