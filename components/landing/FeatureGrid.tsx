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

  // Interactive playground preview state.
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

    const t1 = setTimeout(() => {
      setLogs(prev => [...prev, "[info] dandi: validating repository request"]);
    }, 200);
    timeoutIds.current.push(t1);

    const t2 = setTimeout(() => {
      setLogs(prev => [...prev, "[info] github: reading repository metadata and README"]);
    }, 600);
    timeoutIds.current.push(t2);

    const t3 = setTimeout(() => {
      setLogs(prev => [...prev, "[info] api: preparing structured repository summary"]);
    }, 1000);
    timeoutIds.current.push(t3);

    const t4 = setTimeout(() => {
      setLogs(prev => [...prev, "[success] api: repository summary generated"]);
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
    <section id="features" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-32">
      <div className="mb-14 space-y-4 text-center md:mb-20 md:text-left">
        <h2 className="font-serif text-4xl font-bold md:text-6xl text-white">Built for fast <br /> repository insight.</h2>
        <p className="mx-auto max-w-xl text-slate-400 md:mx-0">Dandi helps developers summarize repositories, inspect metadata, manage API access, and test requests quickly.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="contents lg:block lg:space-y-6">
        {/* Bento Item 1: Interactive repository summary */}
        <div className="group relative order-1 flex min-h-[480px] flex-col justify-between overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/55 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)] transition-all hover:border-emerald-400/20 sm:p-8 md:p-10">
          <div className="relative z-10 space-y-5">
            <div className="flex items-center gap-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-950/20 border border-emerald-500/20 shadow-sm">
                <svg viewBox="0 0 24 24" className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight text-white">Repository Summary</h3>
                <p className="text-xs text-slate-500">Interactive API preview</p>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-slate-400">
              Generate structured repository summaries and analyze metadata directly from a public URL.
            </p>

            {/* Selector and Trigger Control */}
            <div className="flex flex-col lg:flex-row gap-3 pt-2">
              <div ref={dropdownRef} className="relative flex-1 select-none z-30">
                <button
                  type="button"
                  disabled={isOrchestrating}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  aria-haspopup="listbox"
                  aria-expanded={isDropdownOpen}
                  aria-controls="landing-repo-preview-listbox"
                  aria-label="Select repository preview"
                  className="w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-slate-950 py-3 pl-4 pr-10 text-left text-xs font-bold text-slate-200 outline-none transition hover:border-white/20 focus-visible:border-emerald-300/60 focus-visible:ring-2 focus-visible:ring-emerald-300/30 disabled:opacity-50 active:scale-[0.99]"
                >
                  {selectedRepo.replace("/", " / ")}
                </button>
                <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                  <svg className={`h-3.5 w-3.5 text-slate-500 transition-transform duration-300 ${isDropdownOpen ? "rotate-180 text-emerald-500" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                
                {/* Custom animated dropdown */}
                <div
                  id="landing-repo-preview-listbox"
                  role="listbox"
                  aria-label="Repository preview options"
                  className={`absolute left-0 right-0 top-full z-50 mt-2 origin-top rounded-2xl border border-white/10 bg-slate-950/98 p-1.5 shadow-xl backdrop-blur-sm transition-all duration-200 ${
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
                        role="option"
                        aria-selected={isSelected}
                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold text-left transition cursor-pointer ${
                          isSelected
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "text-slate-400 hover:bg-white/5 hover:text-white"
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
                          <svg viewBox="0 0 24 24" className="h-4 w-4 text-emerald-500 animate-in zoom-in duration-200" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
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
                aria-busy={isOrchestrating || undefined}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-950 shadow-md transition-all hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50"
              >
                {isOrchestrating ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border border-zinc-400 border-t-zinc-950" aria-hidden="true" />
                    Analyzing...
                  </>
                ) : (
                  "Run Preview"
                )}
              </button>
            </div>

            {/* Output Screen Terminal */}
            {(logs.length > 0 || showResult) && (
              <div className="rounded-2xl border border-white/10 bg-slate-950 p-4 font-mono text-[10px] leading-relaxed shadow-inner sm:p-5">
                {/* Simulated Header */}
                <div className="mb-3 flex items-center gap-1.5 border-b border-slate-800 pb-3 text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-zinc-700" />
                  <span className="h-2 w-2 rounded-full bg-zinc-700" />
                  <span className="h-2 w-2 rounded-full bg-zinc-700" />
                  <span className="ml-1 text-[8px] font-semibold uppercase tracking-widest text-slate-500">dandi-api output sample</span>
                </div>

                {/* Log Outputs */}
                <div className="space-y-1.5 text-slate-400">
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
                    <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-center sm:grid-cols-4">
                      <div>
                        <p className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Stars</p>
                        <p className="text-[10px] text-emerald-400 font-bold mt-0.5">{currentRepoInfo.stars}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">Forks</p>
                        <p className="mt-0.5 text-[10px] font-bold text-slate-300">{currentRepoInfo.forks}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-bold uppercase tracking-wider text-slate-500">License</p>
                        <p className="mt-0.5 text-[10px] font-bold text-slate-300">{currentRepoInfo.license}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Version</p>
                        <p className="text-[10px] text-blue-400 font-bold mt-0.5">{currentRepoInfo.version}</p>
                      </div>
                    </div>

                    {/* Summary output */}
                    <div>
                      <p className="mb-1 text-[8px] font-bold uppercase tracking-wider text-slate-500">Generated Summary</p>
                      <p className="rounded-xl border border-slate-800/50 bg-slate-900/25 p-3 text-[10px] leading-relaxed text-slate-200">
                        {typewrittenSummary}
                      </p>
                    </div>

                    {/* Cool facts selectors */}
                    <div>
                      <p className="mb-1 text-[8px] font-bold uppercase tracking-wider text-slate-500">Implementation Notes</p>
                      <div className="flex gap-2 mb-2">
                        {currentRepoInfo.coolFacts.map((_, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveFactIdx(idx)}
                            aria-pressed={activeFactIdx === idx}
                            aria-label={`Show implementation note ${idx + 1}`}
                            className={`px-2 py-0.5 rounded text-[8px] font-bold tracking-widest uppercase transition ${
                              activeFactIdx === idx
                                ? "border border-slate-700 bg-slate-800 text-white"
                                : "border border-transparent text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            Fact #{idx + 1}
                          </button>
                        ))}
                      </div>
                      <p className="min-h-[40px] rounded-lg border border-slate-800/50 bg-slate-900/40 p-2.5 text-[9px] italic leading-relaxed text-slate-400 animate-in fade-in duration-300">
                        &quot;{currentRepoInfo.coolFacts[activeFactIdx]}&quot;
                      </p>
                    </div>

                    {/* Handoff CTA to Playground */}
                      <div className="mt-4 flex flex-col justify-between gap-2 border-t border-slate-800/60 pt-4 text-[8px] font-bold uppercase tracking-widest sm:flex-row sm:items-center">
                      <span className="font-semibold italic text-slate-500">Sample preview format</span>
                      <Link 
                        href="/playground" 
                        className="text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
                      >
                        Try in Playground
                        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" aria-hidden="true">
                          <path d="M5 12h14m-7-7l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="absolute -bottom-10 -right-10 -z-10 h-40 w-40 rounded-full bg-emerald-950/5"></div>
        </div>

        {/* Bento Item 3 (Large): Live Playground */}
        <div className="group relative order-3 flex min-h-[300px] flex-col gap-6 overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/55 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)] transition-all hover:border-emerald-400/20 sm:p-8 md:p-10 lg:flex-row lg:items-center">
          <div className="space-y-4 lg:w-5/12 relative z-10">
            <h3 className="text-2xl font-bold text-white">Live Playground</h3>
            <p className="text-sm leading-relaxed text-slate-400">Test requests before you ship. Inspect raw JSON responses, review request state, and generate snippets quickly.</p>
          </div>
          
          <div className="lg:w-7/12 relative mt-4 lg:mt-0 h-full">
            {/* Mock IDE */}
            <div className="relative flex h-[215px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-xl transition-colors duration-300 group-hover:border-white/15 sm:h-[200px]">
              <div className="flex items-center justify-between border-b border-white/8 bg-slate-900/60 px-4 py-2">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-400"></span>
                  <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                  <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                  
                  {/* File title on desktop, tabs on mobile */}
                  <span className="ml-2 hidden font-mono text-[9px] uppercase tracking-widest text-slate-500 sm:inline">playground.ts</span>
                  
                  {/* Mobile tabs selector */}
                  <div className="flex sm:hidden ml-3 bg-zinc-900 border border-white/5 rounded-lg p-0.5 select-none">
                    <button
                      type="button"
                      onClick={() => setPlaygroundTab("request")}
                      aria-pressed={playgroundTab === "request"}
                      aria-label="Show request preview"
                      className={`px-2 py-0.5 text-[8px] font-bold uppercase rounded-md transition cursor-pointer ${
                        playgroundTab === "request"
                          ? "bg-zinc-800 text-white shadow-xs"
                          : "text-zinc-500"
                      }`}
                    >
                      Req
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlaygroundTab("response")}
                      aria-pressed={playgroundTab === "response"}
                      aria-label="Show response preview"
                      className={`px-2 py-0.5 text-[8px] font-bold uppercase rounded-md transition cursor-pointer ${
                        playgroundTab === "response"
                          ? "bg-zinc-800 text-white shadow-xs"
                          : "text-zinc-500"
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
                      type="button"
                      onClick={runPlaygroundSimulator}
                    aria-label="Run playground preview"
                    className="cursor-pointer rounded-lg bg-emerald-500 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-white shadow-sm transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 active:scale-95"
                    >
                      Run
                    </button>
                  )}
                  {playgroundState === "running" && (
                    <button
                      type="button"
                      disabled
                      aria-busy="true"
                      className="px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-zinc-500 bg-zinc-800 rounded-lg flex items-center gap-1 select-none"
                    >
                      <span className="h-1.5 w-1.5 animate-spin rounded-full border border-zinc-400 border-t-slate-300" aria-hidden="true" />
                      Run
                    </button>
                  )}
                  {playgroundState === "completed" && (
                    <button
                      type="button"
                      onClick={resetPlaygroundSimulator}
                      aria-label="Reset playground preview"
                      className="cursor-pointer rounded-lg border border-white/10 bg-slate-900 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-slate-200 shadow-sm transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 active:scale-95"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex-1 flex font-mono text-[9px] overflow-hidden">
                {/* Left Pane: Code */}
                <div className={`w-full overflow-y-auto p-3 text-slate-400 sm:w-1/2 sm:border-r sm:border-white/8 sm:p-3.5 ${playgroundTab === "request" ? "block" : "hidden sm:block"}`}>
                  <span className="text-blue-400">const</span> res = <span className="text-blue-400">await</span> fetch(<br/>
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
                <div className={`relative w-full bg-slate-950/60 p-3 text-slate-400 sm:w-1/2 sm:p-4 ${playgroundTab === "response" ? "block" : "hidden sm:block"}`}>
                  {playgroundState === "idle" && (
                    <div className="absolute inset-0 flex flex-col justify-center items-center gap-1.5 p-4 text-center select-none bg-zinc-950/60 animate-in fade-in duration-300">
                      <button 
                        type="button"
                        onClick={runPlaygroundSimulator}
                        aria-label="Run request preview"
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 shadow-xs transition-all hover:bg-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 active:scale-95"
                      >
                        <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current ml-0.5" aria-hidden="true">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </button>
                      <p className="text-[7.5px] font-bold uppercase tracking-widest text-zinc-400">Ready to Send Request</p>
                      <p className="text-[6.5px] text-zinc-500/70 max-w-[120px] leading-relaxed">Click Run to execute fetch and see response payload.</p>
                    </div>
                  )}

                  {playgroundState === "running" && (
                    <div className="absolute inset-0 flex flex-col justify-center items-center gap-1.5 p-4 text-center select-none bg-zinc-950/60 animate-in fade-in duration-300">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-800 border-t-emerald-500" aria-hidden="true" />
                      <p className="text-[7.5px] font-bold uppercase tracking-widest text-zinc-500 animate-pulse mt-1">Executing fetch...</p>
                    </div>
                  )}

                  {playgroundState === "completed" && (
                    <div className="animate-in slide-in-from-bottom-2 fade-in duration-500 text-zinc-400">
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
                  <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-8 bg-gradient-to-t from-slate-950 to-transparent" />
                </div>
              </div>
            </div>
          </div>
        </div>

        </div>

        <div className="contents lg:block lg:space-y-6">
        {/* Bento Item 2: Usage Alerts */}
        <div className="group relative order-2 flex min-h-[300px] flex-col justify-between overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/55 p-6 text-white shadow-[0_20px_60px_rgba(0,0,0,0.18)] transition-all hover:border-emerald-400/20 sm:p-10">
          <div className="relative z-10 space-y-4 w-full lg:max-w-[calc(100%-260px)]">
            <h3 className="font-serif text-2xl font-bold">Usage Alerts</h3>
            <p className="text-sm leading-relaxed text-slate-400">Set alert thresholds for API usage and get notified before a project reaches its monthly plan limit.</p>
            
            {/* Real alert channels tag list */}
            <div className="flex flex-wrap gap-2 pt-2 select-none">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900/60 border border-white/5 px-2 py-1 text-[8px] font-bold text-zinc-300 tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)] animate-pulse" />
                Email Alerts
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900/60 border border-white/5 px-2 py-1 text-[8px] font-bold text-zinc-300 tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)] animate-pulse" />
                Dashboard Alerts
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900/60 border border-white/5 px-2 py-1 text-[8px] font-bold text-zinc-300 tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)] animate-pulse" />
                Usage Log
              </span>
            </div>
          </div>
          
          {/* Floating Glassmorphic Alert Box (Relative on mobile/tablet, absolute on lg desktop screens) */}
          <div className="relative mx-auto mt-6 w-full select-none rounded-2xl border border-amber-500/15 bg-slate-950/82 p-4 shadow-xl transition-colors duration-300 group-hover:border-amber-500/30 lg:absolute lg:bottom-8 lg:right-6 lg:mt-0 lg:w-[240px]">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
              </span>
              <span className="text-[8px] font-black uppercase tracking-widest text-amber-500">80% Request Usage Alert</span>
            </div>
            
            <div className="space-y-2">
              <p className="truncate font-mono text-[7.5px] text-slate-500">KEY: dandi_sk_live_8f0a21...</p>
              <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full w-4/5 animate-pulse" />
              </div>
              <div className="flex justify-between text-[7px] font-bold text-slate-500">
                <span>Usage: 4,000 reqs</span>
                <span>Limit: 5,000 reqs</span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-slate-900/70 pt-2 text-[7.5px] font-bold text-slate-500">
              <span>Notification:</span>
              <span className="text-emerald-400 flex items-center gap-1 font-sans">
                <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Email Sent
              </span>
            </div>
          </div>
          
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-800/10 via-zinc-900/0 to-transparent pointer-events-none" />
        </div>

        {/* Bento Item 4: API Developer First */}
        <div className="group relative order-4 flex min-h-[300px] flex-col justify-between overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/55 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)] transition-all hover:border-emerald-400/20 sm:p-10">
          <div className="relative z-10 space-y-2 text-left">
            <p className="text-5xl font-black italic font-serif tracking-tighter text-white">API</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Developer First</p>
          </div>
          
          <div className="relative z-10 w-full mt-8">
            <div className="rounded-xl border border-white/10 bg-slate-900/80 p-4 shadow-xl transition-colors duration-300 group-hover:border-white/15">
              <div className="flex gap-1.5 mb-3">
                <div className="h-2 w-2 rounded-full bg-zinc-700" />
                <div className="h-2 w-2 rounded-full bg-zinc-700" />
                <div className="h-2 w-2 rounded-full bg-zinc-700" />
              </div>
              <p className="break-all font-mono text-[9px] leading-relaxed text-slate-300">
                <span className="text-emerald-400">~</span> <span className="text-zinc-300">curl -X POST</span> https://dandi.ai/api/github-summarizer \<br/>
                &nbsp;&nbsp;-H <span className="text-zinc-400">&quot;x-api-key: dandi_sk_...&quot;</span> \<br/>
                &nbsp;&nbsp;-d <span className="text-zinc-400">&#39;&#123;&quot;githubUrl&quot;:&quot;...&quot;&#125;&#39;</span><span className="animate-pulse">_</span>
              </p>
            </div>
          </div>
          
          <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-emerald-500/5 blur-3xl group-hover:bg-emerald-500/10 transition-colors duration-1000 pointer-events-none" />
        </div>
        </div>
      </div>
    </section>
  );
}
