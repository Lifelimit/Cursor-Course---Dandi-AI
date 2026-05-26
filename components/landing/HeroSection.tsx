"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Session } from "@supabase/supabase-js";

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

export function HeroSection({ session }: { session: Session | null }) {
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
    <header className="relative mx-auto max-w-7xl px-4 pt-20 pb-16 md:px-6 md:pt-56 md:pb-40 overflow-hidden">
      <div className="grid items-center gap-16 xl:grid-cols-2 xl:gap-24">
        
        {/* Left Intro Text Section */}
        <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000 ease-out max-w-2xl mx-auto xl:mx-0 text-center xl:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            API Preview Ready
          </div>
          
          <h1 className="font-serif text-[clamp(1.8rem,8vw,5.5rem)] font-bold leading-[1.1] tracking-tight md:text-8xl md:leading-[1.05]">
            Orchestrate <br className="hidden md:block" />
            <span className="text-zinc-400 italic">your <span className="whitespace-nowrap">Intelligence.</span></span>
          </h1>
          
          <p className="max-w-md text-sm leading-relaxed text-zinc-500 dark:text-zinc-400 md:text-xl mx-auto xl:mx-0">
            The high-performance API layer for summarizing codebases, tracking metadata, and distilling repository insights in seconds.
          </p>
          
          <div className="flex flex-col gap-4 sm:flex-row justify-center xl:justify-start">
            {session ? (
              <Link href="/dashboards" className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-full bg-[#18181b] dark:bg-zinc-100 px-6 py-4 text-sm font-bold uppercase tracking-widest text-white dark:text-zinc-950 shadow-2xl transition-all hover:bg-zinc-800 dark:hover:bg-zinc-200 sm:w-auto md:px-10 md:py-5">
                <span className="relative z-10 text-[9px] sm:text-xs">Go to Dashboard</span>
                <svg viewBox="0 0 24 24" className="relative z-10 h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor">
                  <path d="M5 12h14m-7-7l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            ) : (
              <Link href="/signup" className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-full bg-[#18181b] dark:bg-zinc-100 px-6 py-4 text-sm font-bold uppercase tracking-widest text-white dark:text-zinc-950 shadow-2xl transition-all hover:bg-zinc-800 dark:hover:bg-zinc-200 sm:w-auto md:px-10 md:py-5">
                <span className="relative z-10 text-[9px] sm:text-xs">Initialize Session</span>
                <svg viewBox="0 0 24 24" className="relative z-10 h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor">
                  <path d="M5 12h14m-7-7l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            )}
            {session && (
              <Link href="/playground" className="flex items-center justify-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 sm:w-auto md:px-10 md:py-5 shadow-sm">
                Launch Playground
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6H9.4L11 7.7a1 1 0 0 0-1.4-1.4l-3.3 3.3a1 1 0 0 0 0 1.4l3.3 3.3a1 1 0 0 0 1.4-1.4L9.4 11.7h6.9l-1.6 1.6a1 1 0 0 0 1.4 1.4l3.3-3.3a1 1 0 0 0 0-1.4l-3.3-3.3z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            )}
          </div>

          {/* Code Snippet Component */}
          <div className="group relative w-full max-w-[calc(100vw-2rem)] md:max-w-md overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-[#1e1e1e] dark:bg-zinc-900/80 p-4 md:p-6 shadow-2xl transition-all hover:border-zinc-500/30 mx-auto xl:mx-0">
            <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500/20 border border-amber-500/50"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
                <span className="ml-2 font-mono text-[9px] text-zinc-500 uppercase tracking-widest">api.github-summarizer.js</span>
              </div>
              <div className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[7px] font-bold text-emerald-400 uppercase tracking-tighter">Sample</div>
            </div>
            <pre className="font-mono text-[9px] leading-relaxed text-zinc-400 md:text-sm text-left whitespace-pre-wrap break-all md:break-normal">
              <span className="text-emerald-400">const</span> res = <span className="text-blue-400">await</span> fetch(&quot;/api/github-summarizer&quot;, {"{"}<br />
              {"  "}method: &quot;POST&quot;,<br />
              {"  "}headers: {"{"} &quot;x-api-key&quot;: apiKey {"}"},<br />
              {"  "}body: JSON.stringify({"{"}<br />
              {"    "}githubUrl: &quot;https://github.com/facebook/react&quot;<br />
              {"  "}{"}"})<br />
              {"}"});<br />
              <br />
              <span className="text-emerald-400">const</span> data = <span className="text-blue-400">await</span> res.json();<br />
              console.<span className="text-amber-400">log</span>(data.data.metadata.stars);
            </pre>
          </div>
        </div>

        {/* Right Workspace Mockup Card (Refined & Highly Interactive!) */}
        <div className="relative mt-12 block xl:mt-0 animate-in fade-in zoom-in duration-1000 delay-300 scale-90 sm:scale-100 max-w-xl mx-auto w-full">
          <div className="relative z-10 overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 shadow-[0_32px_64px_-15px_rgba(0,0,0,0.06)] dark:shadow-none transition-all hover:scale-[1.02] hover:-rotate-1">
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
      </div>
    </header>
  );
}
