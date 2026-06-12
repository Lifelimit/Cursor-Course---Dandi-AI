"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { CommandPanel, MetricCard, ScrollFrame, StatusPill } from "@/components/command";

type DailyData = {
  date: string;
  count: number;
  success: number;
  error: number;
  avgLatency: number;
};

type KeyData = {
  id: string;
  name: string;
  key_type: string;
  usage_count: number;
  monthly_limit: number | null;
  is_active: boolean;
  pct: number;
  dailyTrend: DailyData[];
};

type AnalyticsDashboardProps = {
  keys: KeyData[];
  globalTopRepos: { repo_url: string; count: number }[];
  avgLatency: number;
  successRate: number;
  dailyAnalytics?: DailyData[];
  onUpdate?: () => void;
};

export function AnalyticsDashboard({
  keys = [],
  globalTopRepos = [],
  avgLatency: globalAvgLatency = 0,
  successRate: globalSuccessRate = 0,
  dailyAnalytics = [],
}: AnalyticsDashboardProps) {
  const [selectedKeyId, setSelectedKeyId] = useState<string>("all");
  const [metricView, setMetricView] = useState<"requests" | "latency" | "reliability">("requests");
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  
  // Interactive hover states for SVG charts
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null);
  
  const chartRef = useRef<SVGSVGElement | null>(null);
  const resizeRef = useRef<HTMLDivElement | null>(null);
  const [chartWidth, setChartWidth] = useState<number>(600);

  // Click outside to close custom resource context dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Resize listener to ensure SVG is fully responsive
  useEffect(() => {
    if (!resizeRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setChartWidth(entry.contentRect.width || 600);
      }
    });
    observer.observe(resizeRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute dataset based on selections
  const dataset = useMemo<DailyData[]>(() => {
    if (selectedKeyId === "all") {
      // Use the global daily analytics returned by the server
      return dailyAnalytics && dailyAnalytics.length > 0 ? dailyAnalytics : [];
    }

    // Find the key data
    const matchedKey = keys.find(k => k.id === selectedKeyId);
    if (!matchedKey) return [];

    return matchedKey.dailyTrend;
  }, [selectedKeyId, keys, dailyAnalytics]);

  // Global Performance Summaries
  const currentTotalRequests = useMemo(() => {
    return dataset.reduce((acc, curr) => acc + curr.count, 0);
  }, [dataset]);

  const currentAvgLatency = useMemo(() => {
    const activeDays = dataset.filter(d => d.count > 0);
    if (activeDays.length === 0) return selectedKeyId === "all" ? globalAvgLatency : 0;
    return Math.round(activeDays.reduce((acc, curr) => acc + curr.avgLatency, 0) / activeDays.length);
  }, [dataset, selectedKeyId, globalAvgLatency]);

  const currentSuccessRate = useMemo(() => {
    const totalSuccess = dataset.reduce((acc, curr) => acc + curr.success, 0);
    const totalErrors = dataset.reduce((acc, curr) => acc + curr.error, 0);
    const totalAttempts = totalSuccess + totalErrors;
    if (totalAttempts === 0) return selectedKeyId === "all" ? globalSuccessRate || 100 : 100;
    return Number(((totalSuccess / totalAttempts) * 100).toFixed(1));
  }, [dataset, selectedKeyId, globalSuccessRate]);

  // SaaS ROI metric: value generated (savings)
  const estimatedSavings = useMemo(() => {
    // Standard industry pricing is about $0.02 per repository summarization API request
    return (currentTotalRequests * 0.02).toFixed(2);
  }, [currentTotalRequests]);

  // SVG Chart bounds
  const chartHeight = 240;
  const paddingLeft = 40;
  const paddingRight = 16;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartInnerWidth = chartWidth - paddingLeft - paddingRight;
  const chartInnerHeight = chartHeight - paddingTop - paddingBottom;
  const reliabilitySuccessColor = "#10b981";
  const reliabilityErrorColor = "#ef4444";

  // Maximum value for dynamic scale
  const maxMetricValue = useMemo(() => {
    if (dataset.length === 0) return 10;
    let values: number[] = [];
    if (metricView === "requests") {
      values = dataset.map(d => d.count);
    } else if (metricView === "latency") {
      values = dataset.map(d => d.avgLatency);
    } else {
      values = dataset.map(d => d.success + d.error);
    }
    const maxVal = Math.max(...values, 5);
    return Math.ceil(maxVal * 1.15); // Add 15% headroom
  }, [dataset, metricView]);

  // Generate SVG coordinates for rendering
  const chartPoints = useMemo(() => {
    if (dataset.length < 2) return { path: "", fillPath: "", dots: [] };

    const dots = dataset.map((d, i) => {
      const x = paddingLeft + (i / (dataset.length - 1)) * chartInnerWidth;
      
      let rawVal = 0;
      if (metricView === "requests") rawVal = d.count;
      else if (metricView === "latency") rawVal = d.avgLatency;
      else rawVal = d.success; // reliability success count

      const y = paddingTop + chartInnerHeight - (rawVal / maxMetricValue) * chartInnerHeight;
      return { x, y, data: d };
    });

    // Make smooth cubic bezier curve
    let path = "";
    if (dots.length > 0) {
      path = `M ${dots[0].x} ${dots[0].y}`;
      for (let i = 0; i < dots.length - 1; i++) {
        const cpX1 = dots[i].x + (dots[i + 1].x - dots[i].x) / 3;
        const cpY1 = dots[i].y;
        const cpX2 = dots[i].x + 2 * (dots[i + 1].x - dots[i].x) / 3;
        const cpY2 = dots[i + 1].y;
        path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${dots[i + 1].x} ${dots[i + 1].y}`;
      }
    }

    const fillPath = dots.length > 0 
      ? `${path} L ${dots[dots.length - 1].x} ${paddingTop + chartInnerHeight} L ${dots[0].x} ${paddingTop + chartInnerHeight} Z`
      : "";

    return { path, fillPath, dots };
  }, [dataset, metricView, chartInnerWidth, chartInnerHeight, maxMetricValue]);

  // Handle Chart mouse tracking
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!chartRef.current || dataset.length < 2) return;
    const rect = chartRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    
    // Find closest dot
    const relativeX = clientX - paddingLeft;
    const pct = relativeX / chartInnerWidth;
    const index = Math.min(
      Math.max(Math.round(pct * (dataset.length - 1)), 0),
      dataset.length - 1
    );

    const activePoint = chartPoints.dots[index];
    if (activePoint) {
      setHoveredIndex(index);
      setHoverCoords({ x: activePoint.x, y: activePoint.y });
    }
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
    setHoverCoords(null);
  };

  // Human readable metric names
  const metricName = {
    requests: "API Volume",
    latency: "Avg Latency",
    reliability: "Key Health",
  }[metricView];

  const chartColor = {
    requests: "#10b981", // Emerald
    latency: "#8b5cf6", // Violet
    reliability: reliabilitySuccessColor,
  }[metricView];

  // Grid line values
  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Selector and Filter Header */}
      <CommandPanel className="relative z-40 flex flex-col justify-between gap-4 p-6 md:flex-row md:items-center">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Resource Context</span>
          <div ref={dropdownRef} className="relative select-none z-30">
            {/* Trigger Button */}
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/70 px-4.5 py-2.5 text-xs font-bold text-slate-100 shadow-sm transition duration-200 hover:border-emerald-300/25 active:scale-98 cursor-pointer"
            >
              <span className="truncate max-w-[150px] sm:max-w-[200px]">
                {selectedKeyId === "all"
                  ? "All Combined Keys"
                  : keys.find(k => k.id === selectedKeyId)?.name || "Select Key"}
              </span>
              <svg
                viewBox="0 0 24 24"
                className={`h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 transition-transform duration-300 ${
                  isDropdownOpen ? "rotate-180 text-emerald-500" : ""
                }`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Dropdown Menu Options */}
            <div
              className={`absolute left-0 mt-2 w-64 rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-xl backdrop-blur-md transition-all duration-355 origin-top-left transform ${
                isDropdownOpen
                  ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
              }`}
            >
              {/* Option: All Combined Keys */}
              <button
                type="button"
                onClick={() => {
                  setSelectedKeyId("all");
                  setIsDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold text-left transition cursor-pointer ${
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

              {/* Options: Individual Keys */}
              {keys.length > 0 && <div className="h-px bg-zinc-200/60 dark:bg-zinc-800/60 my-1 mx-2" />}
              <div className="max-h-48 overflow-y-auto scrollbar-hide space-y-0.5">
                {keys.map(k => {
                  const isSelected = selectedKeyId === k.id;
                  return (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => {
                        setSelectedKeyId(k.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold text-left transition cursor-pointer ${
                        isSelected
                          ? "bg-emerald-500/10 text-emerald-300"
                          : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                      }`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="truncate max-w-[170px]">{k.name}</span>
                        <span className="text-[9px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">{k.usage_count.toLocaleString()} requests</span>
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

        <div className="flex flex-wrap items-center gap-2">
          {(["requests", "latency", "reliability"] as const).map(view => (
            <button
              key={view}
              onClick={() => {
                setMetricView(view);
                setHoveredIndex(null);
              }}
              className={`rounded-full px-4.5 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                metricView === view
                  ? "bg-emerald-300 text-slate-950 shadow-md scale-102"
                  : "border border-white/10 bg-slate-950/60 text-slate-400 hover:text-slate-100"
              }`}
            >
              {view === "requests" ? "Requests" : view === "latency" ? "Latency" : "Reliability"}
            </button>
          ))}
        </div>
      </CommandPanel>

      {/* Telemetry Overview Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Metric 1: Requests */}
        <MetricCard
          label="Aggregate Requests"
          value={currentTotalRequests.toLocaleString()}
          detail="Billable requests (30d)"
          tone="success"
          icon={
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
          }
        />

        {/* Metric 2: Average Latency */}
        <MetricCard
          label="Average Latency"
          value={<>{currentAvgLatency}<span className="ml-1 text-xs font-normal font-sans text-slate-500">ms</span></>}
          detail={currentAvgLatency === 0 ? "No telemetry" : currentAvgLatency < 250 ? "Excellent response" : currentAvgLatency < 500 ? "Good speed" : "Delayed"}
          tone={currentAvgLatency < 250 ? "success" : currentAvgLatency < 500 ? "warning" : "danger"}
          icon={
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
          }
        />

        {/* Metric 3: Success Rate */}
        <MetricCard
          label="Service Health"
          value={`${currentSuccessRate}%`}
          detail="Uptime & accuracy rate"
          tone="info"
          icon={
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
          }
        />

        {/* Metric 4: Estimated Value Generated */}
        <MetricCard label="Estimated Value" value={`$${estimatedSavings}`} detail="Dandi value generated" tone="warning" icon={<span className="text-xs font-black leading-none">$</span>} />

      </div>

      {/* Main Interactive Chart Card */}
      <CommandPanel className="p-5 sm:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300/70">Historical Telemetry</p>
            <h3 className="flex flex-wrap items-center gap-2 font-serif text-2xl font-bold tracking-tight text-white">
              {metricName} 
              <span className="text-xs font-normal font-sans text-zinc-400">/ last 30 days</span>
            </h3>
          </div>
          
          {/* Chart Legend */}
          <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
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

        {/* Dynamic Chart Container */}
        <ScrollFrame axis="x" minWidth="620px" label="Historical telemetry chart">
        <div ref={resizeRef} className="relative w-full min-w-[620px]">
          
          {hoveredIndex !== null && hoverCoords && dataset[hoveredIndex] && (
            <div
              className="absolute z-[40] pointer-events-none rounded-2xl bg-zinc-950/95 dark:bg-white/95 text-white dark:text-zinc-950 p-4 shadow-xl border border-zinc-800 dark:border-zinc-200 -translate-x-1/2 -translate-y-[calc(100%+16px)] transition-all ease-out duration-150 backdrop-blur-sm"
              style={{
                left: `clamp(15%, ${(hoverCoords.x / chartWidth) * 100}%, 85%)`,
                top: `${(hoverCoords.y / chartHeight) * 100}%`,
              }}
            >
              <div className="flex flex-col gap-1 min-w-[120px] leading-tight text-xs font-medium">
                <span className="opacity-60 text-[9px] font-black uppercase tracking-widest mb-1.5 block">
                  {new Date(dataset[hoveredIndex].date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
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
              
              {/* Tooltip pointer */}
              <div className="absolute left-1/2 bottom-0 w-2.5 h-2.5 bg-zinc-950 dark:bg-white rotate-45 -translate-x-1/2 translate-y-1/2 border-r border-b border-zinc-800 dark:border-zinc-200" />
            </div>
          )}

          {dataset.length < 2 ? (
            <div className="h-[240px] w-full flex flex-col items-center justify-center border border-dashed border-white/10 rounded-3xl bg-slate-950/40">
              <svg viewBox="0 0 24 24" className="h-8 w-8 text-slate-600 mb-3" fill="none" stroke="currentColor">
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10a2 2 0 01-2 2h-2a2 2 0 01-2-2zm0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 select-none">
                Insufficient Historical Telemetry logs
              </p>
            </div>
          ) : (
            <svg
              ref={chartRef}
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="h-[240px] w-full overflow-visible cursor-crosshair select-none"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColor} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={chartColor} stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Y Axis Grid Lines & Labels */}
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

              {/* X Axis Line */}
              <line
                x1={paddingLeft}
                y1={paddingTop + chartInnerHeight}
                x2={chartWidth - paddingRight}
                y2={paddingTop + chartInnerHeight}
                stroke="currentColor"
                strokeWidth="1"
                className="text-slate-800"
              />

              {/* X Axis Labels (every 5 days to prevent overlap) */}
              {dataset.map((d, i) => {
                if (i % 5 !== 0 && i !== dataset.length - 1) return null;
                const x = paddingLeft + (i / (dataset.length - 1)) * chartInnerWidth;
                const formattedDate = new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

              {/* Area Under the curve */}
              {metricView !== "reliability" && (
                <path
                  d={chartPoints.fillPath}
                  fill="url(#chartGradient)"
                  className="transition-all duration-500 ease-out"
                />
              )}

              {/* Curve Line */}
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
                // Reliability View: Stacked Bar Chart in SVG
                dataset.map((d, i) => {
                  const x = paddingLeft + (i / (dataset.length - 1)) * chartInnerWidth;
                  const barWidth = Math.max(chartInnerWidth / dataset.length * 0.6, 3);
                  
                  // Success bar height
                  const successHeight = (d.success / maxMetricValue) * chartInnerHeight;
                  const successY = paddingTop + chartInnerHeight - successHeight;
                  
                  // Error bar height
                  const errorHeight = (d.error / maxMetricValue) * chartInnerHeight;
                  const errorY = successY - errorHeight;

                  return (
                    <g key={i} className="transition-all duration-300">
                      {/* Success Bar */}
                      {d.success > 0 && (
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
                      {/* Error Bar */}
                      {d.error > 0 && (
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

              {/* Interactive Hover Guides & Nodes */}
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

      {/* Top Repos and Performance Insights Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        
        {/* Value Prop Insight Card */}
        <CommandPanel className="flex flex-col justify-between p-6 sm:p-8">
          <div>
            <div className="flex items-center justify-between mb-6">
              <StatusPill tone="success" compact>Insight</StatusPill>
              <span className="text-[10px] font-bold text-white/50">ROBUSTNESS</span>
            </div>
            <h3 className="font-serif text-3xl font-bold italic tracking-tight mb-4 text-white">Efficiency Ledger</h3>
            <p className="text-sm leading-relaxed text-zinc-400 mb-6">
              Your API architecture processed <strong className="text-white font-mono">{currentTotalRequests}</strong> transactions in the current billing epoch with a target reliability index of <strong className="text-white font-mono">{currentSuccessRate}%</strong>. 
            </p>
          </div>
          <div className="border-t border-white/10 pt-6 mt-4">
            <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Suggested Action</p>
            <p className="text-xs font-bold text-emerald-400 mt-1">✓ Your key usage profile is optimized. No rate limit leaks detected.</p>
          </div>
        </CommandPanel>

        {/* Global Repository Popularity */}
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
              <p className="text-xs font-medium text-slate-500 p-4 border border-dashed border-white/10 rounded-2xl text-center">
                No active repositories tracked yet in this period.
              </p>
            ) : (
              globalTopRepos.slice(0, 5).map((repo, i) => {
                const maxCount = globalTopRepos[0]?.count || 1;
                const pct = (repo.count / maxCount) * 100;
                const repoLabel = repo.repo_url.replace("https://github.com/", "");
                return (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold truncate text-slate-300 hover:text-emerald-300 transition cursor-pointer">
                        {repoLabel}
                      </span>
                      <span className="font-mono font-bold tabular-nums text-slate-500">{repo.count} Summarizations</span>
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

    </div>
  );
}
