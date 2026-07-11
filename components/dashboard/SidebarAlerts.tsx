"use client";

import React from "react";

import { UsageSparkline } from "../usage/UsageSparkline";
import { ModalCloseButton } from "@/components/ui/ModalCloseButton";
import { Button } from "@/components/ui/PrimaryButton";
import { StatusPill } from "@/components/command";
import { useKeyLimitEditor } from "@/hooks/useKeyLimitEditor";
import { getPlanLimits } from "@/lib/constants";
import { formatRequestCount } from "@/lib/format";

type Alert = {
  id: string;
  keyName: string;
  pct: number;
  threshold: number;
  currentLimit: number;
  usageCount: number;
  dailyTrend: { date: string, count: number }[];
};

export function SidebarAlerts({ 
  alerts, 
  plan = "Hobby",
  onUpdate 
}: { 
  alerts: Alert[];
  plan?: string;
  onUpdate: () => void;
}) {
  const [peekingKey, setPeekingKey] = React.useState<string | null>(null);
  const [closingKeyId, setClosingKeyId] = React.useState<string | null>(null);
  const closeTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const clientLog = React.useCallback((msg: string, data: unknown) => {
    fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ msg, data }),
    }).catch(() => {});
  }, []);

  React.useEffect(() => {
    clientLog("SidebarAlerts mounted/unmount-setup", {});
    return () => {
      clientLog("SidebarAlerts unmounting - clearing timer", { hasTimer: !!closeTimerRef.current });
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, [clientLog]);

  const { maxLimitCap, isUnlimited } = getPlanLimits(plan);
  const limitEditor = useKeyLimitEditor({
    planMonthlyLimit: maxLimitCap,
    onUpdate,
    mode: "silent",
  });

  const closeFlyoutWithAnimation = React.useCallback((alertId: string) => {
    clientLog("closeFlyoutWithAnimation called", { alertId, currentOpenKey: limitEditor.openKeyId });
    if (closeTimerRef.current) {
      clientLog("clearing existing timer", {});
      clearTimeout(closeTimerRef.current);
    }
    setClosingKeyId(alertId);
    closeTimerRef.current = setTimeout(() => {
      clientLog("timeout fired", { alertId, currentOpenKey: limitEditor.openKeyId });
      if (limitEditor.openKeyId === alertId) {
        limitEditor.closeEditor({ resetValue: true, clearError: true });
      }
      setClosingKeyId(null);
      closeTimerRef.current = null;
    }, 500);
  }, [limitEditor, clientLog]);

  if (alerts.length === 0) return null;

  clientLog("SidebarAlerts render", { openKeyId: limitEditor.openKeyId, closingKeyId });

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center justify-between border-t border-[var(--dandi-border-subtle)] px-2 pt-4">
        <div>
          <h4 className="dandi-type-metadata font-black uppercase text-amber-200">Action Needed</h4>
          <p className="mt-0.5 text-[9px] font-medium text-[var(--dandi-text-meta)]">Usage alerts with a next step.</p>
        </div>
        <span className="dandi-type-metadata flex h-5 min-w-5 items-center justify-center rounded-full border border-amber-300/25 bg-amber-300/10 px-1 font-bold text-amber-200">
          {alerts.length}
        </span>
      </div>
      
      <div className="space-y-3">
        {alerts.map((alert) => {
          const isMaxed = alert.pct >= 100;
          const isCritical = alert.pct >= 95;
          const isWarning = alert.pct >= 80 && alert.pct < 95;
          const severityLabel = isMaxed ? "Critical" : isCritical ? "Critical" : isWarning ? "Warning" : "Notice";
          const severityTone = isMaxed || isCritical ? "danger" : isWarning ? "warning" : "info";
          const reasonText = isMaxed
            ? "This key has reached its monthly request limit."
            : `This key crossed its ${Math.round(alert.threshold)}% usage alert.`;
          const actionText = isMaxed ? "Increase the key limit or upgrade the plan." : "Increase the key limit before traffic is blocked.";
          const isPeeking = peekingKey === alert.id;
          const isFlying = limitEditor.openKeyId === alert.id;
          const limitState = limitEditor.getLimitState({
            keyId: alert.id,
            currentLimit: alert.currentLimit,
            usageCount: alert.usageCount,
          });
          const { minimumLimit, hasPlanHeadroom, isNotIncrease, isAbovePlanLimit, isSubmitDisabled } = limitState;
          const limitGuidance = hasPlanHeadroom
            ? `Allowed: ${formatRequestCount(minimumLimit + 1)} - ${formatRequestCount(maxLimitCap)} requests.`
            : isUnlimited
              ? "This key is already at the maximum allowed usage limit."
              : "This key is already at your plan maximum. Upgrade the account plan to raise it further.";
          
          const dotColor = isMaxed || isCritical ? 'bg-rose-300' : isWarning ? 'bg-amber-300' : 'bg-cyan-300';
          const cardClasses = isMaxed || isCritical
            ? "border-[var(--dandi-border-critical)] bg-rose-950/20 shadow-[var(--dandi-glow-critical)]"
            : isWarning
              ? "border-amber-300/25 bg-amber-950/15"
              : "border-cyan-300/15 bg-slate-950/45";

          return (
            <div key={alert.id} className="relative group">
              {/* Main Card */}
              <div 
                className={`relative z-10 block rounded-2xl border p-3 dandi-transition ${cardClasses}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${dotColor}`} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <span className="block truncate text-[10px] font-black uppercase tracking-tight text-white">
                        {alert.keyName}
                      </span>
                      <StatusPill tone={severityTone} compact>
                        {severityLabel}
                      </StatusPill>
                    </div>
                    <p className="mt-1 text-[9px] font-semibold leading-relaxed text-zinc-400">
                      {reasonText}
                    </p>
                    <p className="mt-2 font-mono text-[9px] font-bold tabular-nums text-zinc-300">
                      {Math.round(alert.pct)}% used
                    </p>
                    <p className="mt-1.5 text-[8px] font-medium leading-relaxed text-zinc-500">
                      {actionText}
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        if (isFlying && closingKeyId !== alert.id) {
                          closeFlyoutWithAnimation(alert.id);
                        } else if (closingKeyId === alert.id) {
                          setClosingKeyId(null);
                          if (closeTimerRef.current) {
                            clearTimeout(closeTimerRef.current);
                            closeTimerRef.current = null;
                          }
                        } else {
                          limitEditor.toggleEditor(alert.id, { resetValue: true });
                        }
                      }}
                      className="w-full mt-3 justify-center border-emerald-400/20 bg-emerald-400/10 px-2 py-2 text-[8px] text-emerald-300 hover:border-emerald-300/40 hover:bg-emerald-400/15"
                      aria-controls={`quota-limit-form-${alert.id}`}
                      aria-expanded={isFlying && closingKeyId !== alert.id}
                      aria-label={`${isFlying && closingKeyId !== alert.id ? "Cancel request limit update" : "Increase monthly request limit"} for ${alert.keyName}`}
                    >
                      {isFlying && closingKeyId !== alert.id ? 'Cancel' : 'Increase Limit'}
                    </Button>
                  </div>
                  
                  <button 
                    type="button"
                    onClick={() => setPeekingKey(isPeeking ? null : alert.id)}
                    className={`rounded-full p-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 ${isPeeking ? 'bg-white text-slate-950 rotate-90' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                    aria-controls={`usage-trend-${alert.id}`}
                    aria-expanded={isPeeking}
                    aria-label={`${isPeeking ? "Hide" : "Show"} usage trend for ${alert.keyName}`}
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
                      <path d="M9 18l6-6-6-6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>

                {/* Vertical Stats Peek */}
                <div id={`usage-trend-${alert.id}`} className={`overflow-hidden transition-all duration-500 ease-in-out ${isPeeking ? 'mt-4 max-h-32 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="space-y-3 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Activity Trend</span>
                      <span className="text-[8px] font-bold text-slate-200">{formatRequestCount(alert.usageCount)} / {formatRequestCount(alert.currentLimit)}</span>
                    </div>
                    <UsageSparkline data={alert.dailyTrend} color={isMaxed ? "#ef4444" : isWarning ? "#fbbf24" : "#10b981"} />
                  </div>
                </div>

                {/* Mobile Inline Quota Increase Form */}
                <div id={`quota-limit-form-${alert.id}`} className={`md:hidden overflow-hidden transition-all duration-500 ease-in-out ${isFlying && closingKeyId !== alert.id ? 'mt-4 max-h-64 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                  <div className="space-y-3 pt-3 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-white uppercase tracking-widest">New Monthly Limit</span>
                    </div>
                    <div className="relative">
                      <input 
                        type="text" 
                        inputMode="numeric"
                        aria-label={`New monthly limit for ${alert.keyName}`}
                        value={limitEditor.value}
                        onChange={(e) => limitEditor.handleInputChange(e.target.value)}
                        disabled={!hasPlanHeadroom}
                        placeholder="500"
                        className="dandi-field px-4 py-4 font-serif text-2xl font-bold"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[8px] font-black text-zinc-400 uppercase">Credits</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="px-1 text-[8px] font-medium text-zinc-500 dark:text-zinc-400 italic">
                        Current: {formatRequestCount(alert.currentLimit)}
                      </p>
                      {isNotIncrease && limitEditor.value !== "" && (
                        <p className="px-1 text-[8px] font-bold text-red-500">
                          Must be strictly greater than current request limit/usage ({formatRequestCount(minimumLimit)} requests).
                        </p>
                      )}
                      {!isNotIncrease && isAbovePlanLimit && (
                        <p className="px-1 text-[8px] font-bold text-red-500">
                          Cannot exceed the maximum allowed request limit of {formatRequestCount(maxLimitCap)} requests.
                        </p>
                      )}
                      {!isNotIncrease && !isAbovePlanLimit && (
                        <p className="px-1 text-[8px] font-medium text-zinc-500 dark:text-zinc-400 italic">
                          {limitGuidance}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      onClick={() => limitEditor.submit({
                        keyId: alert.id,
                        currentLimit: alert.currentLimit,
                        usageCount: alert.usageCount,
                        pct: alert.pct,
                      })}
                      disabled={isSubmitDisabled}
                      className="relative w-full overflow-hidden py-4 text-[10px] tracking-[0.2em]"
                    >
                      <span className="relative z-10">{limitEditor.isUpdating ? 'Updating...' : 'Update Limit'}</span>
                      <div className="absolute inset-0 z-0 bg-gradient-to-r from-emerald-600 to-teal-600 opacity-0 transition-opacity group-hover:opacity-10" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Horizontal Flyout Increase Form - Desktop Only */}
              <div 
                style={{
                  transitionDuration: "500ms",
                  transitionTimingFunction: isFlying && closingKeyId !== alert.id
                    ? "cubic-bezier(0.175, 0.885, 0.32, 1.275)"
                    : "cubic-bezier(0.6, -0.28, 0.735, 0.045)",
                  transform: isFlying && closingKeyId !== alert.id
                    ? "translateX(12px) scale(1)"
                    : "translateX(-16px) scale(0)",
                  opacity: isFlying && closingKeyId !== alert.id ? 1 : 0,
                  pointerEvents: isFlying && closingKeyId !== alert.id ? "auto" : "none",
                }}
                className="hidden md:flex absolute left-full top-1/2 z-[110] -translate-y-1/2 items-center transition-all origin-left"
              >
                {/* iMessage-Style Tail Connector */}
                <div className="relative -mr-[1px] z-20 flex items-center h-full">
                  <svg width="12" height="24" viewBox="0 0 12 24" fill="none" className="drop-shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                    <path 
                      d="M12 0C12 0 12 6 8 10C4 14 0 14 0 14C0 14 4 14 8 18C12 22 12 24 12 24V0Z" 
                      fill="currentColor"
                      className="text-slate-950"
                    />
                    <path 
                      d="M12 0C12 0 12 6 8 10C4 14 0 14 0 14M0 14C0 14 4 14 8 18C12 22 12 24 12 24" 
                      stroke="currentColor" 
                      strokeWidth="1"
                      className="text-white/10"
                    />
                  </svg>
                </div>
                
                <div className="flex flex-col gap-5 rounded-[24px] border border-white/10 bg-slate-950 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.4)] min-w-[240px] relative z-10">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 leading-none">Resolve Alert</span>
                      <span className="mt-1 text-[8px] font-bold text-zinc-500 uppercase italic">Increase monthly key limit</span>
                    </div>
                    <ModalCloseButton
                      onClick={() => closeFlyoutWithAnimation(alert.id)}
                      className="relative z-10 h-9 w-9 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white border border-white/5 [&_svg]:h-4 [&_svg]:w-4"
                    />
                  </div>
 
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[9px] font-black text-white uppercase tracking-widest">New Monthly Limit</span>
                    </div>
                    <div className="relative">
                      <input 
                        type="text" 
                        inputMode="numeric"
                        value={limitEditor.value}
                        onChange={(e) => limitEditor.handleInputChange(e.target.value)}
                        disabled={!hasPlanHeadroom}
                        placeholder="500"
                        className="dandi-field px-4 py-4 font-serif text-2xl font-bold"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[8px] font-black text-zinc-400 uppercase">Credits</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="px-1 text-[8px] font-medium text-zinc-400 italic">
                        Current: {formatRequestCount(alert.currentLimit)}
                      </p>
                      {isNotIncrease && limitEditor.value !== "" && (
                        <p className="px-1 text-[8px] font-bold text-red-500">
                          Must be strictly greater than current request limit/usage ({formatRequestCount(minimumLimit)} requests).
                        </p>
                      )}
                      {!isNotIncrease && isAbovePlanLimit && (
                        <p className="px-1 text-[8px] font-bold text-red-500">
                          Cannot exceed the maximum allowed request limit of {formatRequestCount(maxLimitCap)} requests.
                        </p>
                      )}
                      {!isNotIncrease && !isAbovePlanLimit && (
                        <p className="px-1 text-[8px] font-medium text-zinc-400 italic">
                          {limitGuidance}
                        </p>
                      )}
                    </div>
                  </div>
 
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    onClick={() => limitEditor.submit({
                      keyId: alert.id,
                      currentLimit: alert.currentLimit,
                      usageCount: alert.usageCount,
                      pct: alert.pct,
                    })}
                    disabled={isSubmitDisabled}
                    className="relative w-full overflow-hidden py-4 text-[10px] tracking-[0.2em]"
                  >
                    <span className="relative z-10">{limitEditor.isUpdating ? 'Updating...' : 'Update Limit'}</span>
                    <div className="absolute inset-0 z-0 bg-gradient-to-r from-emerald-600 to-teal-600 opacity-0 transition-opacity group-hover:opacity-10" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
