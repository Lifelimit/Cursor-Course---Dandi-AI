"use client";

import { useState, useRef } from "react";

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
        ? Math.round(Math.max(1, Math.round((initialThreshold / 100) * limit)) / limit * 100)
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

  return (
    <div className="space-y-6 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0">
          <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">
            Usage Alert Threshold
          </label>
          <span className={`text-[9px] font-black tabular-nums ${threshold >= 90 ? 'text-red-500' : 'text-zinc-900 dark:text-zinc-100'}`}>
            {threshold}% ({triggerCount.toLocaleString()} req)
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={isSmallLimit ? 1 : 5}
            max={isSmallLimit ? limit : 100}
            step={isSmallLimit ? 1 : 5}
            value={sliderValue}
            onChange={handleThresholdChange}
            className="h-1 flex-1 cursor-pointer appearance-none rounded-lg bg-zinc-100 dark:bg-zinc-800 accent-zinc-900 dark:accent-zinc-100 focus:outline-none"
          />
          {isSaving && (
            <div className="h-2 w-2 animate-spin rounded-full border border-zinc-200 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100" />
          )}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Alert Me Via</p>
        <div className="flex flex-wrap gap-2">
          {['email', 'phone', 'in-page'].map((channel) => (
            <button
              key={channel}
              onClick={() => toggleChannel(channel)}
              className={`flex-1 min-w-[70px] rounded-xl border px-2 py-2 sm:px-3 text-[8px] font-black uppercase tracking-widest transition-all ${
                channels.includes(channel)
                  ? 'border-zinc-900 dark:border-zinc-100 bg-[#18181b] dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-lg shadow-zinc-900/10'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              {channel}
            </button>
          ))}
        </div>
      </div>

      {channels.includes('phone') && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
          <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-400">Phone Number</p>
          <input
            type="tel"
            placeholder="+1 (555) 000-0000"
            value={phone}
            onChange={handlePhoneChange}
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 px-3 py-2 text-xs outline-none focus:border-zinc-900 dark:focus:border-zinc-100 text-zinc-900 dark:text-zinc-100 transition-colors"
          />
        </div>
      )}
      
      <p className="text-[8px] text-zinc-400 italic leading-relaxed">
        {channels.includes('in-page') && "• Persistent banners will appear in the playground when exceeded. "}
        {channels.includes('email') && "• Email notifications will be sent to your account. "}
        {channels.includes('phone') && "• SMS alerts will be triggered if available."}
      </p>
    </div>
  );
}
