"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { CommandPanel } from "@/components/command";
import {
  AnalyticsInsightsGrid,
  AnalyticsMetricToggleGroup,
  AnalyticsOverviewCards,
  ResourceContextSelector,
  UsageHistoryChartPanel,
  type AnalyticsMetricView,
} from "@/components/usage/AnalyticsDashboardParts";
import type { DailyUsageTrend, TopRepositoryUsage, UsageKeySummary } from "@/types/usage";

type AnalyticsDashboardProps = {
  keys: UsageKeySummary[];
  globalTopRepos: TopRepositoryUsage[];
  avgLatency: number;
  successRate: number;
  dailyAnalytics?: DailyUsageTrend[];
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
  const [metricView, setMetricView] = useState<AnalyticsMetricView>("requests");
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null);

  const chartRef = useRef<SVGSVGElement | null>(null);
  const resizeRef = useRef<HTMLDivElement | null>(null);
  const [chartWidth, setChartWidth] = useState<number>(600);
  const hasAnyUsageData = keys.some(key => key.usage_count > 0) || dailyAnalytics.some(day => day.count > 0);

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

  const dataset = useMemo<DailyUsageTrend[]>(() => {
    if (selectedKeyId === "all") {
      return dailyAnalytics && dailyAnalytics.length > 0 ? dailyAnalytics : [];
    }

    const matchedKey = keys.find(key => key.id === selectedKeyId);
    if (!matchedKey) return [];

    return matchedKey.dailyTrend;
  }, [selectedKeyId, keys, dailyAnalytics]);

  const currentTotalRequests = useMemo(() => {
    return dataset.reduce((acc, curr) => acc + curr.count, 0);
  }, [dataset]);

  const currentAvgLatency = useMemo(() => {
    const activeDays = dataset.filter(day => day.count > 0);
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

  const chartHeight = 240;
  const paddingLeft = 40;
  const paddingRight = 16;
  const paddingTop = 20;
  const paddingBottom = 30;
  const chartInnerWidth = chartWidth - paddingLeft - paddingRight;
  const chartInnerHeight = chartHeight - paddingTop - paddingBottom;
  const reliabilitySuccessColor = "#10b981";
  const reliabilityErrorColor = "#ef4444";

  const maxMetricValue = useMemo(() => {
    if (dataset.length === 0) return 10;
    let values: number[] = [];
    if (metricView === "requests") {
      values = dataset.map(day => day.count);
    } else if (metricView === "latency") {
      values = dataset.map(day => day.avgLatency);
    } else {
      values = dataset.map(day => day.success + day.error);
    }
    const maxVal = Math.max(...values, 5);
    return Math.ceil(maxVal * 1.15);
  }, [dataset, metricView]);

  const chartPoints = useMemo(() => {
    if (dataset.length < 2) return { path: "", fillPath: "", dots: [] };

    const dots = dataset.map((day, i) => {
      const x = paddingLeft + (i / (dataset.length - 1)) * chartInnerWidth;

      let rawVal = 0;
      if (metricView === "requests") rawVal = day.count;
      else if (metricView === "latency") rawVal = day.avgLatency;
      else rawVal = day.success;

      const y = paddingTop + chartInnerHeight - (rawVal / maxMetricValue) * chartInnerHeight;
      return { x, y, data: day };
    });

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

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!chartRef.current || dataset.length < 2) return;
    const rect = chartRef.current.getBoundingClientRect();
    const clientX = event.clientX - rect.left;

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

  const handleSelectKey = (keyId: string) => {
    setSelectedKeyId(keyId);
    setIsDropdownOpen(false);
  };

  const handleMetricViewChange = (view: AnalyticsMetricView) => {
    setMetricView(view);
    setHoveredIndex(null);
  };

  const metricName = {
    requests: "API Volume",
    latency: "Avg Latency",
    reliability: "Key Health",
  }[metricView];

  const chartColor = {
    requests: "#10b981",
    latency: "#8b5cf6",
    reliability: reliabilitySuccessColor,
  }[metricView];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <CommandPanel className="relative z-40 flex flex-col justify-between gap-4 p-6 md:flex-row md:items-center">
        <ResourceContextSelector
          keys={keys}
          selectedKeyId={selectedKeyId}
          isDropdownOpen={isDropdownOpen}
          dropdownRef={dropdownRef}
          onToggleDropdown={() => setIsDropdownOpen(current => !current)}
          onSelectKey={handleSelectKey}
        />

        <AnalyticsMetricToggleGroup
          metricView={metricView}
          onMetricViewChange={handleMetricViewChange}
        />
      </CommandPanel>

      <AnalyticsOverviewCards
        currentTotalRequests={currentTotalRequests}
        currentAvgLatency={currentAvgLatency}
        currentSuccessRate={currentSuccessRate}
      />

      <UsageHistoryChartPanel
        metricView={metricView}
        metricName={metricName}
        chartColor={chartColor}
        reliabilityErrorColor={reliabilityErrorColor}
        reliabilitySuccessColor={reliabilitySuccessColor}
        dataset={dataset}
        chartRef={chartRef}
        resizeRef={resizeRef}
        chartWidth={chartWidth}
        chartHeight={chartHeight}
        chartInnerWidth={chartInnerWidth}
        chartInnerHeight={chartInnerHeight}
        paddingLeft={paddingLeft}
        paddingRight={paddingRight}
        paddingTop={paddingTop}
        maxMetricValue={maxMetricValue}
        chartPoints={chartPoints}
        hoveredIndex={hoveredIndex}
        hoverCoords={hoverCoords}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />

      <AnalyticsInsightsGrid
        globalTopRepos={globalTopRepos}
        hasAnyUsageData={hasAnyUsageData}
        currentTotalRequests={currentTotalRequests}
        currentSuccessRate={currentSuccessRate}
      />
    </div>
  );
}
