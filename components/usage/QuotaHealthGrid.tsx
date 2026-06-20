"use client";

import React, { useState } from "react";
import { UsageSparkline } from "./UsageSparkline";
import { AlertThresholdControl } from "./AlertThresholdControl";
import { hasCrossedAlertThreshold } from "@/lib/alerts";
import { CommandPanel, StatusPill } from "@/components/command";
import { GuidedError } from "@/components/ui/GuidedError";
import { getErrorGuidance } from "@/lib/error-guidance";
import { formatRequestCount } from "@/lib/format";
import { getApiKeyTypeTone } from "@/lib/status-tones";
import type { UsageKeySummary } from "@/types/usage";

export function QuotaHealthGrid({ 
  keys, 
  planMonthlyLimit,
  onUpdate 
}: { 
  keys: UsageKeySummary[];
  planMonthlyLimit: number | null;
  onUpdate: () => Promise<void>;
}) {
  const [confirmingKillId, setConfirmingKillId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [updatingKeyId, setUpdatingKeyId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<{ keyId: string; message: string } | null>(null);
  const [limitEditorKeyId, setLimitEditorKeyId] = useState<string | null>(null);
  const [newLimit, setNewLimit] = useState<string>("");
  const [updatingLimitKeyId, setUpdatingLimitKeyId] = useState<string | null>(null);
  const [limitError, setLimitError] = useState<{ keyId: string; message: string } | null>(null);

  React.useEffect(() => {
    if (limitEditorKeyId) {
      const timer = setTimeout(() => {
        const visibleInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[inputmode="numeric"]'));
        const activeInput = visibleInputs.find(input => input.offsetWidth > 0 || input.offsetHeight > 0);
        if (activeInput) {
          activeInput.focus();
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [limitEditorKeyId]);

  const activeKeys = keys.filter(k => k.is_active);
  const deadKeys = keys.filter(k => !k.is_active);

  // 1. Smart Sorting for Active Keys
  const sortedActive = [...activeKeys].sort((a, b) => {
    const getRank = (k: UsageKeySummary) => {
      if (k.pct >= 100) return 0;
      if (hasCrossedAlertThreshold(k)) return 1;
      if (k.pct >= 70) return 2;
      return 3;
    };
    return getRank(a) - getRank(b);
  });

  const handleToggleStatus = async (keyId: string, currentStatus: boolean) => {
    setUpdatingKeyId(keyId);
    setStatusError(null);
    try {
      const res = await fetch(`/api/keys/${keyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      const payload = await res.json();
      if (res.ok) {
        setConfirmingKillId(null);
        await onUpdate();
        return;
      }
      setStatusError({
        keyId,
        message: payload?.error || "Failed to update API key status.",
      });
    } catch (err) {
      console.error(err);
      setStatusError({
        keyId,
        message: "Network error while updating API key status.",
      });
    } finally {
      setUpdatingKeyId(null);
    }
  };

  const handleIncreaseLimit = async (key: UsageKeySummary) => {
    const parsedLimit = parseInt(newLimit.replace(/,/g, ""), 10);
    const currentLimit = key.monthly_limit ?? 0;
    const minimumLimit = Math.max(currentLimit, key.usage_count);

    if (isNaN(parsedLimit) || parsedLimit <= minimumLimit) {
      setLimitError({
        keyId: key.id,
        message: `Enter a request limit greater than ${formatRequestCount(minimumLimit)} requests.`,
      });
      return;
    }

    if (planMonthlyLimit !== null && parsedLimit > planMonthlyLimit) {
      setLimitError({
        keyId: key.id,
        message: `Request limit cannot exceed your plan maximum of ${formatRequestCount(planMonthlyLimit)} requests.`,
      });
      return;
    }

    setUpdatingLimitKeyId(key.id);
    setLimitError(null);
    try {
      const res = await fetch("/api/usage/alert", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId: key.id, monthlyLimit: parsedLimit })
      });
      const payload = await res.json();
      if (res.ok) {
        setLimitEditorKeyId(null);
        setNewLimit("");
        await onUpdate();
        return;
      }
      setLimitError({
        keyId: key.id,
        message: payload?.error || "Failed to update monthly limit.",
      });
    } catch (err) {
      console.error(err);
      setLimitError({
        keyId: key.id,
        message: "Network error while updating monthly limit.",
      });
    } finally {
      setUpdatingLimitKeyId(null);
    }
  };

  return (
    <div className="space-y-16">
      {/* Active Keys Section */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sortedActive.map((key) => {
          const isExhausted = key.pct >= 100;
          const isCritical = key.pct >= 95;
          const isWarning = hasCrossedAlertThreshold(key);
          const color = isExhausted ? "#ef4444" : isCritical ? "#ef4444" : isWarning ? "#fbbf24" : "#10b981";
          
          const alertStyles = isExhausted
            ? 'border-red-400/50 ring-2 ring-red-500/20 shadow-[0_18px_60px_rgba(239,68,68,0.12)]'
            : isCritical 
              ? 'border-red-400/30 ring-2 ring-red-500/10' 
              : isWarning 
                ? 'border-amber-300/30 ring-2 ring-amber-400/10' 
                : 'border-white/10';

          const avgDaily = key.dailyTrend.length > 0 
            ? key.dailyTrend.reduce((acc, curr) => acc + curr.count, 0) / key.dailyTrend.length 
            : 0;
          const remaining = key.monthly_limit ? key.monthly_limit - key.usage_count : 0;
          const daysLeft = avgDaily > 0 ? Math.floor(remaining / avgDaily) : null;
          const suggestedLimit = Math.max(
            key.usage_count + 1,
            key.monthly_limit ? Math.ceil(key.monthly_limit * 1.25) : key.usage_count + 100
          );
          const minimumLimit = Math.max(key.monthly_limit ?? 0, key.usage_count);
          const cappedSuggestedLimit = planMonthlyLimit === null
            ? suggestedLimit
            : Math.min(planMonthlyLimit, Math.max(minimumLimit + 1, suggestedLimit));
          const isLimitEditorOpen = limitEditorKeyId === key.id;
          const parsedNewLimit = parseInt(newLimit.replace(/,/g, ""), 10);
          const isAbovePlanLimit = planMonthlyLimit !== null && parsedNewLimit > planMonthlyLimit;
          const hasPlanHeadroom = planMonthlyLimit === null || minimumLimit < planMonthlyLimit;
          const isLimitSubmitDisabled = !hasPlanHeadroom || updatingLimitKeyId === key.id || isNaN(parsedNewLimit) || parsedNewLimit <= minimumLimit || isAbovePlanLimit;

          return (
          <CommandPanel 
            key={key.id} 
            padding="none"
            className={`relative flex flex-col overflow-hidden p-6 transition-all sm:p-8 ${alertStyles}`}
          >
            <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full bg-emerald-400/10 blur-3xl" />
            {confirmingDeleteId === key.id && (
              <div className="absolute inset-0 z-[20] flex flex-col items-center justify-center rounded-[32px] bg-zinc-900/95 p-6 sm:p-8 text-white backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
                  <div className="mb-4 rounded-full bg-red-500/20 p-4 border border-red-500/50">
                    <svg viewBox="0 0 24 24" className="h-8 w-8 text-red-500" fill="none" stroke="currentColor">
                      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <h3 className="mb-2 font-serif text-xl font-bold italic tracking-tight">PERMANENT PURGE?</h3>
                  <p className="mb-8 text-center text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
                    This will erase <br/> 
                    <span className="text-white">&quot;{key.name}&quot;</span> <br/>
                    forever.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                    <button 
                      onClick={() => setConfirmingDeleteId(null)}
                      className="rounded-2xl bg-white/20 border border-white/40 px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-white/30 transition-all active:scale-95 backdrop-blur-md"
                    >
                      Abort
                    </button>
                    <button 
                      onClick={async () => {
                        await fetch(`/api/keys/${key.id}`, { method: 'DELETE' });
                        setConfirmingDeleteId(null);
                        await onUpdate();
                      }}
                      className="rounded-2xl bg-red-600 px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-red-700 transition-all active:scale-95 shadow-xl shadow-red-900/40"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}
            {confirmingKillId === key.id && (
              <div className="absolute inset-0 z-[20] flex flex-col items-center justify-center rounded-[32px] bg-red-600/95 p-6 sm:p-8 text-white backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
                  <div className="mb-4 rounded-full bg-white/20 p-4">
                    <svg viewBox="0 0 24 24" className="h-8 w-8 text-white" fill="none" stroke="currentColor">
                      <path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <h3 className="mb-2 font-serif text-2xl font-bold italic tracking-tight">INITIATE KILL?</h3>
                  <p className="mb-8 text-center text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
                    This will immediately deactivate <br/> 
                    <span className="text-white">&quot;{key.name}&quot;</span>
                  </p>
                  <div className="flex flex-col sm:flex-row w-full gap-3">
                    <button 
                      onClick={() => setConfirmingKillId(null)}
                      className="flex-1 rounded-2xl bg-white/10 border border-white/30 px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-white/20 transition-all active:scale-95"
                    >
                      Abort
                    </button>
                    <button 
                      onClick={() => handleToggleStatus(key.id, true)}
                      disabled={updatingKeyId === key.id}
                      className="flex-1 rounded-2xl bg-white px-4 py-4 text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-zinc-100 transition-all active:scale-95 shadow-xl"
                    >
                      {updatingKeyId === key.id ? "Killing..." : "Confirm Kill"}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-start justify-between mb-6 gap-4">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-lg font-bold text-white truncate">{key.name}</h3>
                    <StatusPill tone={getApiKeyTypeTone(key.key_type)} compact>
                      {key.key_type === 'production' ? 'PROD' : 'DEV'}
                    </StatusPill>
                  </div>
                  {isExhausted ? (
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
                      Service Interrupted
                    </p>
                  ) : (
                    <p className="text-[10px] font-medium text-slate-400">Active Monitoring</p>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  {!isExhausted && (
                    <button 
                      onClick={() => setConfirmingKillId(key.id)}
                      className="group/kill rounded-full bg-rose-50 p-2.5 text-rose-400 hover:bg-rose-600 hover:text-white transition-all shadow-sm border border-rose-100 hover:border-rose-600 active:scale-95"
                      title="Kill API Key"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
                        <path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  )}
                  <div className={`relative h-12 w-12 shrink-0 ${isExhausted ? "animate-pulse" : ""}`}>
                    <svg className="h-full w-full" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="16" fill="none" className="stroke-white/10" strokeWidth="3" />
                      <circle
                        cx="18" cy="18" r="16" fill="none"
                        stroke={color} strokeWidth="3"
                        strokeDasharray={`${Math.min(key.pct, 100)}, 100`}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                        transform="rotate(-90 18 18)"
                      />
                      <text x="18" y="20" textAnchor="middle" className="font-serif text-[8px] font-bold fill-white">
                        {Math.round(key.pct)}%
                      </text>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="flex flex-col">
                    <span className={`text-2xl font-serif font-bold italic ${isExhausted ? 'text-red-400' : 'text-white'}`}>
                      {formatRequestCount(key.usage_count)}
                    </span>
                    {!isExhausted && daysLeft !== null && (
                      <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-tight">
                        Est. {daysLeft > 365 ? (daysLeft > 1825 ? "5+ Years" : `${Math.round(daysLeft / 365 * 10) / 10} Years`) : `${daysLeft} Days`} Runway
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">
                     / {key.monthly_limit ? formatRequestCount(key.monthly_limit) : "∞"} <br/>Credits
                  </span>
                </div>
                
                <div className="space-y-2">
                  <UsageSparkline data={key.dailyTrend} color={color} />
                </div>
              </div>

              {isExhausted ? (
                <div className="mt-6 space-y-4 rounded-3xl border border-red-500/30 bg-zinc-950/70 p-4 shadow-inner shadow-black/20 animate-in fade-in zoom-in-95 duration-500">
                  <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-400">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
                        <path d="M12 8v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-red-300">
                        Limit reached
                      </p>
                      <p className="mt-1 text-xs font-medium leading-relaxed text-zinc-300">
                        Requests for this key are paused until you raise the limit or disable the key.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => {
                        setLimitEditorKeyId(isLimitEditorOpen ? null : key.id);
                        setNewLimit("");
                        setLimitError(null);
                      }}
                      className="flex min-h-11 items-center justify-center rounded-2xl bg-red-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-red-950/30 transition hover:bg-red-500 active:scale-95"
                    >
                      {isLimitEditorOpen ? "Cancel Increase" : "Increase Limit"}
                    </button>
                    <button 
                      onClick={() => setConfirmingKillId(key.id)}
                      className="flex min-h-11 items-center justify-center rounded-2xl border border-red-500/30 bg-zinc-900 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-300 transition hover:border-red-400 hover:bg-red-950/40 active:scale-95"
                    >
                      Kill Switch
                    </button>
                  </div>

                  {isLimitEditorOpen && (
                    <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-300">
                            New monthly limit
                          </p>
                          <p className="mt-1 text-[10px] font-medium text-zinc-500">
                            Current {key.monthly_limit !== null && key.monthly_limit !== undefined ? formatRequestCount(key.monthly_limit) : "∞"} · Used {formatRequestCount(key.usage_count)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setNewLimit(String(cappedSuggestedLimit));
                            setLimitError(null);
                          }}
                          disabled={!hasPlanHeadroom}
                          className="shrink-0 rounded-full border border-zinc-700 px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-zinc-400 transition hover:border-red-500/40 hover:text-red-300"
                        >
                          Suggest
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={newLimit}
                          onChange={(event) => {
                            const digits = event.target.value.replace(/[^0-9]/g, "");
                            if (!digits) {
                              setNewLimit("");
                              setLimitError(null);
                              return;
                            }
                            const parsed = parseInt(digits, 10);
                            if (planMonthlyLimit !== null && parsed > planMonthlyLimit) {
                              setNewLimit(String(planMonthlyLimit));
                            } else {
                              setNewLimit(digits);
                            }
                            setLimitError(null);
                          }}
                          disabled={!hasPlanHeadroom}
                          placeholder={formatRequestCount(cappedSuggestedLimit)}
                          className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 pr-20 font-serif text-2xl font-bold text-zinc-100 outline-none transition focus:border-red-500/50"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[8px] font-black uppercase tracking-widest text-zinc-500">
                          Requests
                        </span>
                      </div>
                      {limitError?.keyId === key.id ? (
                        <GuidedError
                          {...getErrorGuidance({ workflow: "api-key", message: limitError.message })}
                          technicalDetails={limitError.message}
                          compact
                        />
                      ) : (
                        <p className="text-[10px] font-medium leading-relaxed text-zinc-500">
                          {hasPlanHeadroom
                            ? `Allowed range: ${formatRequestCount(minimumLimit + 1)} - ${planMonthlyLimit === null ? "unlimited" : formatRequestCount(planMonthlyLimit)} requests.`
                            : "This key is already at your plan maximum. Upgrade the account plan to raise it further."}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => handleIncreaseLimit(key)}
                        disabled={isLimitSubmitDisabled}
                        className="w-full rounded-2xl bg-zinc-100 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-950 transition hover:bg-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {updatingLimitKeyId === key.id ? "Updating..." : "Update Limit"}
                      </button>
                    </div>
                  )}

                  <button 
                    onClick={() => setConfirmingDeleteId(key.id)}
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-3 text-center text-[9px] font-black uppercase tracking-widest text-zinc-500 transition-colors hover:border-red-500/40 hover:text-red-300"
                  >
                    Remove Permanently
                  </button>
                </div>
              ) : (
                <div className="mt-6">
                  <AlertThresholdControl 
                    key={`${key.id}:${key.monthly_limit ?? "unlimited"}:${key.alert_threshold ?? "none"}:${(key.alert_channels || []).join("|")}:${key.alert_phone || ""}`}
                    keyId={key.id} 
                    initialThreshold={key.alert_threshold}
                    initialChannels={key.alert_channels || ['in-page']}
                    initialPhone={key.alert_phone || ''}
                    limit={key.monthly_limit ?? planMonthlyLimit}
                    onUpdate={onUpdate}
                  />
                </div>
              )}
          </CommandPanel>
          );
        })}
      </div>

      {/* Dead Keys Section */}
      {deadKeys.length > 0 && (
        <div className="space-y-8 pt-8 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex flex-wrap items-center justify-between px-4 gap-2">
            <h2 className="font-serif text-xl font-bold italic text-zinc-400 dark:text-zinc-500">Inactive API Keys</h2>
            <span className="shrink-0 whitespace-nowrap rounded-full bg-zinc-100 dark:bg-zinc-800 px-3 py-1 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
              {deadKeys.length} Archived
            </span>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {deadKeys.map((key) => {
              const limitDisplay = key.monthly_limit ? formatRequestCount(key.monthly_limit) : "∞";
              return (
                <CommandPanel 
                  key={key.id} 
                  padding="none"
                  className="group relative flex flex-col overflow-hidden p-6 sm:p-8 border-white/5 bg-slate-950/20 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 hover:border-amber-500/20 hover:bg-slate-950/40 transition-all duration-300"
                >
                  <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full bg-amber-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {confirmingDeleteId === key.id && (
                    <div className="absolute inset-0 z-[20] flex flex-col items-center justify-center rounded-[32px] bg-zinc-900/95 p-6 sm:p-8 text-white backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
                      <div className="mb-4 rounded-full bg-red-500/20 p-4 border border-red-500/50">
                        <svg viewBox="0 0 24 24" className="h-8 w-8 text-red-500" fill="none" stroke="currentColor">
                          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <h3 className="mb-2 font-serif text-xl font-bold italic tracking-tight">PERMANENT PURGE?</h3>
                      <p className="mb-8 text-center text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
                        This will erase <br/> 
                        <span className="text-white">&quot;{key.name}&quot;</span> <br/>
                        forever.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                        <button 
                          onClick={() => setConfirmingDeleteId(null)}
                          className="rounded-2xl bg-white/20 border border-white/40 px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-white/30 transition-all active:scale-95 backdrop-blur-md"
                        >
                          Abort
                        </button>
                        <button 
                          onClick={async () => {
                            await fetch(`/api/keys/${key.id}`, { method: 'DELETE' });
                            setConfirmingDeleteId(null);
                            await onUpdate();
                          }}
                          className="rounded-2xl bg-red-600 px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-red-700 transition-all active:scale-95 shadow-xl shadow-red-900/40"
                        >
                          Confirm
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-6 gap-4">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif text-lg font-bold text-zinc-400 group-hover:text-white truncate transition-colors">{key.name}</h3>
                        <StatusPill tone={getApiKeyTypeTone(key.key_type)} compact>
                          {key.key_type === 'production' ? 'PROD' : 'DEV'}
                        </StatusPill>
                      </div>
                      <p className="text-[10px] font-black text-amber-500/60 uppercase tracking-widest flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500/40" />
                        Deactivated
                      </p>
                    </div>
                    <div className="h-2 w-2 rounded-full bg-amber-500/20" />
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 opacity-50">
                      <span className="text-2xl font-serif font-bold italic text-slate-300">
                        {formatRequestCount(key.usage_count)}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">
                         / {limitDisplay} <br/>Credits
                      </span>
                    </div>
                    {/* Visual grayed out progress bar */}
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-500/20 w-0" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-auto">
                    <button 
                      onClick={() => handleToggleStatus(key.id, false)}
                      disabled={updatingKeyId === key.id}
                      className="flex min-h-11 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-2 py-3 text-[9px] font-black uppercase tracking-widest text-emerald-300 hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:text-emerald-200 transition-all active:scale-[0.97] disabled:opacity-60 disabled:cursor-wait cursor-pointer"
                    >
                      <span className="truncate">{updatingKeyId === key.id ? "Enabling..." : "Re-enable"}</span>
                    </button>
                    <button 
                      onClick={() => setConfirmingDeleteId(key.id)}
                      className="flex min-h-11 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/5 px-2 py-3 text-[9px] font-black uppercase tracking-widest text-rose-300 hover:bg-rose-500/10 hover:border-rose-500/40 hover:text-rose-200 transition-all active:scale-[0.97] cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                {statusError?.keyId === key.id && (
                  <GuidedError
                    {...getErrorGuidance({ workflow: "api-key", message: statusError.message })}
                    technicalDetails={statusError.message}
                    compact
                    className="mt-3"
                  />
                )}
                </CommandPanel>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
