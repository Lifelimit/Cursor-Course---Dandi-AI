"use client";

import React from "react";

import { UsageSparkline } from "../usage/UsageSparkline";
import { ModalCloseButton } from "@/components/ui/ModalCloseButton";
import { Button } from "@/components/ui/PrimaryButton";
import { StatusPill } from "@/components/command";
import { getPlanLimits } from "@/lib/constants";

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
  const [flyoutKey, setFlyoutKey] = React.useState<string | null>(null);
  const [newLimit, setNewLimit] = React.useState<string>("");
  const [isUpdating, setIsUpdating] = React.useState(false);

  const { maxLimitCap, isUnlimited } = getPlanLimits(plan);

  React.useEffect(() => {
    if (flyoutKey) {
      const timer = setTimeout(() => {
        const visibleInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[inputmode="numeric"]'));
        const activeInput = visibleInputs.find(input => input.offsetWidth > 0 || input.offsetHeight > 0);
        if (activeInput) {
          activeInput.focus();
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [flyoutKey]);

  if (alerts.length === 0) return null;

  const handleIncrease = async (alert: Alert) => {
    const parsedLimit = parseInt(newLimit.replace(/,/g, ''), 10);
    if (isNaN(parsedLimit) || parsedLimit <= 0) return;
    if (alert.pct >= 100 && parsedLimit <= alert.currentLimit) return;
    if (parsedLimit > maxLimitCap) return;
    setIsUpdating(true);
    try {
      const res = await fetch("/api/usage/alert", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId: alert.id, monthlyLimit: parsedLimit })
      });
      if (res.ok) {
        onUpdate();
        setFlyoutKey(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center justify-between px-2">
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Action Needed</h4>
          <p className="mt-0.5 text-[8px] font-medium text-zinc-500">Usage alerts with a next step.</p>
        </div>
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-1 text-[8px] font-bold text-white">
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
          const isFlying = flyoutKey === alert.id;
          const parsedNewLimit = parseInt(newLimit.replace(/,/g, ''), 10);
          const minimumLimit = Math.max(alert.currentLimit, alert.usageCount);
          const hasPlanHeadroom = minimumLimit < maxLimitCap;
          const isNotIncrease = parsedNewLimit <= minimumLimit;
          const isAbovePlanLimit = parsedNewLimit > maxLimitCap;
          const isSubmitDisabled = !hasPlanHeadroom || isUpdating || isNaN(parsedNewLimit) || parsedNewLimit <= 0 || isNotIncrease || isAbovePlanLimit;
          const handleNewLimitChange = (value: string) => {
            const digits = value.replace(/[^0-9]/g, '');
            if (!digits) {
              setNewLimit("");
              return;
            }
            const parsed = parseInt(digits, 10);
            if (parsed > maxLimitCap) {
              setNewLimit(String(maxLimitCap));
            } else {
              setNewLimit(digits);
            }
          };
          const limitGuidance = hasPlanHeadroom
            ? `Allowed: ${(minimumLimit + 1).toLocaleString()} - ${maxLimitCap.toLocaleString()} credits.`
            : isUnlimited
              ? "This key is already at the maximum allowed usage limit."
              : "This key is already at your plan maximum. Upgrade the account plan to raise it further.";
          
          const dotColor = isMaxed ? 'bg-red-600 command-pulse' :
                          isCritical ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' :
                          isWarning ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 
                          'bg-zinc-400';
          const cardClasses = isMaxed || isCritical
            ? "border-red-500/25 bg-red-950/10"
            : isWarning
              ? "border-amber-400/20 bg-amber-950/10"
              : "border-white/10 bg-slate-950/50";

          return (
            <div key={alert.id} className="relative group">
              {/* Main Card */}
              <div 
                className={`relative z-10 block rounded-2xl border p-3 transition-all duration-500 ${cardClasses}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotColor}`} />
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
                        setNewLimit("");
                        setFlyoutKey(isFlying ? null : alert.id);
                      }}
                      className="w-full mt-3 justify-center border-emerald-400/20 bg-emerald-400/10 px-2 py-2 text-[8px] text-emerald-300 hover:border-emerald-300/40 hover:bg-emerald-400/15"
                      aria-expanded={isFlying}
                      aria-label={`${isFlying ? "Cancel quota update" : "Increase monthly limit"} for ${alert.keyName}`}
                    >
                      {isFlying ? 'Cancel' : 'Increase Limit'}
                    </Button>
                  </div>
                  
                  <button 
                    type="button"
                    onClick={() => setPeekingKey(isPeeking ? null : alert.id)}
                    className={`rounded-full p-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 ${isPeeking ? 'bg-white text-slate-950 rotate-90' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                    aria-expanded={isPeeking}
                    aria-label={`${isPeeking ? "Hide" : "Show"} usage trend for ${alert.keyName}`}
                  >
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
                      <path d="M9 18l6-6-6-6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>

                {/* Vertical Stats Peek */}
                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isPeeking ? 'mt-4 max-h-32 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="space-y-3 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Activity Trend</span>
                      <span className="text-[8px] font-bold text-slate-200">{alert.usageCount.toLocaleString()} / {alert.currentLimit.toLocaleString()}</span>
                    </div>
                    <UsageSparkline data={alert.dailyTrend} color={isMaxed ? "#ef4444" : isWarning ? "#fbbf24" : "#10b981"} />
                  </div>
                </div>

                {/* Mobile Inline Quota Increase Form */}
                <div className={`md:hidden overflow-hidden transition-all duration-500 ease-in-out ${isFlying ? 'mt-4 max-h-64 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                  <div className="space-y-3 pt-3 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-white uppercase tracking-widest">New Monthly Limit</span>
                    </div>
                    {/* DEBUG INPUT */}
                    <input
                      type="text"
                      inputMode="numeric"
                      value={newLimit}
                      onChange={(e) => setNewLimit(e.target.value.replace(/\D/g, ""))}
                      onKeyDown={(e) => console.log("debug keydown", e.key, e.repeat)}
                      className="dandi-field px-4 py-4 font-serif text-2xl font-bold bg-purple-900"
                    />
                    {/* END DEBUG INPUT */}
                    <div className="relative">
                      <input 
                        type="text" 
                        inputMode="numeric"
                        value={newLimit}
                        onChange={(e) => handleNewLimitChange(e.target.value)}
                        disabled={!hasPlanHeadroom}
                        placeholder="500"
                        className="dandi-field px-4 py-4 font-serif text-2xl font-bold"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[8px] font-black text-zinc-400 uppercase">Credits</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="px-1 text-[8px] font-medium text-zinc-500 dark:text-zinc-400 italic">
                        Current: {alert.currentLimit.toLocaleString()}
                      </p>
                      {isNotIncrease && newLimit !== "" && (
                        <p className="px-1 text-[8px] font-bold text-red-500">
                          Must be strictly greater than current limit/usage ({minimumLimit.toLocaleString()} credits).
                        </p>
                      )}
                      {!isNotIncrease && isAbovePlanLimit && (
                        <p className="px-1 text-[8px] font-bold text-red-500">
                          Cannot exceed the maximum allowed limit of {maxLimitCap.toLocaleString()} credits.
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
                      onClick={() => handleIncrease(alert)}
                      disabled={isSubmitDisabled}
                      className="relative w-full overflow-hidden py-4 text-[10px] tracking-[0.2em]"
                    >
                      <span className="relative z-10">{isUpdating ? 'Updating...' : 'Update Limit'}</span>
                      <div className="absolute inset-0 z-0 bg-gradient-to-r from-emerald-600 to-teal-600 opacity-0 transition-opacity group-hover:opacity-10" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Horizontal Flyout Increase Form - Desktop Only */}
              <div 
                className={`hidden md:flex absolute left-full top-1/2 z-[110] -translate-y-1/2 items-center transition-all duration-500 origin-left ${
                  isFlying 
                    ? 'translate-x-3 opacity-100 scale-100 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]' 
                    : '-translate-x-4 opacity-0 scale-0 pointer-events-none ease-[cubic-bezier(0.6,-0.28,0.735,0.045)]'
                }`}
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
                      onClick={() => setFlyoutKey(null)}
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
                        value={newLimit}
                        onChange={(e) => handleNewLimitChange(e.target.value)}
                        disabled={!hasPlanHeadroom}
                        placeholder="500"
                        className="dandi-field px-4 py-4 font-serif text-2xl font-bold"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[8px] font-black text-zinc-400 uppercase">Credits</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="px-1 text-[8px] font-medium text-zinc-400 italic">
                        Current: {alert.currentLimit.toLocaleString()}
                      </p>
                      {isNotIncrease && newLimit !== "" && (
                        <p className="px-1 text-[8px] font-bold text-red-500">
                          Must be strictly greater than current limit/usage ({minimumLimit.toLocaleString()} credits).
                        </p>
                      )}
                      {!isNotIncrease && isAbovePlanLimit && (
                        <p className="px-1 text-[8px] font-bold text-red-500">
                          Cannot exceed the maximum allowed limit of {maxLimitCap.toLocaleString()} credits.
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
                    onClick={() => handleIncrease(alert)}
                    disabled={isSubmitDisabled}
                    className="relative w-full overflow-hidden py-4 text-[10px] tracking-[0.2em]"
                  >
                    <span className="relative z-10">{isUpdating ? 'Updating...' : 'Update Limit'}</span>
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
