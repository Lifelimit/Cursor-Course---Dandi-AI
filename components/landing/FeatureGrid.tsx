"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";



interface RepoInfo {
  stars: string;
  forks: string;
  license: string;
  version: string;
  summary: string;
  coolFacts: string[];
}

const REPO_DATA: Record<string, RepoInfo> = {
  "facebook/react": {
    stars: "225.4K",
    forks: "45.1K",
    license: "MIT",
    version: "v18.3.1",
    summary: "React is a free and open-source front-end JavaScript library for building component-based user interfaces. It helps developers build reusable interactive UI blocks and manage client state with a component-driven rendering model.",
    coolFacts: [
      "Created by Jordan Walke, a software engineer at Facebook, who released it in 2011.",
      "Pioneered the 'Virtual DOM' paradigm that revolutionized web rendering pipelines.",
      "Serves as the foundation for React Native cross-platform apps."
    ]
  },
  "vercel/next.js": {
    stars: "120.4K",
    forks: "26.1K",
    license: "MIT",
    version: "v15.0.0",
    summary: "Next.js is the leading high-performance React framework. It automates server-side rendering, static site generation, and dynamic client routing, providing developers with out-of-the-box SEO optimizations and asset compression.",
    coolFacts: [
      "Built by Vercel to bypass initial React SEO challenges and slow cold-boots.",
      "Includes a high-speed Rust-based asset compiler called Turbopack.",
      "Handles native API routing, edge middleware execution, and server actions."
    ]
  },
  "tailwindlabs/tailwindcss": {
    stars: "81.2K",
    forks: "4.1K",
    license: "MIT",
    version: "v4.0.0",
    summary: "Tailwind CSS is a modern utility-first stylesheet framework. Instead of maintaining large custom CSS files, developers construct intricate, highly-optimized responsive user interfaces directly in markup via atomic utility classes.",
    coolFacts: [
      "Saves valuable dev cycles by eliminating custom CSS naming conventions.",
      "Employs a custom 'Just-In-Time' compiler that outputs only the styling utility classes actually used.",
      "Built with first-class support for dark modes, grid layouts, and custom themes."
    ]
  }
};

export function FeatureGrid() {
  const [selectedRepo, setSelectedRepo] = useState<string>("facebook/react");
  const [isOrchestrating, setIsOrchestrating] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [typewrittenSummary, setTypewrittenSummary] = useState<string>("");
  const [showResult, setShowResult] = useState<boolean>(false);
  const [activeFactIdx, setActiveFactIdx] = useState<number>(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const typewriterTimer = useRef<NodeJS.Timeout | null>(null);
  const timeoutIds = useRef<NodeJS.Timeout[]>([]);

  // Interactive Live Playground Simulator States & Actions
  const [playgroundState, setPlaygroundState] = useState<"idle" | "running" | "completed">("idle");
  const [playgroundTab, setPlaygroundTab] = useState<"request" | "response">("request");

  const runPlaygroundSimulator = () => {
    if (playgroundState !== "idle") return;
    setPlaygroundState("running");
    setPlaygroundTab("response");

    const tPlay = setTimeout(() => {
      setPlaygroundState("completed");
    }, 900);
    timeoutIds.current.push(tPlay);
  };

  const resetPlaygroundSimulator = () => {
    setPlaygroundState("idle");
    setPlaygroundTab("request");
  };

  // Click outside to close custom feature repository dropdown
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

  const startOrchestration = () => {
    if (isOrchestrating) return;

    setIsOrchestrating(true);
    setLogs([]);
    setTypewrittenSummary("");
    setShowResult(false);
    setActiveFactIdx(0);

    if (typewriterTimer.current) {
      clearInterval(typewriterTimer.current);
    }

    // Clear any existing pending timeouts
    timeoutIds.current.forEach(clearTimeout);
    timeoutIds.current = [];

    // Trigger log sequencing
    const t1 = setTimeout(() => {
      setLogs(prev => [...prev, "[info] dandi: initializing analysis context"]);
    }, 200);
    timeoutIds.current.push(t1);

    const t2 = setTimeout(() => {
      setLogs(prev => [...prev, "[info] github: parsing repository structures & fetching readme.md"]);
    }, 600);
    timeoutIds.current.push(t2);

    const t3 = setTimeout(() => {
      setLogs(prev => [...prev, "[info] engine: preparing structured repository summary"]);
    }, 1000);
    timeoutIds.current.push(t3);

    const t4 = setTimeout(() => {
      setLogs(prev => [...prev, "[success] core: successfully generated repository intelligence"]);
    }, 1400);
    timeoutIds.current.push(t4);

    const t5 = setTimeout(() => {
      setIsOrchestrating(false);
      setShowResult(true);
      
      // Typewriter animation
      const fullText = REPO_DATA[selectedRepo].summary;
      const words = fullText.split(" ");
      let currentWordIdx = 0;
      
      typewriterTimer.current = setInterval(() => {
        if (currentWordIdx < words.length) {
          setTypewrittenSummary(() => words.slice(0, currentWordIdx + 1).join(" "));
          currentWordIdx++;
        } else {
          if (typewriterTimer.current) clearInterval(typewriterTimer.current);
        }
      }, 35);
    }, 1800);
    timeoutIds.current.push(t5);
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (typewriterTimer.current) clearInterval(typewriterTimer.current);
      timeoutIds.current.forEach(clearTimeout);
    };
  }, []);

  const currentRepoInfo = REPO_DATA[selectedRepo];

  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-24 md:py-40">
      <div className="mb-20 space-y-4 text-center md:text-left">
        <h2 className="font-serif text-4xl font-bold md:text-6xl">Architected for <br /> the next generation.</h2>
        <p className="mx-auto max-w-md text-zinc-500 dark:text-zinc-400 md:mx-0">Every component of Dandi is built with a singular focus on performance and reliability.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-6 h-auto">
        {/* Bento Item 1: Click to Orchestrate (Now Interactive!) */}
        <div className="group relative col-span-full lg:col-span-3 overflow-hidden rounded-[32px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-8 md:p-10 transition-all hover:border-zinc-400 dark:hover:border-zinc-700 min-h-[480px] flex flex-col justify-between shadow-sm dark:shadow-none">
          <div className="relative z-10 space-y-5">
            <div className="flex items-center gap-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 shadow-sm border border-emerald-100 dark:border-emerald-900/30">
                <svg viewBox="0 0 24 24" className="h-6 w-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">Intelligent Summary</h3>
                <p className="text-xs text-zinc-400">Interactive API preview</p>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Generate structured repository summaries and analyze metadata directly from a public URL.
            </p>

            {/* Selector and Trigger Control */}
            <div className="flex flex-col lg:flex-row gap-3 pt-2">
              <div ref={dropdownRef} className="relative flex-1 select-none z-30">
                <button
                  type="button"
                  disabled={isOrchestrating}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full text-left appearance-none rounded-full border border-zinc-200 dark:border-zinc-800 bg-[#f4f2ed]/50 dark:bg-zinc-950 pl-5 pr-10 py-3 text-xs font-bold text-zinc-800 dark:text-zinc-200 outline-none transition hover:border-zinc-400 focus:border-zinc-900 dark:focus:border-zinc-100 disabled:opacity-50 hover:shadow-sm active:scale-[0.99] cursor-pointer"
                >
                  {selectedRepo.replace("/", " / ")}
                </button>
                <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                  <svg className={`h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 transition-transform duration-300 ${isDropdownOpen ? "rotate-180 text-emerald-500" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                
                {/* Custom animated dropdown */}
                <div
                  className={`absolute left-0 right-0 top-full mt-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 p-1.5 shadow-xl backdrop-blur-md transition-all duration-355 origin-top transform z-50 ${
                    isDropdownOpen
                      ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                      : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
                  }`}
                >
                  {["facebook/react", "vercel/next.js", "tailwindlabs/tailwindcss"].map((repo) => {
                    const isSelected = selectedRepo === repo;
                    return (
                      <button
                        key={repo}
                        type="button"
                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold text-left transition cursor-pointer ${
                          isSelected
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
                        }`}
                        onClick={() => {
                          setSelectedRepo(repo);
                          setIsDropdownOpen(false);
                          setShowResult(false);
                          setLogs([]);
                          setTypewrittenSummary("");
                        }}
                      >
                        <span>{repo.replace("/", " / ")}</span>
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

              <button
                onClick={startOrchestration}
                disabled={isOrchestrating}
                className="rounded-full bg-zinc-900 dark:bg-zinc-100 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white dark:text-zinc-950 shadow-md hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isOrchestrating ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border border-zinc-400 border-t-white dark:border-t-zinc-950" />
                    Analyzing...
                  </>
                ) : (
                  "Run Preview"
                )}
              </button>
            </div>

            {/* Output Screen Terminal */}
            {(logs.length > 0 || showResult) && (
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-950 dark:bg-zinc-950/80 p-4 sm:p-5 font-mono text-[10px] leading-relaxed shadow-inner">
                {/* Simulated Header */}
                <div className="flex items-center gap-1.5 pb-3 border-b border-zinc-800 mb-3 text-zinc-600">
                  <span className="h-2 w-2 rounded-full bg-zinc-700" />
                  <span className="h-2 w-2 rounded-full bg-zinc-700" />
                  <span className="h-2 w-2 rounded-full bg-zinc-700" />
                  <span className="text-[8px] font-semibold uppercase tracking-widest ml-1 text-zinc-500">dandi-api output sample</span>
                </div>

                {/* Log Outputs */}
                <div className="space-y-1.5 text-zinc-400">
                  {logs.map((log, idx) => (
                    <div key={idx} className="animate-in fade-in slide-in-from-left-2 duration-300">
                      {log}
                    </div>
                  ))}
                </div>

                {/* Response Visual blocks */}
                {showResult && (
                  <div className="pt-2 animate-in fade-in duration-500 space-y-4">
                    {/* Multi Column Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-center">
                      <div>
                        <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">Stars</p>
                        <p className="text-[10px] text-emerald-400 font-bold mt-0.5">{currentRepoInfo.stars}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">Forks</p>
                        <p className="text-[10px] text-zinc-300 font-bold mt-0.5">{currentRepoInfo.forks}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">License</p>
                        <p className="text-[10px] text-zinc-300 font-bold mt-0.5">{currentRepoInfo.license}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">Version</p>
                        <p className="text-[10px] text-blue-400 font-bold mt-0.5">{currentRepoInfo.version}</p>
                      </div>
                    </div>

                    {/* Summary output */}
                    <div>
                      <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Generated Summary</p>
                      <p className="text-zinc-200 text-[10px] leading-relaxed bg-zinc-900/20 border border-zinc-800/40 rounded-xl p-3">
                        {typewrittenSummary}
                      </p>
                    </div>

                    {/* Cool facts selectors */}
                    <div>
                      <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Key Architecture Insights</p>
                      <div className="flex gap-2 mb-2">
                        {currentRepoInfo.coolFacts.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActiveFactIdx(idx)}
                            className={`px-2 py-0.5 rounded text-[8px] font-bold tracking-widest uppercase transition ${
                              activeFactIdx === idx
                                ? "bg-zinc-800 text-white border border-zinc-700"
                                : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                            }`}
                          >
                            Fact #{idx + 1}
                          </button>
                        ))}
                      </div>
                      <p className="text-zinc-400 text-[9px] leading-relaxed italic bg-zinc-900/40 border border-zinc-800/40 rounded-lg p-2.5 min-h-[40px] animate-in fade-in duration-300">
                        &quot;{currentRepoInfo.coolFacts[activeFactIdx]}&quot;
                      </p>
                    </div>

                    {/* Handoff CTA to Playground */}
                    <div className="pt-4 border-t border-zinc-800/60 flex justify-between items-center text-[8px] font-bold uppercase tracking-widest mt-4">
                      <span className="text-zinc-500 italic font-semibold">* Sample preview format</span>
                      <Link 
                        href="/playground" 
                        className="text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
                      >
                        Try in Playground
                        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
                          <path d="M5 12h14m-7-7l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-emerald-50/50 dark:bg-emerald-950/10 transition-transform group-hover:scale-150 -z-10"></div>
        </div>

        {/* Bento Item 2: Active Quota Shield */}
        <div className="group relative col-span-full lg:col-span-3 overflow-hidden rounded-[32px] border border-zinc-200 dark:border-zinc-800 bg-[#18181b] dark:bg-zinc-900 p-6 sm:p-10 text-white transition-all hover:border-zinc-700 min-h-[300px] flex flex-col justify-between shadow-2xl">
          <div className="relative z-10 space-y-4 w-full lg:max-w-[calc(100%-260px)]">
            <h3 className="text-2xl font-bold italic font-serif">Active Quota Shield</h3>
            <p className="text-sm leading-relaxed text-zinc-400 dark:text-zinc-300">Set custom alert thresholds and trigger instant notifications dynamically before your LLM credits run dry.</p>
            
            {/* Real alert channels tag list */}
            <div className="flex flex-wrap gap-2 pt-2 select-none">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/50 px-2 py-1 text-[8px] font-bold text-zinc-300 tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)] animate-pulse" />
                Email Dispatch
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/50 px-2 py-1 text-[8px] font-bold text-zinc-300 tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)] animate-pulse" />
                In-Page Alerts
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/50 px-2 py-1 text-[8px] font-bold text-zinc-300 tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)] animate-pulse" />
                SMS Logs
              </span>
            </div>
          </div>
          
          {/* Floating Glassmorphic Alert Box (Relative on mobile/tablet, absolute on lg desktop screens) */}
          <div className="relative lg:absolute lg:bottom-8 lg:right-6 w-full lg:w-[240px] mt-6 lg:mt-0 rounded-2xl border border-amber-500/20 bg-zinc-950/80 p-4 shadow-xl backdrop-blur-md transition-all duration-500 select-none pointer-events-none group-hover:scale-105 group-hover:border-amber-500/40 opacity-60 group-hover:opacity-100 mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
              </span>
              <span className="text-[8px] font-black uppercase tracking-widest text-amber-500">80% Quota Alert</span>
            </div>
            
            <div className="space-y-2">
              <p className="text-[7.5px] font-mono text-zinc-500 truncate">KEY: dandi_sk_live_8f0a21...</p>
              <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full w-4/5 animate-pulse" />
              </div>
              <div className="flex justify-between text-[7px] font-bold text-zinc-400">
                <span>Usage: 4,000 reqs</span>
                <span>Limit: 5,000 reqs</span>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-zinc-900/60 flex items-center justify-between text-[7.5px] font-bold text-zinc-500">
              <span>Notification:</span>
              <span className="text-emerald-400 flex items-center gap-1 font-sans">
                <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Email Sent
              </span>
            </div>
          </div>
          
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-800/20 via-zinc-900/0 to-transparent pointer-events-none" />
        </div>

        {/* Bento Item 3 (Large): Live Playground */}
        <div className="group relative col-span-full lg:col-span-4 overflow-hidden rounded-[32px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-8 md:p-10 transition-all hover:border-zinc-400 dark:hover:border-zinc-700 min-h-[300px] shadow-sm dark:shadow-none flex flex-col lg:flex-row gap-6 lg:items-center">
          <div className="space-y-4 lg:w-5/12 relative z-10">
            <h3 className="text-2xl font-bold">Live Playground</h3>
            <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">Test your orchestration before you ship. Monitor latency, inspect raw JSON responses, and generate snippets instantly.</p>
          </div>
          
          <div className="lg:w-7/12 relative mt-4 lg:mt-0 h-full">
            {/* Mock IDE */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-[#fbfaf9] dark:bg-zinc-950 shadow-xl overflow-hidden flex flex-col h-[200px] relative transition-transform duration-500 group-hover:-translate-y-2 group-hover:shadow-2xl">
              <div className="flex items-center justify-between px-4 py-2 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-400"></span>
                  <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                  <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                  
                  {/* File title on desktop, tabs on mobile */}
                  <span className="hidden sm:inline ml-2 text-[9px] font-mono text-zinc-400 uppercase tracking-widest">playground.ts</span>
                  
                  {/* Mobile tabs selector */}
                  <div className="flex sm:hidden ml-3 bg-zinc-200 dark:bg-zinc-950 rounded-lg p-0.5 border border-zinc-300/40 dark:border-zinc-900 select-none">
                    <button
                      onClick={() => setPlaygroundTab("request")}
                      className={`px-2 py-0.5 text-[8px] font-bold uppercase rounded-md transition cursor-pointer ${
                        playgroundTab === "request"
                          ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs"
                          : "text-zinc-450 dark:text-zinc-650"
                      }`}
                    >
                      Req
                    </button>
                    <button
                      onClick={() => setPlaygroundTab("response")}
                      className={`px-2 py-0.5 text-[8px] font-bold uppercase rounded-md transition cursor-pointer ${
                        playgroundTab === "response"
                          ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs"
                          : "text-zinc-450 dark:text-zinc-650"
                      }`}
                    >
                      Res
                    </button>
                  </div>
                </div>

                {/* Run / Reset Trigger Action */}
                <div className="flex items-center gap-2">
                  {playgroundState === "idle" && (
                    <button
                      onClick={runPlaygroundSimulator}
                      className="cursor-pointer px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg shadow-sm active:scale-95 transition"
                    >
                      Run
                    </button>
                  )}
                  {playgroundState === "running" && (
                    <button
                      disabled
                      className="px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-zinc-400 bg-zinc-200 dark:bg-zinc-850 dark:text-zinc-650 rounded-lg flex items-center gap-1 select-none"
                    >
                      <span className="h-1.5 w-1.5 animate-spin rounded-full border border-zinc-400 border-t-zinc-600 dark:border-t-zinc-300" />
                      Run
                    </button>
                  )}
                  {playgroundState === "completed" && (
                    <button
                      onClick={resetPlaygroundSimulator}
                      className="cursor-pointer px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 active:scale-95 transition"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex-1 flex font-mono text-[9px] overflow-hidden">
                {/* Left Pane: Code */}
                <div className={`w-full sm:w-1/2 p-3.5 sm:border-r border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 select-none overflow-y-auto ${playgroundTab === "request" ? "block" : "hidden sm:block"}`}>
                  <span className="text-blue-500 dark:text-blue-400">const</span> res = <span className="text-blue-500 dark:text-blue-400">await</span> fetch(<br/>
                  &nbsp;&nbsp;&quot;/api/github-summarizer&quot;,<br/>
                  &nbsp;&nbsp;&#123;<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;method: &quot;POST&quot;,<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;headers: &#123; &quot;x-api-key&quot;: key &#125;,<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;body: JSON.stringify(&#123;<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;githubUrl: &quot;...&quot;<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;&#125;)<br/>
                  &nbsp;&nbsp;&#125;<br/>
                  );
                </div>
                {/* Right Pane: Output */}
                <div className={`w-full sm:w-1/2 p-4 bg-zinc-50 dark:bg-[#111] text-zinc-500 dark:text-zinc-400 relative ${playgroundTab === "response" ? "block" : "hidden sm:block"}`}>
                  {playgroundState === "idle" && (
                    <div className="absolute inset-0 flex flex-col justify-center items-center gap-1.5 p-4 text-center select-none bg-zinc-50 dark:bg-[#111] animate-in fade-in duration-300">
                      <button 
                        onClick={runPlaygroundSimulator}
                        className="cursor-pointer flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20 active:scale-95 transition-all shadow-xs"
                      >
                        <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current ml-0.5">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </button>
                      <p className="text-[7.5px] font-bold uppercase tracking-widest text-zinc-455 dark:text-zinc-650">Ready to Send Request</p>
                      <p className="text-[6.5px] text-zinc-400/70 max-w-[120px] leading-relaxed">Click Run to execute fetch and see response payload.</p>
                    </div>
                  )}

                  {playgroundState === "running" && (
                    <div className="absolute inset-0 flex flex-col justify-center items-center gap-1.5 p-4 text-center select-none bg-zinc-50 dark:bg-[#111] animate-in fade-in duration-300">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-200 dark:border-zinc-800 border-t-emerald-500" />
                      <p className="text-[7.5px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-600 animate-pulse mt-1">Executing fetch...</p>
                    </div>
                  )}

                  {playgroundState === "completed" && (
                    <div className="animate-in slide-in-from-bottom-2 fade-in duration-500">
                      &#123;<br/>
                      &nbsp;&nbsp;&quot;status&quot;: 200,<br/>
                      &nbsp;&nbsp;&quot;data&quot;: &#123;<br/>
                      &nbsp;&nbsp;&nbsp;&nbsp;&quot;stars&quot;: &quot;120.4K&quot;,<br/>
                      &nbsp;&nbsp;&nbsp;&nbsp;&quot;license&quot;: &quot;MIT&quot;<br/>
                      &nbsp;&nbsp;&#125;<br/>
                      &#125;
                    </div>
                  )}
                  
                  {/* Subtle decorative bottom gradient */}
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-zinc-50/80 to-transparent dark:from-[#111]/80 dark:to-transparent pointer-events-none z-10" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bento Item 4: API Developer First */}
        <div className="group relative col-span-full lg:col-span-2 overflow-hidden rounded-[32px] border border-zinc-200 dark:border-zinc-800 bg-[#efebe2] dark:bg-zinc-900/50 p-6 sm:p-10 transition-all hover:border-zinc-400 dark:hover:border-zinc-700 min-h-[300px] flex flex-col justify-between shadow-sm dark:shadow-none">
          <div className="relative z-10 space-y-2 text-left">
            <p className="text-5xl font-black italic font-serif tracking-tighter text-zinc-900 dark:text-zinc-100">API</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400">Developer First</p>
          </div>
          
          <div className="relative z-10 w-full mt-8">
            <div className="bg-zinc-900 dark:bg-zinc-950 text-white rounded-xl p-4 shadow-xl border border-zinc-800 transition-transform duration-500 group-hover:-translate-y-1 group-hover:shadow-2xl">
              <div className="flex gap-1.5 mb-3">
                <div className="h-2 w-2 rounded-full bg-zinc-700" />
                <div className="h-2 w-2 rounded-full bg-zinc-700" />
                <div className="h-2 w-2 rounded-full bg-zinc-700" />
              </div>
              <p className="font-mono text-[9px] leading-relaxed break-all select-none">
                <span className="text-emerald-400">~</span> <span className="text-zinc-300">curl -X POST</span> https://dandi.ai/api/github-summarizer \<br/>
                &nbsp;&nbsp;-H <span className="text-zinc-400">&quot;x-api-key: dandi_sk_...&quot;</span> \<br/>
                &nbsp;&nbsp;-d <span className="text-zinc-400">&#39;&#123;&quot;githubUrl&quot;:&quot;...&quot;&#125;&#39;</span><span className="animate-pulse">_</span>
              </p>
            </div>
          </div>
          
          <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-white/40 dark:bg-zinc-800/20 blur-3xl group-hover:bg-emerald-500/10 transition-colors duration-1000 pointer-events-none" />
        </div>
      </div>
    </section>
  );
}
