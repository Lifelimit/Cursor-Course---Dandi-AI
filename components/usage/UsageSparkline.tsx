"use client";

import React from "react";

type DataPoint = { date: string; count: number };

export function UsageSparkline({ data, color = "#10b981" }: { data: DataPoint[]; color?: string }) {
  if (!data || data.length < 2) return <div className="h-12 w-full bg-zinc-50 dark:bg-zinc-800/50 rounded-lg animate-pulse" />;

  const max = Math.max(...data.map(d => d.count), 5);
  const width = 200;
  const height = 40;
  const padding = 2;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
    const y = height - ((d.count / max) * (height - padding * 2) + padding);
    return `${x},${y}`;
  }).join(" ");

  const fillPoints = `${padding},${height} ${points} ${width - padding},${height}`;

  return (
    <div className="relative h-10 w-48">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible">
        <defs>
          <linearGradient id="gradient-spark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline
          fill="url(#gradient-spark)"
          points={fillPoints}
          stroke="none"
        />
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
          className="drop-shadow-sm"
        />
      </svg>
    </div>
  );
}
