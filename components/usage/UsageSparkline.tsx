"use client";

import React, { useState, useRef } from "react";
import { formatShortDate } from "@/lib/format";

type DataPoint = { date: string; count: number };

export function UsageSparkline({ data, color = "#10b981", isLoading = false }: { data: DataPoint[]; color?: string; isLoading?: boolean }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoveredCoords, setHoveredCoords] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const gradientId = React.useId().replace(/:/g, "-");

  if (isLoading) {
    return <div className="h-12 w-full animate-pulse rounded-xl bg-white/10" />;
  }

  if (!data || data.length < 2 || data.every(point => point.count === 0)) {
    return (
      <div className="h-12 w-full flex items-center justify-center rounded-xl border border-dashed border-white/10 bg-slate-950/50 text-[8px] font-black uppercase tracking-widest text-slate-500 select-none">
        No Request Activity Yet
      </div>
    );
  }

  const max = Math.max(...data.map(d => d.count), 5);
  const width = 200;
  const height = 45;
  const padding = 4;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
    const y = height - ((d.count / max) * (height - padding * 2) + padding);
    return `${x},${y}`;
  }).join(" ");

  const fillPoints = `${padding},${height} ${points} ${width - padding},${height}`;
  const tooltipY = hoveredCoords ? Math.max(34, hoveredCoords.y) : 0;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const relativeX = (clientX / rect.width) * width;
    
    const index = Math.min(
      Math.max(Math.round(((relativeX - padding) / (width - padding * 2)) * (data.length - 1)), 0),
      data.length - 1
    );

    const x = (index / (data.length - 1)) * (width - padding * 2) + padding;
    const y = height - ((data[index].count / max) * (height - padding * 2) + padding);

    setHoveredIndex(index);
    setHoveredCoords({ x, y });
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
    setHoveredCoords(null);
  };

  return (
    <div className="relative h-14 w-full group/sparkline">
      <svg 
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`} 
        className="h-full w-full overflow-visible cursor-crosshair select-none"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id={`gradient-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {hoveredIndex !== null && hoveredCoords && (
          <g transform={`translate(${hoveredCoords.x} ${tooltipY})`} pointerEvents="none">
            <rect x="-38" y="-31" width="76" height="24" rx="6" className="fill-zinc-950 stroke-white/10" />
            <text x="0" y="-20" textAnchor="middle" className="fill-white text-[6px] font-black uppercase tracking-wider">
              {formatShortDate(data[hoveredIndex].date)}
            </text>
            <text x="0" y="-10" textAnchor="middle" className="fill-white font-mono text-[8px] font-bold">
              {data[hoveredIndex].count} Req
            </text>
            <path d="M-3-7 0-4 3-7" className="fill-zinc-950 stroke-white/10" />
          </g>
        )}
        <polyline
          fill={`url(#gradient-${gradientId})`}
          points={fillPoints}
          stroke="none"
          className="transition-all duration-300"
        />
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
          className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all duration-300"
        />

        {hoveredIndex !== null && hoveredCoords && (
          <>
            {/* Guide line */}
            <line
              x1={hoveredCoords.x}
              y1={padding}
              x2={hoveredCoords.x}
              y2={height}
              stroke={color}
              strokeWidth="0.75"
              strokeDasharray="2 3"
              className="opacity-45"
            />
            {/* Hovered ring */}
            <circle
              cx={hoveredCoords.x}
              cy={hoveredCoords.y}
              r="4.5"
              fill={color}
              className="opacity-20 animate-pulse"
            />
            <circle
              cx={hoveredCoords.x}
              cy={hoveredCoords.y}
              r="2.5"
              fill={color}
              stroke="white"
              strokeWidth="1"
            />
          </>
        )}
      </svg>
    </div>
  );
}
