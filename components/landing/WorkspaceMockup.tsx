"use client";

import { useState, useEffect } from "react";

const STATS_DATA = [
  { label: "AI Summarization", val: "94%", color: "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" },
  { label: "Metadata Sync", val: "76%", color: "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]" },
  { label: "Edge Response", val: "12ms", color: "bg-gradient-to-r from-indigo-500 to-blue-500 shadow-[0_0_10px_rgba(99,102,241,0.4)]" },
];

const AVATARS = [
  { initials: "JD", name: "John Doe", role: "DevOps Lead", gradient: "from-indigo-600 to-violet-600" },
  { initials: "SK", name: "Sarah K.", role: "Core AI Engineer", gradient: "from-orange-500 to-pink-600" },
  { initials: "AI", name: "Dandi Agent", role: "Autonomous Sync Node", gradient: "from-emerald-500 to-teal-600" }
];

export function WorkspaceMockup() {
  // Grounded organic ambient metrics
  const [trafficCount, setTrafficCount] = useState(14204);
  const [trafficHeights, setTrafficHeights] = useState([8, 14, 10, 18, 12, 16, 8]);

  useEffect(() => {
    const interval = setInterval(() => {
      // Subtly vary traffic count by +/- 3 (stays ultra professional and realistic)
      setTrafficCount(prev => {
        const delta = Math.floor(Math.random() * 7) - 3; // -3 to +3
        const next = prev + delta;
        return next > 14220 ? 14210 : next < 14190 ? 14200 : next;
      });

      // Subtly update bar graph heights
      setTrafficHeights(prev => {
        const next = [...prev];
        const randomIdx = Math.floor(Math.random() * next.length);
        const delta = Math.floor(Math.random() * 5) - 2; // -2 to +2
        let val = next[randomIdx] + delta;
        if (val < 6) val = 8;
        if (val > 22) val = 16;
        next[randomIdx] = val;
        return next;
      });
    }, 3000); // 3-second organic update

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative mt-12 block xl:mt-0 animate-in fade-in zoom-in duration-1000 delay-300 scale-90 sm:scale-100 max-w-xl mx-auto w-full">
      <div className="relative z-10 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 shadow-[0_32px_64px_-15px_rgba(0,0,0,0.06)] dark:shadow-none transition-all hover:scale-[1.02] hover:-rotate-1">
        <div className="rounded-2xl bg-zinc-50/50 dark:bg-zinc-800/50 p-6">
          <div className="mb-8 flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Sample Workspace</p>
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                </span>
              </div>
              <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Research Labs</h4>
            </div>
            
            {/* Refined Gradient Avatar Badges with Glassmorphic Tooltips */}
            <div className="flex -space-x-2.5">
              {AVATARS.map((avatar, idx) => (
                <div 
                  key={idx} 
                  className="group/avatar relative"
                >
                  <div 
                    className={`h-8 w-8 rounded-full border-2 border-white dark:border-zinc-900 bg-gradient-to-tr ${avatar.gradient} font-mono text-[9px] font-black text-white flex items-center justify-center shadow-md select-none transition-all hover:scale-110 hover:-translate-y-1 hover:z-20 cursor-help`}
                  >
                    {avatar.initials}
                  </div>
                  
                  {/* Rich Glassmorphic Tooltip */}
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 opacity-0 transition-all duration-300 group-hover/avatar:opacity-100 group-hover/avatar:translate-y-0 translate-y-1">
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 p-3 shadow-xl backdrop-blur-md text-[9px] font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 min-w-[140px] text-center space-y-0.5">
                      <p className="font-serif text-[10px] normal-case text-zinc-900 dark:text-white leading-none">{avatar.name}</p>
                      <p className="text-[7px] text-zinc-400 dark:text-zinc-500 font-mono tracking-widest">{avatar.role}</p>
                    </div>
                    {/* Tooltip arrow */}
                    <div className="mx-auto h-1.5 w-1.5 -translate-y-1 rotate-45 border-r border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Progress metrics */}
          <div className="space-y-6">
            {STATS_DATA.map((stat) => (
              <div key={stat.label} className="space-y-2">
                <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest">
                  <span className="text-zinc-400 dark:text-zinc-500">{stat.label}</span>
                  <span className="text-zinc-900 dark:text-zinc-100">{stat.val}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800/60 overflow-hidden relative">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${stat.color}`} 
                    style={{ width: stat.label === "Edge Response" ? "12%" : stat.val }} 
                  />
                  {/* Subtle continuous shine animation */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent w-1/2 -skew-x-12 animate-pulse" />
                </div>
              </div>
            ))}
          </div>

          {/* Workspace Traffic Widget */}
          <div className="mt-10 rounded-2xl bg-zinc-900 dark:bg-zinc-950 p-5 text-white shadow-xl relative overflow-hidden group">
            <div className="flex items-center justify-between relative z-10">
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Workspace Traffic</p>
                </div>
                <p className="mt-1 text-2xl font-black font-sans tabular-nums transition-all">
                  {trafficCount.toLocaleString()}{" "}
                  <span className="text-xs font-normal text-zinc-500">req/s</span>
                </p>
              </div>
              
              {/* Sample traffic chart */}
              <div className="flex items-end gap-1.5 h-8">
                {trafficHeights.map((h, i) => (
                  <div 
                    key={i} 
                    className="w-1.5 rounded-t-full bg-gradient-to-t from-emerald-600 to-teal-400 dark:from-emerald-500 dark:to-teal-300 transition-all duration-350 shadow-[0_0_6px_rgba(16,185,129,0.3)] hover:opacity-80 cursor-default" 
                    style={{ height: `${h * 1.5}px` }} 
                    title={`Node ${i + 1}: Active`}
                  />
                ))}
              </div>
            </div>
            {/* Background Grid Pattern for Console vibe */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:10px_10px] -z-10" />
          </div>
        </div>
      </div>
      
      {/* Enhanced Background Glow */}
      <div className="absolute -inset-4 z-0 bg-gradient-to-tr from-blue-200/50 to-emerald-200/50 dark:from-blue-950/15 dark:to-emerald-950/15 blur-3xl opacity-60"></div>
    </div>
  );
}
