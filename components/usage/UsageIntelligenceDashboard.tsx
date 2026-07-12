"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { CommandPanel, StatusPill, type StatusPillProps } from "@/components/command";
import { GuidedError } from "@/components/ui/GuidedError";
import { ProgressiveListFooter } from "@/components/ui/ProgressiveListFooter";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatDuration, formatJobDateTime, formatLongDate, formatPercentage, formatRepositoryLabel, formatRequestCount } from "@/lib/format";
import { getErrorGuidance } from "@/lib/error-guidance";
import { getIngestionStatusTone } from "@/lib/status-tones";
import type { IngestionJobSummary } from "@/types/rag";
import type { DailyUsageTrend, UsageData, UsageKeySummary } from "@/types/usage";

type StatusTone = NonNullable<StatusPillProps["tone"]>;
type TrendMetric = "requests" | "latency" | "outcomes";

type IngestionGroup = {
  repo: string;
  jobs: IngestionJobSummary[];
  totalJobs: number;
};

type UsageIntelligenceDashboardProps = {
  currentData: UsageData;
  currentPlan: string;
  currentLimit: number;
  isUnlimited: boolean;
  remainingQuota: number | null;
  usagePct: number;
  quotaTone: StatusTone;
  activeKeyCount: number;
  totalKeyCount: number;
  visibleIngestionGroups: IngestionGroup[];
  sortedIngestionJobCount: number;
  isLoadingJobs: boolean;
  recentJobsError: string | null;
  onRefreshJobs: () => void;
  visibleJobCount: number;
  totalJobCount: number;
  canShowMoreJobs: boolean;
  canShowLessJobs: boolean;
  onShowMoreJobs: () => void;
  onShowLessJobs: () => void;
};

function getQuotaStatus(isUnlimited: boolean, usagePct: number, totalUsage: number, currentLimit: number) {
  if (isUnlimited) return { label: "Unlimited capacity", tone: "info" as const, description: "Your current plan does not cap monthly requests." };
  if (totalUsage >= currentLimit) return { label: "Quota exhausted", tone: "danger" as const, description: "The current request allowance has been reached." };
  if (usagePct >= 80) return { label: "Approaching limit", tone: "warning" as const, description: "Usage is close to the current plan allowance." };
  if (usagePct >= 60) return { label: "Elevated usage", tone: "warning" as const, description: "Usage is elevated, with room remaining this cycle." };
  return { label: "Healthy capacity", tone: "success" as const, description: "The current plan comfortably supports observed usage." };
}

function Icon({ name }: { name: "activity" | "clock" | "repo" | "key" | "shield" | "spark" | "download" }) {
  const paths = {
    activity: <path d="M3 12h4l2.2-7 5.6 14 2.2-7H21" />,
    clock: <path d="M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
    repo: <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v17H7.5A2.5 2.5 0 0 0 5 22V5.5Zm0 0V19" />,
    key: <path d="M15.5 7.5a4 4 0 1 0 1 7.7L19 18h2v-2h-2v-2h-2.2l-1.3-1.3a4 4 0 0 0 0-5.2ZM8.5 7.5h.01" />,
    shield: <path d="m12 3 7 3v5c0 4.4-2.8 8.1-7 10-4.2-1.9-7-5.6-7-10V6l7-3Z" />,
    spark: <path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Zm6 12 .6 2.4L21 18l-2.4.6L18 21l-.6-2.4L15 18l2.4-.6L18 15Z" />,
    download: <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14" />,
  }[name];

  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths}</svg>;
}

function SectionHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300/70">{eyebrow}</p>
        <h2 className="font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h2>
        {description && <p className="max-w-2xl text-sm leading-6 text-slate-400">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function QuotaHero({ currentData, currentPlan, currentLimit, isUnlimited, remainingQuota, usagePct, quotaTone }: Pick<UsageIntelligenceDashboardProps, "currentData" | "currentPlan" | "currentLimit" | "isUnlimited" | "remainingQuota" | "usagePct" | "quotaTone">) {
  const totalUsage = currentData.totalUsage;
  const quotaStatus = getQuotaStatus(isUnlimited, usagePct, totalUsage, currentLimit);
  const dailyAnalytics = currentData.dailyAnalytics || [];
  const activeDays = dailyAnalytics.filter(day => day.count > 0 || day.error > 0).length;
  const observedRequests = dailyAnalytics.reduce((sum, day) => sum + day.count, 0);
  const observedPace = activeDays > 0 ? Math.round(observedRequests / activeDays) : 0;

  return (
    <CommandPanel tone="elevated" padding="none" className="relative isolate overflow-hidden border-emerald-300/20 shadow-[0_30px_100px_rgba(52,211,153,0.1)]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(52,211,153,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(52,211,153,0.1)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:linear-gradient(110deg,black,transparent_70%)]" />
        <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <div className="relative space-y-8 p-6 sm:p-8 md:p-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200">{currentPlan} plan</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Plan capacity</span>
            </div>
            <h2 className="font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl">Quota telemetry</h2>
            <p className="max-w-xl text-sm leading-6 text-slate-400">A live readout of request capacity across your workspace and current usage cycle.</p>
          </div>
          <StatusPill tone={quotaStatus.tone} pulse={quotaStatus.tone === "success"}>{quotaStatus.label}</StatusPill>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_180px] lg:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-mono text-5xl font-black tracking-[-0.06em] text-white sm:text-6xl">{formatRequestCount(totalUsage)}</span>
              <span className="text-base font-semibold text-slate-400">{isUnlimited ? "requests this calendar month" : `of ${formatRequestCount(currentLimit)} requests this calendar month`}</span>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <span className={`font-black ${quotaTone === "danger" ? "text-rose-300" : quotaTone === "warning" ? "text-amber-300" : "text-emerald-300"}`}>
                {isUnlimited ? "No cap" : `${Math.round(usagePct)}% used`}
              </span>
              <span className="text-slate-500">{isUnlimited ? "Unlimited monthly requests" : `${formatRequestCount(remainingQuota ?? 0)} remaining`}</span>
            </div>

            <div
              className="mt-7"
              role={isUnlimited ? "status" : "meter"}
              aria-label="Request quota used"
              aria-valuemin={isUnlimited ? undefined : 0}
              aria-valuemax={isUnlimited ? undefined : 100}
              aria-valuenow={isUnlimited ? undefined : Math.round(usagePct)}
              aria-valuetext={isUnlimited
                ? undefined
                : `${formatRequestCount(totalUsage)} of ${formatRequestCount(currentLimit)} requests used`}
            >
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                <span>Cycle consumption</span>
                <span>{isUnlimited ? "Open capacity" : `${formatRequestCount(totalUsage)} / ${formatRequestCount(currentLimit)}`}</span>
              </div>
              {isUnlimited ? (
                <div className="mt-3 h-3 overflow-hidden rounded-full border border-cyan-300/20 bg-cyan-300/5"><div className="h-full w-full rounded-full bg-[repeating-linear-gradient(135deg,rgba(103,232,249,0.55)_0,rgba(103,232,249,0.55)_8px,rgba(103,232,249,0.15)_8px,rgba(103,232,249,0.15)_16px)]" /></div>
              ) : (
                <div className="mt-3 h-3 overflow-hidden rounded-full border border-white/10 bg-slate-950/70">
                  <ProgressBar
                    value={Math.max(usagePct, totalUsage > 0 ? 1 : 0)}
                    indicatorClassName={quotaTone === "danger" ? "text-rose-300" : quotaTone === "warning" ? "text-amber-300" : "text-emerald-300"}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="relative mx-auto flex h-40 w-40 items-center justify-center rounded-full border border-white/10 bg-slate-950/50 shadow-[inset_0_0_40px_rgba(52,211,153,0.08)]">
            <svg aria-hidden="true" className="absolute inset-2 h-[calc(100%-1rem)] w-[calc(100%-1rem)] -rotate-90" viewBox="0 0 100 100">
              <circle
                className={isUnlimited ? "text-cyan-300/30" : quotaTone === "danger" ? "text-rose-300/70" : quotaTone === "warning" ? "text-amber-300/70" : "text-emerald-300/70"}
                cx="50"
                cy="50"
                fill="none"
                pathLength="100"
                r="46"
                stroke="currentColor"
                strokeDasharray="100"
                strokeDashoffset={isUnlimited ? 0 : 100 - Math.min(usagePct, 100)}
                strokeLinecap="round"
                strokeWidth="6"
              />
            </svg>
            <div className="text-center">
              <p className="font-mono text-3xl font-black text-white">{isUnlimited ? "∞" : `${Math.round(usagePct)}%`}</p>
              <p className="mt-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{isUnlimited ? "capacity" : "consumed"}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-t border-white/10 pt-5 text-xs sm:grid-cols-3">
          <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-300/15 bg-emerald-300/10 text-emerald-200"><Icon name="clock" /></span><span><span className="block text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Resets</span><span className="mt-0.5 block font-bold text-slate-200">{currentData.resetDate ? formatLongDate(currentData.resetDate) : "Date unavailable"}</span></span></div>
          <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-300/15 bg-cyan-300/10 text-cyan-200"><Icon name="activity" /></span><span><span className="block text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Observed pace</span><span className="mt-0.5 block font-bold text-slate-200">{observedPace > 0 ? `${formatRequestCount(observedPace)} requests / active day` : "Awaiting activity"}</span></span></div>
          <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-xl border border-violet-300/15 bg-violet-300/10 text-violet-200"><Icon name="spark" /></span><span><span className="block text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Capacity signal</span><span className="mt-0.5 block font-bold text-slate-200">{quotaStatus.description}</span></span></div>
        </div>
      </div>
    </CommandPanel>
  );
}

function MetricStrip({ currentData, isUnlimited, remainingQuota, activeKeyCount, totalKeyCount }: Pick<UsageIntelligenceDashboardProps, "currentData" | "isUnlimited" | "remainingQuota" | "activeKeyCount" | "totalKeyCount">) {
  const successRate = typeof currentData.successRate === "number" && (currentData.successRate > 0 || currentData.totalUsage > 0) ? currentData.successRate : null;
  const activeRepoCount = currentData.activeRepositoryCount ?? currentData.globalTopRepos.length;
  const cards = [
    { label: "Requests this month", value: formatRequestCount(currentData.totalUsage), detail: "Current UTC calendar month", tone: "success" as const, icon: "activity" as const },
    { label: "Remaining capacity", value: isUnlimited ? "Unlimited" : formatRequestCount(remainingQuota ?? 0), detail: isUnlimited ? "No monthly request cap" : "Available before reset", tone: isUnlimited ? "info" as const : remainingQuota === 0 ? "danger" as const : "success" as const, icon: "spark" as const },
    { label: "Success rate", value: successRate === null ? "—" : formatPercentage(Number(successRate.toFixed(1))), detail: successRate === null ? "No request telemetry yet" : "Observed request outcomes", tone: successRate === null ? "neutral" as const : successRate >= 95 ? "success" as const : successRate >= 80 ? "warning" as const : "danger" as const, icon: "shield" as const },
    { label: "Workspace footprint", value: formatRequestCount(activeRepoCount), detail: `${activeKeyCount}/${totalKeyCount} active credentials`, tone: "info" as const, icon: "repo" as const },
  ];

  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(card => <CommandPanel key={card.label} padding="md" interactive className="group"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{card.label}</p><p className={`mt-3 font-mono text-2xl font-black tracking-tight ${card.tone === "danger" ? "text-rose-300" : card.tone === "warning" ? "text-amber-300" : card.tone === "info" ? "text-cyan-300" : card.tone === "success" ? "text-emerald-300" : "text-slate-200"}`}>{card.value}</p><p className="mt-2 text-xs leading-5 text-slate-500">{card.detail}</p></div><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-400 transition group-hover:border-emerald-300/25 group-hover:text-emerald-200"><Icon name={card.icon} /></span></div></CommandPanel>)}</div>;
}

function TrendChart({ data }: { data: DailyUsageTrend[] }) {
  const [range, setRange] = useState<7 | 30>(30);
  const [metric, setMetric] = useState<TrendMetric>("requests");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const gradientId = useId().replace(/:/g, "-");
  const dataset = useMemo(() => data.slice(-range), [data, range]);
  const width = 800;
  const height = 260;
  const padding = { top: 22, right: 18, bottom: 38, left: 48 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const values = dataset.map(day => metric === "requests" ? day.count : metric === "latency" ? day.avgLatency : day.success + day.error);
  const maxValue = Math.max(...values, metric === "latency" ? 100 : 5);
  const points = dataset.map((day, index) => ({
    x: padding.left + (dataset.length <= 1 ? innerWidth / 2 : (index / (dataset.length - 1)) * innerWidth),
    y: padding.top + innerHeight - ((metric === "requests" ? day.count : day.avgLatency) / maxValue) * innerHeight,
    day,
  }));
  const hasActivity = dataset.some(day => metric === "requests" ? day.count > 0 : metric === "latency" ? day.avgLatency > 0 : day.success > 0 || day.error > 0);
  const selectedIndex = hoveredIndex ?? (dataset.length > 0 ? dataset.length - 1 : null);
  const selectedDay = selectedIndex === null ? null : dataset[selectedIndex];
  const summary = dataset.length === 0 ? "No usage trend data is available." : metric === "requests" ? `${formatRequestCount(dataset.reduce((sum, day) => sum + day.count, 0))} successful requests across the last ${dataset.length} days.` : metric === "latency" ? `Average latency ranges from ${formatDuration(Math.min(...dataset.map(day => day.avgLatency)))} to ${formatDuration(Math.max(...dataset.map(day => day.avgLatency)))} across the last ${dataset.length} days.` : `${formatRequestCount(dataset.reduce((sum, day) => sum + day.success, 0))} successes and ${formatRequestCount(dataset.reduce((sum, day) => sum + day.error, 0))} errors across the last ${dataset.length} days.`;

  const selectNearestPoint = (clientX: number, rect: DOMRect) => {
    if (dataset.length === 0) return;
    const relative = Math.min(Math.max((clientX - rect.left - padding.left * rect.width / width) / (rect.width * innerWidth / width), 0), 1);
    setHoveredIndex(dataset.length <= 1 ? 0 : Math.round(relative * (dataset.length - 1)));
  };

  return (
    <CommandPanel id="trends" className="scroll-mt-6 p-5 sm:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <SectionHeading eyebrow="Consumption trends" title="Request activity" description="Daily volume and operational signals from durable telemetry across the last 30 days." />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end">
          <div role="group" className="flex rounded-xl border border-white/10 bg-slate-950/60 p-1" aria-label="Trend metric">
            {(["requests", "latency", "outcomes"] as const).map(option => <button key={option} type="button" aria-pressed={metric === option} onClick={() => { setMetric(option); setHoveredIndex(null); }} className={`rounded-lg px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] transition ${metric === option ? "bg-emerald-300 text-slate-950" : "text-slate-500 hover:text-slate-200"}`}>{option === "outcomes" ? "Outcomes" : option}</button>)}
          </div>
          <div role="group" className="flex rounded-xl border border-white/10 bg-slate-950/60 p-1" aria-label="Trend range">
            {([7, 30] as const).map(option => <button key={option} type="button" aria-pressed={range === option} onClick={() => { setRange(option); setHoveredIndex(null); }} className={`rounded-lg px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] transition ${range === option ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-200"}`}>{option}D</button>)}
          </div>
        </div>
      </div>

      <p className="sr-only" id={`trend-summary-${gradientId}`}>{summary}</p>
      <p className="sr-only" id={`trend-instructions-${gradientId}`}>Use Left and Right Arrow, Home, or End to inspect individual days.</p>
      <div className="relative mt-8 rounded-2xl border border-white/10 bg-slate-950/45 p-2 sm:p-4">
        {!hasActivity ? (
          <div className="flex h-[260px] flex-col items-center justify-center text-center"><span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-slate-500"><Icon name="activity" /></span><p className="mt-4 text-sm font-bold text-slate-200">No trend line yet</p><p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">Analyze a repository in the Playground and this timeline will start recording real activity.</p><Link href="/playground?mode=summary" className="mt-4 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300 hover:underline">Open Playground</Link></div>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between px-2 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500"><span>{metric === "latency" ? "Milliseconds" : metric === "outcomes" ? "Request events" : "Successful requests"}</span><span>{range === 7 ? "Last 7 days" : "Last 30 days"}</span></div>
            <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-describedby={`trend-summary-${gradientId} trend-instructions-${gradientId}`} aria-label={summary} tabIndex={0} className="h-[260px] w-full overflow-visible outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70" onMouseMove={event => selectNearestPoint(event.clientX, event.currentTarget.getBoundingClientRect())} onMouseLeave={() => setHoveredIndex(null)} onFocus={() => setHoveredIndex(dataset.length - 1)} onKeyDown={event => { if (dataset.length === 0) return; if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return; event.preventDefault(); if (event.key === "ArrowLeft") setHoveredIndex(Math.max((hoveredIndex ?? dataset.length - 1) - 1, 0)); if (event.key === "ArrowRight") setHoveredIndex(Math.min((hoveredIndex ?? dataset.length - 1) + 1, dataset.length - 1)); if (event.key === "Home") setHoveredIndex(0); if (event.key === "End") setHoveredIndex(dataset.length - 1); }}>
              <defs><linearGradient id={`trend-fill-${gradientId}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={metric === "latency" ? "#a78bfa" : "#6ee7b7"} stopOpacity="0.28" /><stop offset="100%" stopColor={metric === "latency" ? "#a78bfa" : "#6ee7b7"} stopOpacity="0.01" /></linearGradient></defs>
              {[0, 0.25, 0.5, 0.75, 1].map(tick => { const y = padding.top + innerHeight * (1 - tick); return <g key={tick}><line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="rgba(148,163,184,0.16)" strokeDasharray="3 6" /><text x={padding.left - 10} y={y + 3} textAnchor="end" className="fill-slate-600 font-mono text-[9px]">{Math.round(maxValue * tick)}</text></g>; })}
              <line x1={padding.left} x2={width - padding.right} y1={height - padding.bottom} y2={height - padding.bottom} stroke="rgba(148,163,184,0.22)" />
              {dataset.map((day, index) => (index % Math.max(Math.ceil(dataset.length / 6), 1) === 0 || index === dataset.length - 1) && <text key={day.date} x={points[index].x} y={height - 12} textAnchor="middle" className="fill-slate-600 font-mono text-[9px]">{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(day.date))}</text>)}
              {metric === "outcomes" ? dataset.map((day, index) => { const barWidth = Math.max(innerWidth / Math.max(dataset.length, 1) * 0.58, 4); const successHeight = (day.success / maxValue) * innerHeight; const errorHeight = (day.error / maxValue) * innerHeight; const x = points[index].x - barWidth / 2; const bottom = height - padding.bottom; return <g key={day.date}><rect x={x} y={bottom - successHeight} width={barWidth} height={successHeight} rx="2" fill="#6ee7b7" opacity="0.85" /><rect x={x} y={bottom - successHeight - errorHeight} width={barWidth} height={errorHeight} rx="2" fill="#fb7185" opacity="0.9" /></g>; }) : <><polyline points={`${padding.left},${height - padding.bottom} ${points.map(point => `${point.x},${point.y}`).join(" ")} ${width - padding.right},${height - padding.bottom}`} fill={`url(#trend-fill-${gradientId})`} stroke="none" /><polyline points={points.map(point => `${point.x},${point.y}`).join(" ")} fill="none" stroke={metric === "latency" ? "#a78bfa" : "#6ee7b7"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></>}
              {selectedIndex !== null && points[selectedIndex] && <><line x1={points[selectedIndex].x} x2={points[selectedIndex].x} y1={padding.top} y2={height - padding.bottom} stroke={metric === "latency" ? "#a78bfa" : "#6ee7b7"} strokeDasharray="3 5" opacity="0.5" /><circle cx={points[selectedIndex].x} cy={metric === "outcomes" ? height - padding.bottom - ((selectedDay?.success || 0) + (selectedDay?.error || 0)) / maxValue * innerHeight : points[selectedIndex].y} r="5" fill={metric === "latency" ? "#a78bfa" : "#6ee7b7"} stroke="#fff" strokeWidth="1.5" /></>}
            </svg>
            {selectedDay && <div aria-live="polite" className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-white/10 px-2 pt-3 text-[10px] font-bold text-slate-400"><span>{new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(selectedDay.date))}</span><span className="font-mono text-slate-200">{metric === "requests" ? `${formatRequestCount(selectedDay.count)} successful requests` : metric === "latency" ? formatDuration(selectedDay.avgLatency) : `${formatRequestCount(selectedDay.success)} success · ${formatRequestCount(selectedDay.error)} errors`}</span></div>}
          </>
        )}
      </div>
      <p className="mt-3 text-[10px] font-medium text-slate-600">Tip: focus the chart and use the arrow keys to inspect individual days.</p>
    </CommandPanel>
  );
}

function RequestHealth({ currentData }: { currentData: UsageData }) {
  const daily = currentData.dailyAnalytics || [];
  const errorCount = daily.reduce((sum, day) => sum + day.error, 0);
  const attempts = daily.reduce((sum, day) => sum + day.success + day.error, 0);
  const successRate = typeof currentData.successRate === "number" && (attempts > 0 || currentData.totalUsage > 0) ? currentData.successRate : null;
  const latency = currentData.avgLatency || 0;
  const healthTone: StatusTone = successRate === null ? "neutral" : successRate >= 95 ? "success" : successRate >= 80 ? "warning" : "danger";
  const healthLabel = successRate === null ? "Awaiting telemetry" : healthTone === "success" ? "Stable outcomes" : healthTone === "warning" ? "Review elevated errors" : "Attention required";

  return <CommandPanel className="h-full p-6 sm:p-8"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300/70">Operational health · last 30 days</p><h2 className="mt-2 font-serif text-2xl font-bold text-white">Request health</h2></div><StatusPill tone={healthTone}>{healthLabel}</StatusPill></div><div className="mt-8 space-y-5"><HealthRow label="Success rate" value={successRate === null ? "—" : formatPercentage(Number(successRate.toFixed(1)))} detail={successRate === null ? "No request telemetry yet" : "Observed request outcomes"} tone={healthTone} /><HealthRow label="Average latency" value={latency > 0 ? formatDuration(latency) : "—"} detail={latency > 0 ? "Across observed request events" : "No latency data yet"} tone={latency > 0 ? latency < 250 ? "success" : latency < 500 ? "warning" : "danger" : "neutral"} /><HealthRow label="Errors in 30 days" value={attempts > 0 ? formatRequestCount(errorCount) : "—"} detail={attempts > 0 ? `${formatRequestCount(attempts)} observed events` : "No error data yet"} tone={errorCount === 0 && attempts > 0 ? "success" : errorCount > 0 ? "warning" : "neutral"} /></div><div className="mt-7 border-t border-white/10 pt-5"><p className="text-xs leading-5 text-slate-400">{successRate === null ? "Once requests are recorded, this panel will summarize success, errors, and latency without inventing targets." : errorCount === 0 ? "No errors are visible in the last 30 days." : "Errors are present in the last 30 days. Inspect recent activity and retry failed repository processing where needed."}</p></div></CommandPanel>;
}

function HealthRow({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: StatusTone }) {
  return <div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-xs font-bold text-slate-300">{label}</p><p className="mt-1 text-[10px] leading-4 text-slate-500">{detail}</p></div><span className={`shrink-0 font-mono text-xl font-black ${tone === "success" ? "text-emerald-300" : tone === "warning" ? "text-amber-300" : tone === "danger" ? "text-rose-300" : "text-slate-400"}`}>{value}</span></div>;
}

function RepositoryDemand({ currentData }: { currentData: UsageData }) {
  const repos = (currentData.globalTopRepos || []).slice(0, 6);
  const totalUsage = repos.reduce((sum, repo) => sum + repo.count, 0);

  return <CommandPanel id="repositories" className="scroll-mt-6 p-6 sm:p-8"><SectionHeading eyebrow="Repository demand · last 30 days" title="What is driving usage?" description="Ranked by observed request volume across the last 30 days." action={<Link href="/playground?mode=summary" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300 hover:text-emerald-200"><span>Open Playground</span><span aria-hidden="true">↗</span></Link>} /><div className="mt-7 space-y-3">{repos.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 px-5 py-8 text-center"><p className="text-sm font-bold text-slate-200">No repository usage yet</p><p className="mt-2 text-xs leading-5 text-slate-500">Analyze a repository to start seeing demand patterns here.</p></div> : repos.map((repo, index) => { const share = totalUsage > 0 ? Math.min((repo.count / totalUsage) * 100, 100) : 0; return <a key={repo.repo_url} href={repo.repo_url} target="_blank" rel="noopener noreferrer" className="group block rounded-2xl border border-white/10 bg-slate-950/40 p-4 transition hover:border-emerald-300/25 hover:bg-slate-950/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"><div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="font-mono text-[10px] font-black text-slate-600">{String(index + 1).padStart(2, "0")}</span><span className="min-w-0 truncate text-sm font-bold text-slate-200 group-hover:text-emerald-200">{formatRepositoryLabel(repo.repo_url)}</span></div><span className="shrink-0 font-mono text-xs font-bold tabular-nums text-emerald-200">{formatRequestCount(repo.count)}</span></div><div className="mt-3 flex items-center gap-3"><div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10"><ProgressBar value={Math.max(share, 2)} indicatorClassName="text-emerald-300" /></div><span className="w-12 shrink-0 text-right font-mono text-[10px] font-bold tabular-nums text-slate-500">{share < 10 ? share.toFixed(1) : Math.round(share)}%</span></div></a>; })}</div></CommandPanel>;
}

function getKeyTypeLabel(keyType: string) {
  if (keyType === "production") return "Production";
  if (keyType === "development") return "Development";
  return "Credential";
}

function CredentialsUsage({ currentData }: { currentData: UsageData }) {
  const keys = [...(currentData.keys || [])].sort((a, b) => b.usage_count - a.usage_count);
  const totalUsage = currentData.totalUsage;

  return <CommandPanel id="credentials" className="scroll-mt-6 p-6 sm:p-8"><SectionHeading eyebrow="Usage by credential" title="Credential footprint" description="Analytical usage breakdown. Create, edit, and revoke credentials in Account." action={<Link href="/account?tab=api" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300 hover:text-cyan-200"><span>Manage API keys</span><span aria-hidden="true">→</span></Link>} /><div className="mt-7 space-y-3">{keys.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 px-5 py-8 text-center"><p className="text-sm font-bold text-slate-200">No credentials are being tracked</p><p className="mt-2 text-xs leading-5 text-slate-500">Create an API key in Account, then return here to inspect its request footprint.</p><Link href="/account?tab=api" className="mt-4 inline-flex text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300 hover:underline">Create API key</Link></div> : keys.slice(0, 8).map(key => <CredentialRow key={key.id} keyData={key} totalUsage={totalUsage} />)}</div>{keys.length > 8 && <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">Showing top 8 of {keys.length} credentials by usage</p>}</CommandPanel>;
}

function CredentialRow({ keyData, totalUsage }: { keyData: UsageKeySummary; totalUsage: number }) {
  const share = totalUsage > 0 ? Math.min((keyData.usage_count / totalUsage) * 100, 100) : 0;
  const limit = keyData.monthly_limit;
  return <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex min-w-0 flex-wrap items-center gap-2"><p className="max-w-[16rem] truncate text-sm font-bold text-white">{keyData.name}</p><StatusPill tone={keyData.is_active ? "success" : "warning"} compact>{keyData.is_active ? "Active" : "Inactive"}</StatusPill></div><p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">{getKeyTypeLabel(keyData.key_type)} · {limit === null ? "No key cap" : `${formatRequestCount(limit)} request cap`}</p></div><div className="text-right"><p className="font-mono text-sm font-black tabular-nums text-slate-200">{formatRequestCount(keyData.usage_count)}</p><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-600">requests</p></div></div><div className="mt-4 flex items-center gap-3"><div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10"><ProgressBar value={Math.max(share, keyData.usage_count > 0 ? 2 : 0)} indicatorClassName="text-cyan-300" /></div><span className="w-12 shrink-0 text-right font-mono text-[10px] font-bold tabular-nums text-slate-500">{share < 10 ? share.toFixed(1) : Math.round(share)}%</span></div></div>;
}

function getJobEventDate(job: IngestionJobSummary) {
  return job.failedAt || job.completedAt || job.updatedAt || job.createdAt;
}

function getJobStatusLabel(job: IngestionJobSummary) {
  if (job.status === "completed") return "Completed";
  if (job.status === "failed") return "Failed";
  if (job.status === "running") return "Running";
  return "Queued";
}

function ProcessingActivity({ visibleIngestionGroups, sortedIngestionJobCount, isLoadingJobs, recentJobsError, onRefreshJobs, visibleJobCount, totalJobCount, canShowMoreJobs, canShowLessJobs, onShowMoreJobs, onShowLessJobs }: Pick<UsageIntelligenceDashboardProps, "visibleIngestionGroups" | "sortedIngestionJobCount" | "isLoadingJobs" | "recentJobsError" | "onRefreshJobs" | "visibleJobCount" | "totalJobCount" | "canShowMoreJobs" | "canShowLessJobs" | "onShowMoreJobs" | "onShowLessJobs">) {
  return <CommandPanel id="activity" className="scroll-mt-6 p-6 sm:p-8"><SectionHeading eyebrow="Repository processing activity" title="Recent preparation runs" description="Grouped by repository so failures and active processing are easy to scan." action={<StatusPill tone={isLoadingJobs ? "warning" : "info"} pulse={isLoadingJobs} compact>{isLoadingJobs ? "Loading" : `${sortedIngestionJobCount} runs`}</StatusPill>} />{isLoadingJobs && sortedIngestionJobCount === 0 ? <div className="mt-7 rounded-2xl border border-dashed border-white/10 bg-slate-950/40 px-5 py-10 text-center text-xs font-medium text-slate-500">Loading repository processing activity…</div> : recentJobsError ? <div className="mt-7"><GuidedError {...getErrorGuidance({ workflow: "usage", message: recentJobsError })} technicalDetails={recentJobsError} onAction={onRefreshJobs} actionLabel="Refresh" compact /></div> : visibleIngestionGroups.length === 0 ? <div className="mt-7 rounded-2xl border border-dashed border-white/10 bg-slate-950/40 px-5 py-10 text-center"><p className="text-sm font-bold text-slate-200">No repository processing activity yet</p><p className="mt-2 text-xs leading-5 text-slate-500">Completed, failed, running, and queued preparation runs will appear here.</p><Link href="/playground?mode=ask" className="mt-4 inline-flex text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300 hover:underline">Open Ask a Repository</Link></div> : <><div className="mt-7 space-y-3">{visibleIngestionGroups.map(group => <IngestionGroupRow key={group.repo} group={group} />)}</div><ProgressiveListFooter visibleCount={visibleJobCount} totalCount={totalJobCount} itemLabel="runs" canShowMore={canShowMoreJobs} canShowLess={canShowLessJobs} onShowMore={onShowMoreJobs} onShowLess={onShowLessJobs} /></>}</CommandPanel>;
}

function IngestionGroupRow({ group }: { group: IngestionGroup }) {
  const latestJob = group.jobs[0];
  const distribution = group.jobs.reduce((counts, job) => { counts[job.status] = (counts[job.status] || 0) + 1; return counts; }, {} as Record<string, number>);
  return <details className="group rounded-2xl border border-white/10 bg-slate-950/40 transition open:border-emerald-300/20 open:bg-slate-950/70"><summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-4 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"><div className="flex min-w-0 items-center gap-3"><span className="text-slate-600 transition group-open:rotate-90">›</span><div className="min-w-0"><p className="truncate text-sm font-bold text-white">{group.repo}</p><p className="mt-1 text-[10px] font-medium text-slate-500">Latest run {getJobEventDate(latestJob) ? formatJobDateTime(getJobEventDate(latestJob) as string) : "pending"} · {group.totalJobs} total</p></div></div><div className="flex flex-wrap items-center justify-end gap-2"><StatusPill tone={getIngestionStatusTone(latestJob.status)} compact>{getJobStatusLabel(latestJob)}</StatusPill><span className="hidden text-[9px] font-black uppercase tracking-[0.16em] text-slate-600 sm:inline">Inspect runs</span></div></summary><div className="space-y-2 border-t border-white/10 p-4"><div className="flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-[0.14em] text-slate-600"><span>{distribution.completed || 0} completed</span><span>{distribution.failed || 0} failed</span><span>{distribution.running || 0} running</span><span>{distribution.queued || 0} queued</span></div>{group.jobs.map(job => <IngestionRun key={job.jobId} job={job} />)}</div></details>;
}

function IngestionRun({ job }: { job: IngestionJobSummary }) {
  const guidance = job.status === "failed" && job.errorMessage ? getErrorGuidance({ workflow: "repository-indexing", message: job.errorMessage }) : null;
  return <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="font-mono text-[10px] font-bold text-slate-300">{getJobEventDate(job) ? formatJobDateTime(getJobEventDate(job) as string) : "Pending"}</p><div className="mt-2 flex flex-wrap gap-2 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-600"><span>{typeof job.indexedFileCount === "number" ? formatRequestCount(job.indexedFileCount) : "0"} files</span><span>{typeof job.chunkCount === "number" ? formatRequestCount(job.chunkCount) : "0"} chunks</span><span>{job.indexAvailable ? "Index available" : "Index unavailable"}</span></div></div><StatusPill tone={getIngestionStatusTone(job.status)} compact>{getJobStatusLabel(job)}</StatusPill></div>{guidance && <div className="mt-3 rounded-xl border border-rose-300/15 bg-rose-300/5 p-3"><p className="text-xs font-bold text-rose-200">{guidance.explanation}</p><p className="mt-1 text-[10px] leading-5 text-slate-400">{guidance.nextAction}</p><details className="mt-2"><summary className="cursor-pointer text-[9px] font-black uppercase tracking-[0.14em] text-slate-600">Technical details</summary><p className="mt-2 break-words font-mono text-[10px] leading-5 text-slate-500">{job.errorMessage}</p></details></div>}</div>;
}

function PlanFit({ currentData, currentPlan, currentLimit, isUnlimited, usagePct }: Pick<UsageIntelligenceDashboardProps, "currentData" | "currentPlan" | "currentLimit" | "isUnlimited" | "usagePct">) {
  const quotaStatus = getQuotaStatus(isUnlimited, usagePct, currentData.totalUsage, currentLimit);
  const isContextualBilling = !isUnlimited && usagePct >= 80;
  return <CommandPanel tone={quotaStatus.tone === "danger" ? "danger" : "default"} className="relative overflow-hidden p-6 sm:p-8"><div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-violet-400/10 blur-3xl" /><div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-start gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-violet-300/20 bg-violet-300/10 text-violet-200"><Icon name="spark" /></span><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-300/70">Plan fit</p><h2 className="mt-2 font-serif text-2xl font-bold text-white">{isUnlimited ? "Capacity is open-ended" : quotaStatus.label}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{isUnlimited ? "Usage is not capped on the current plan." : usagePct >= 80 ? `You are using ${Math.round(usagePct)}% of the ${currentPlan} plan allowance. Consider capacity before the next reset.` : `Your current plan comfortably supports the observed ${formatRequestCount(currentData.totalUsage)} requests this cycle.`}</p></div></div>{isContextualBilling && <Link href="/billing" className="inline-flex shrink-0 items-center justify-center rounded-full border border-violet-300/25 bg-violet-300/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-violet-100 transition hover:border-violet-300/45 hover:bg-violet-300/15">Review capacity</Link>}</div></CommandPanel>;
}

export function UsageIntelligenceDashboard(props: UsageIntelligenceDashboardProps) {
  const { currentData, currentPlan, currentLimit, isUnlimited, remainingQuota, usagePct, quotaTone, activeKeyCount, totalKeyCount } = props;
  return <div className="space-y-6"><QuotaHero currentData={currentData} currentPlan={currentPlan} currentLimit={currentLimit} isUnlimited={isUnlimited} remainingQuota={remainingQuota} usagePct={usagePct} quotaTone={quotaTone} /><MetricStrip currentData={currentData} isUnlimited={isUnlimited} remainingQuota={remainingQuota} activeKeyCount={activeKeyCount} totalKeyCount={totalKeyCount} /><div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.85fr)]"><TrendChart data={currentData.dailyAnalytics || []} /><RequestHealth currentData={currentData} /></div><div className="grid gap-6 xl:grid-cols-2"><RepositoryDemand currentData={currentData} /><CredentialsUsage currentData={currentData} /></div><ProcessingActivity visibleIngestionGroups={props.visibleIngestionGroups} sortedIngestionJobCount={props.sortedIngestionJobCount} isLoadingJobs={props.isLoadingJobs} recentJobsError={props.recentJobsError} onRefreshJobs={props.onRefreshJobs} visibleJobCount={props.visibleJobCount} totalJobCount={props.totalJobCount} canShowMoreJobs={props.canShowMoreJobs} canShowLessJobs={props.canShowLessJobs} onShowMoreJobs={props.onShowMoreJobs} onShowLessJobs={props.onShowLessJobs} /><PlanFit currentData={currentData} currentPlan={currentPlan} currentLimit={currentLimit} isUnlimited={isUnlimited} usagePct={usagePct} /></div>;
}
