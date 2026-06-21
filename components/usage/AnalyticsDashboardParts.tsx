import Link from "next/link";
import type React from "react";
import { CommandPanel, MetricCard, ScrollFrame, StatusPill } from "@/components/command";
import {
  formatCurrency,
  formatLongDate,
  formatPercentage,
  formatRepositoryLabel,
  formatRequestCount,
  formatShortDate,
} from "@/lib/format";
import type { DailyUsageTrend, TopRepositoryUsage, UsageKeySummary } from "@/types/usage";

export type AnalyticsMetricView = "requests" | "latency" | "reliability";

type ChartPoint = {
  x: number;
  y: number;
  data: DailyUsageTrend;
};

export type AnalyticsChartPoints = {
  path: string;
  fillPath: string;
  dots: ChartPoint[];
};

export function ResourceContextSelector({
  keys,
  selectedKeyId,
  isDropdownOpen,
  dropdownRef,
  onToggleDropdown,
  onSelectKey,
}: {
  keys: UsageKeySummary[];
  selectedKeyId: string;
  isDropdownOpen: boolean;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  onToggleDropdown: () => void;
  onSelectKey: (keyId: string) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Resource Context</span>
      <div ref={dropdownRef} className="relative select-none z-30">
        <button
          type="button"
          onClick={onToggleDropdown}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/70 px-4.5 py-2.5 text-xs font-bold text-slate-100 shadow-sm transition duration-200 hover:border-emerald-300/25 active:scale-98 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          <span className="truncate max-w-[150px] sm:max-w-[200px]">
            {selectedKeyId === "all"
              ? "All Combined Keys"
              : keys.find(key => key.id === selectedKeyId)?.name || "Select Key"}
          </span>
          <svg
            viewBox="0 0 24 24"
            className={`h-3.5 w-3.5 text-zinc-400 transition-transform duration-300 ${
              isDropdownOpen ? "rotate-180 text-emerald-500" : ""
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div
          className={`absolute left-0 mt-2 w-64 rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-xl backdrop-blur-md transition-all duration-355 origin-top-left transform ${
            isDropdownOpen
              ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
              : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
          }`}
        >
          <button
            type="button"
            onClick={() => onSelectKey("all")}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold text-left transition cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 ${
              selectedKeyId === "all"
                ? "bg-emerald-500/10 text-emerald-300"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
            }`}
          >
            <span>All Combined Keys</span>
            {selectedKeyId === "all" && (
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-emerald-500 animate-in zoom-in duration-200" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>

          {keys.length > 0 && <div className="h-px bg-zinc-200/60 dark:bg-zinc-800/60 my-1 mx-2" />}
          <div className="max-h-48 overflow-y-auto scrollbar-hide space-y-0.5">
            {keys.map(key => {
              const isSelected = selectedKeyId === key.id;
              return (
                <button
                  key={key.id}
                  type="button"
                  onClick={() => onSelectKey(key.id)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold text-left transition cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 ${
                    isSelected
                      ? "bg-emerald-500/10 text-emerald-300"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="truncate max-w-[170px]">{key.name}</span>
                    <span className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">{formatRequestCount(key.usage_count)} requests</span>
                  </div>
                  {isSelected && (
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-emerald-500 animate-in zoom-in duration-200" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AnalyticsMetricToggleGroup({
  metricView,
  onMetricViewChange,
}: {
  metricView: AnalyticsMetricView;
  onMetricViewChange: (view: AnalyticsMetricView) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {(["requests", "latency", "reliability"] as const).map(view => (
        <button
          key={view}
          onClick={() => onMetricViewChange(view)}
          className={`rounded-full px-4.5 py-2 text-[10px] font-black uppercase tracking-widest transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
            metricView === view
              ? "bg-emerald-300 text-slate-950 shadow-md scale-102"
              : "border border-white/10 bg-slate-950/60 text-slate-400 hover:text-slate-100"
          }`}
        >
          {view === "requests" ? "Requests" : view === "latency" ? "Latency" : "Reliability"}
        </button>
      ))}
    </div>
  );
}

export function AnalyticsOverviewCards({
  currentTotalRequests,
  currentAvgLatency,
  currentSuccessRate,
}: {
  currentTotalRequests: number;
  currentAvgLatency: number;
  currentSuccessRate: number;
}) {
  const estimatedSavings = formatCurrency(currentTotalRequests * 0.02);

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        label="Aggregate Requests"
        value={formatRequestCount(currentTotalRequests)}
        detail="Billable requests (30d)"
        tone="success"
        icon={
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
            <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        }
      />

      <MetricCard
        label="Average Latency"
        value={<>{currentAvgLatency}<span className="ml-1 text-xs font-normal font-sans text-slate-400">ms</span></>}
        detail={currentAvgLatency === 0 ? "No data yet" : currentAvgLatency < 250 ? "Fast response" : currentAvgLatency < 500 ? "Good speed" : "Delayed"}
        tone={currentAvgLatency < 250 ? "success" : currentAvgLatency < 500 ? "warning" : "danger"}
        icon={
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        }
      />

      <MetricCard
        label="Success Rate"
        value={formatPercentage(currentSuccessRate)}
        detail="Successful requests"
        tone="info"
        icon={
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        }
      />

      <MetricCard label="Estimated Savings" value={estimatedSavings} detail="Compared with manual review" tone="warning" icon={<span className="text-xs font-black leading-none">$</span>} />
    </div>
  );
}

export function UsageHistoryChartPanel({
  metricView,
  metricName,
  chartColor,
  reliabilityErrorColor,
  reliabilitySuccessColor,
  dataset,
  chartRef,
  resizeRef,
  chartWidth,
  chartHeight,
  chartInnerWidth,
  chartInnerHeight,
  paddingLeft,
  paddingRight,
  paddingTop,
  maxMetricValue,
  chartPoints,
  hoveredIndex,
  hoverCoords,
  onMouseMove,
  onMouseLeave,
}: {
  metricView: AnalyticsMetricView;
  metricName: string;
  chartColor: string;
  reliabilityErrorColor: string;
  reliabilitySuccessColor: string;
  dataset: DailyUsageTrend[];
  chartRef: React.RefObject<SVGSVGElement | null>;
  resizeRef: React.RefObject<HTMLDivElement | null>;
  chartWidth: number;
  chartHeight: number;
  chartInnerWidth: number;
  chartInnerHeight: number;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  maxMetricValue: number;
  chartPoints: AnalyticsChartPoints;
  hoveredIndex: number | null;
  hoverCoords: { x: number; y: number } | null;
  onMouseMove: (event: React.MouseEvent<SVGSVGElement>) => void;
  onMouseLeave: () => void;
}) {
  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <CommandPanel className="p-5 sm:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300/70">Usage History</p>
          <h3 className="flex flex-wrap items-center gap-2 font-serif text-2xl font-bold tracking-tight text-white">
            {metricName}
            <span className="text-xs font-normal font-sans text-slate-400">/ last 30 days</span>
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: chartColor }} />
            <span>{metricName}</span>
          </div>
          {metricView === "reliability" && (
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: reliabilityErrorColor }} />
              <span>Errors</span>
            </div>
          )}
        </div>
      </div>

      <ScrollFrame axis="x" minWidth="620px" label="Usage history chart">
        <div ref={resizeRef} className="relative w-full min-w-[620px]">
          {hoveredIndex !== null && hoverCoords && dataset[hoveredIndex] && (
            <ChartTooltip
              metricView={metricView}
              dataset={dataset}
              hoveredIndex={hoveredIndex}
              hoverCoords={hoverCoords}
              chartWidth={chartWidth}
              chartHeight={chartHeight}
            />
          )}

          {dataset.length < 2 ? (
            <div className="h-[240px] w-full flex flex-col items-center justify-center border border-dashed border-white/10 rounded-3xl bg-slate-950/40">
              <svg viewBox="0 0 24 24" className="h-8 w-8 text-slate-600 mb-3" fill="none" stroke="currentColor">
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10a2 2 0 01-2 2h-2a2 2 0 01-2-2zm0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300/70 select-none">
                Usage History Empty
              </p>
              <h4 className="mt-2 text-sm font-bold text-slate-200">No trend line yet.</h4>
              <p className="mt-1 max-w-md text-center text-xs font-medium leading-5 text-slate-500">
                Charts need successful requests across at least two days or request events. Analyze a repository to start filling this timeline.
              </p>
              <Link
                href="/playground?mode=summary"
                className="mt-4 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100 transition hover:border-emerald-300/45 hover:bg-emerald-300/15"
              >
                Open Playground
              </Link>
            </div>
          ) : (
            <svg
              ref={chartRef}
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="h-[240px] w-full overflow-visible cursor-crosshair select-none"
              onMouseMove={onMouseMove}
              onMouseLeave={onMouseLeave}
            >
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColor} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={chartColor} stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {yTicks.map((tick, i) => {
                const y = paddingTop + chartInnerHeight * (1 - tick);
                const labelValue = Math.round(maxMetricValue * tick);
                return (
                  <g key={i} className="opacity-30 dark:opacity-20">
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={chartWidth - paddingRight}
                      y2={y}
                      stroke="currentColor"
                      strokeWidth="0.75"
                      strokeDasharray="4 6"
                      className="text-slate-700"
                    />
                    <text
                      x={paddingLeft - 8}
                      y={y + 3}
                      textAnchor="end"
                      className="font-mono text-[8px] font-bold fill-slate-500"
                    >
                      {labelValue}
                    </text>
                  </g>
                );
              })}

              <line
                x1={paddingLeft}
                y1={paddingTop + chartInnerHeight}
                x2={chartWidth - paddingRight}
                y2={paddingTop + chartInnerHeight}
                stroke="currentColor"
                strokeWidth="1"
                className="text-slate-800"
              />

              {dataset.map((day, i) => {
                if (i % 5 !== 0 && i !== dataset.length - 1) return null;
                const x = paddingLeft + (i / (dataset.length - 1)) * chartInnerWidth;
                const formattedDate = formatShortDate(day.date);
                return (
                  <text
                    key={i}
                    x={x}
                    y={paddingTop + chartInnerHeight + 18}
                    textAnchor="middle"
                    className="font-mono text-[8px] font-bold fill-zinc-400 dark:fill-zinc-600"
                  >
                    {formattedDate}
                  </text>
                );
              })}

              {metricView !== "reliability" && (
                <path
                  d={chartPoints.fillPath}
                  fill="url(#chartGradient)"
                  className="transition-all duration-500 ease-out"
                />
              )}

              {metricView !== "reliability" ? (
                <path
                  d={chartPoints.path}
                  fill="none"
                  stroke={chartColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.05)] transition-all duration-500 ease-out"
                />
              ) : (
                dataset.map((day, i) => {
                  const x = paddingLeft + (i / (dataset.length - 1)) * chartInnerWidth;
                  const barWidth = Math.max(chartInnerWidth / dataset.length * 0.6, 3);
                  const successHeight = (day.success / maxMetricValue) * chartInnerHeight;
                  const successY = paddingTop + chartInnerHeight - successHeight;
                  const errorHeight = (day.error / maxMetricValue) * chartInnerHeight;
                  const errorY = successY - errorHeight;

                  return (
                    <g key={i} className="transition-all duration-300">
                      {day.success > 0 && (
                        <rect
                          x={x - barWidth / 2}
                          y={successY}
                          width={barWidth}
                          height={successHeight}
                          fill={reliabilitySuccessColor}
                          rx="1.5"
                          className="opacity-80 hover:opacity-100 transition-opacity"
                        />
                      )}
                      {day.error > 0 && (
                        <rect
                          x={x - barWidth / 2}
                          y={errorY}
                          width={barWidth}
                          height={errorHeight}
                          fill={reliabilityErrorColor}
                          rx="1.5"
                          className="opacity-90 hover:opacity-100 transition-opacity"
                        />
                      )}
                    </g>
                  );
                })
              )}

              {hoveredIndex !== null && hoverCoords && dataset[hoveredIndex] && (
                <>
                  <line
                    x1={hoverCoords.x}
                    y1={paddingTop}
                    x2={hoverCoords.x}
                    y2={paddingTop + chartInnerHeight}
                    stroke={chartColor}
                    strokeWidth="1"
                    strokeDasharray="3 4"
                    className="opacity-50"
                  />

                  {metricView !== "reliability" && (
                    <>
                      <circle
                        cx={hoverCoords.x}
                        cy={hoverCoords.y}
                        r="6"
                        fill={chartColor}
                        className="opacity-20 animate-ping"
                      />
                      <circle
                        cx={hoverCoords.x}
                        cy={hoverCoords.y}
                        r="4"
                        fill={chartColor}
                        stroke="white"
                        strokeWidth="1.5"
                      />
                    </>
                  )}
                </>
              )}
            </svg>
          )}
        </div>
      </ScrollFrame>
    </CommandPanel>
  );
}

function ChartTooltip({
  metricView,
  dataset,
  hoveredIndex,
  hoverCoords,
  chartWidth,
  chartHeight,
}: {
  metricView: AnalyticsMetricView;
  dataset: DailyUsageTrend[];
  hoveredIndex: number;
  hoverCoords: { x: number; y: number };
  chartWidth: number;
  chartHeight: number;
}) {
  return (
    <div
      className="absolute z-[40] pointer-events-none rounded-2xl bg-zinc-950/95 dark:bg-white/95 text-white dark:text-zinc-950 p-4 shadow-xl border border-zinc-800 dark:border-zinc-200 -translate-x-1/2 -translate-y-[calc(100%+16px)] transition-all ease-out duration-150 backdrop-blur-sm"
      style={{
        left: `clamp(15%, ${(hoverCoords.x / chartWidth) * 100}%, 85%)`,
        top: `${(hoverCoords.y / chartHeight) * 100}%`,
      }}
    >
      <div className="flex flex-col gap-1 min-w-[120px] leading-tight text-xs font-medium">
        <span className="opacity-60 text-[9px] font-black uppercase tracking-widest mb-1.5 block">
          {formatLongDate(dataset[hoveredIndex].date)}
        </span>

        {metricView === "requests" && (
          <div className="flex justify-between gap-4">
            <span className="opacity-60">Total Volume:</span>
            <span className="font-mono font-bold text-emerald-400 dark:text-emerald-600">{dataset[hoveredIndex].count} reqs</span>
          </div>
        )}

        {metricView === "latency" && (
          <div className="flex justify-between gap-4">
            <span className="opacity-60">Avg Latency:</span>
            <span className="font-mono font-bold text-violet-400 dark:text-violet-600">{dataset[hoveredIndex].avgLatency} ms</span>
          </div>
        )}

        {metricView === "reliability" && (
          <>
            <div className="flex justify-between gap-4">
              <span className="opacity-60 text-emerald-400">Success:</span>
              <span className="font-mono font-bold text-emerald-400 dark:text-emerald-600">{dataset[hoveredIndex].success}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="opacity-60 text-red-400">Errors:</span>
              <span className="font-mono font-bold text-red-400">{dataset[hoveredIndex].error}</span>
            </div>
          </>
        )}
      </div>

      <div className="absolute left-1/2 bottom-0 w-2.5 h-2.5 bg-zinc-950 dark:bg-white rotate-45 -translate-x-1/2 translate-y-1/2 border-r border-b border-zinc-800 dark:border-zinc-200" />
    </div>
  );
}

export function AnalyticsInsightsGrid({
  globalTopRepos,
  hasAnyUsageData,
  currentTotalRequests,
  currentSuccessRate,
}: {
  globalTopRepos: TopRepositoryUsage[];
  hasAnyUsageData: boolean;
  currentTotalRequests: number;
  currentSuccessRate: number;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <CommandPanel className="flex flex-col justify-between p-6 sm:p-8">
        <div>
          <div className="flex items-center justify-between mb-6">
            <StatusPill tone="success" compact>Insight</StatusPill>
            <span className="text-[10px] font-bold text-white/50">ROBUSTNESS</span>
          </div>
          <h3 className="font-serif text-3xl font-bold italic tracking-tight mb-4 text-white">Efficiency Ledger</h3>
          {hasAnyUsageData ? (
            <p className="text-sm leading-relaxed text-zinc-400 mb-6">
              Your API architecture processed <strong className="text-white font-mono">{currentTotalRequests}</strong> transactions in the current billing epoch with a target reliability index of <strong className="text-white font-mono">{formatPercentage(currentSuccessRate)}</strong>.
            </p>
          ) : (
            <p className="text-sm leading-relaxed text-zinc-400 mb-6">
              No request activity has been recorded yet. Run your first repository analysis and Dandi will turn request history into latency, reliability, and repository insights.
            </p>
          )}
        </div>
        <div className="border-t border-white/10 pt-6 mt-4">
          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Suggested Action</p>
          {hasAnyUsageData ? (
            <p className="text-xs font-bold text-emerald-400 mt-1">Your key usage profile is optimized. No rate limit leaks detected.</p>
          ) : (
            <Link href="/playground?mode=summary" className="mt-2 inline-flex text-xs font-bold text-emerald-300 hover:underline">
              Analyze your first repository
            </Link>
          )}
        </div>
      </CommandPanel>

      <CommandPanel className="p-6 sm:p-8 lg:col-span-2">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300/70">Popularity Analytics</p>
            <h3 className="font-serif text-xl font-bold tracking-tight text-white">Active Ingested Repositories</h3>
          </div>
          <StatusPill tone="info" compact>Top Repos</StatusPill>
        </div>

        <div className="space-y-4">
          {globalTopRepos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/45 p-5 text-center">
              <p className="text-sm font-bold text-slate-200">No repository analytics yet.</p>
              <p className="mt-2 text-xs font-medium leading-5 text-slate-500">
                This list appears after successful repository summaries or source-backed questions.
              </p>
              <Link href="/playground?mode=summary" className="mt-4 inline-flex text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300 hover:underline">
                Open Playground
              </Link>
            </div>
          ) : (
            globalTopRepos.slice(0, 5).map((repo, i) => {
              const maxCount = globalTopRepos[0]?.count || 1;
              const pct = (repo.count / maxCount) * 100;
              const repoLabel = formatRepositoryLabel(repo.repo_url);
              return (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold truncate text-slate-300 hover:text-emerald-300 transition cursor-pointer">
                      {repoLabel}
                    </span>
                    <span className="font-mono font-bold tabular-nums text-slate-400">{repo.count} Summarizations</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500/80 to-emerald-500 transition-all duration-1000"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CommandPanel>
    </div>
  );
}
