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
  const [threshold, setThreshold] = useState<number>(initialThreshold ?? 80);
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
    const val = parseInt(e.target.value);
    setThreshold(val);
    debounceSave({ threshold: val });
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

  const triggerCount = Math.floor((threshold / 100) * limit);

  return (
    <div className="space-y-6 mt-4 pt-4 border-t border-zinc-100">
      <div className="space-y-3">
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
            onChange={handleThresholdChange}
            className="h-1 flex-1 cursor-pointer appearance-none rounded-lg bg-zinc-100 accent-zinc-900 focus:outline-none"
          />
          {isSaving && (
            <div className="h-2 w-2 animate-spin rounded-full border border-zinc-200 border-t-zinc-900" />
          )}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Alert Me Via</p>
        <div className="grid grid-cols-3 gap-2">
          {['email', 'phone', 'in-page'].map((channel) => (
            <button
              key={channel}
              onClick={() => toggleChannel(channel)}
              className={`rounded-xl border px-3 py-2 text-[8px] font-black uppercase tracking-widest transition-all ${
                channels.includes(channel)
                  ? 'border-zinc-900 bg-[#18181b] text-white shadow-lg shadow-zinc-900/10'
                  : 'border-zinc-200 bg-white text-zinc-400 hover:border-zinc-300'
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
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-xs outline-none focus:border-zinc-900 transition-colors"
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
