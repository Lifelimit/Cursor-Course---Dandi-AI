import Link from "next/link";
import { Session } from "@supabase/supabase-js";

const STATS_DATA = [
  { label: "AI Summarization", val: "94%", color: "bg-emerald-500" },
  { label: "Metadata Sync", val: "76%", color: "bg-blue-500" },
  { label: "Edge Response", val: "12ms", color: "bg-zinc-300" },
];

const TRAFFIC_BARS = [4, 7, 5, 9, 6, 8, 4];
const AVATAR_IDS = [1, 2, 3];

export function HeroSection({ session }: { session: Session | null }) {
  return (
    <header className="relative mx-auto max-w-7xl px-4 pt-20 pb-16 md:px-6 md:pt-56 md:pb-40 overflow-hidden">
      <div className="grid items-center gap-16 xl:grid-cols-2 xl:gap-24">
        <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000 ease-out max-w-2xl mx-auto xl:mx-0 text-center xl:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            v1.0 Live on Edge
          </div>
          
          <h1 className="font-serif text-[clamp(1.8rem,8vw,5.5rem)] font-bold leading-[1.1] tracking-tight md:text-8xl md:leading-[1.05]">
            Orchestrate <br className="hidden md:block" />
            <span className="text-zinc-400 italic">your <span className="whitespace-nowrap">Intelligence.</span></span>
          </h1>
          
          <p className="max-w-md text-sm leading-relaxed text-zinc-500 dark:text-zinc-400 md:text-xl mx-auto xl:mx-0">
            The high-performance API layer for summarizing codebases, tracking metadata, and distilling repository insights in seconds.
          </p>
          
          <div className="flex flex-col gap-4 sm:flex-row justify-center xl:justify-start">
            {!session && (
              <Link href="/signup" className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-full bg-[#18181b] dark:bg-zinc-100 px-6 py-4 text-sm font-bold uppercase tracking-widest text-white dark:text-zinc-950 shadow-2xl transition-all hover:bg-zinc-800 dark:hover:bg-zinc-200 sm:w-auto md:px-10 md:py-5">
                <span className="relative z-10 text-[9px] sm:text-xs">Initialize Session</span>
                <svg viewBox="0 0 24 24" className="relative z-10 h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor">
                  <path d="M5 12h14m-7-7l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            )}
            <Link href="/playground" className="flex items-center justify-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 sm:w-auto md:px-10 md:py-5 shadow-sm">
              Launch Playground
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6H9.4L11 7.7a1 1 0 0 0-1.4-1.4l-3.3 3.3a1 1 0 0 0 0 1.4l3.3 3.3a1 1 0 0 0 1.4-1.4L9.4 11.7h6.9l-1.6 1.6a1 1 0 0 0 1.4 1.4l3.3-3.3a1 1 0 0 0 0-1.4l-3.3-3.3z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>

          {/* Code Snippet Component */}
          <div className="group relative w-full max-w-[calc(100vw-2rem)] md:max-w-md overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-[#1e1e1e] dark:bg-zinc-900/80 p-4 md:p-6 shadow-2xl transition-all hover:border-zinc-500/30 mx-auto xl:mx-0">
            <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500/20 border border-amber-500/50"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
                <span className="ml-2 font-mono text-[9px] text-zinc-500 uppercase tracking-widest">dandi.summarize.js</span>
              </div>
              <div className="animate-pulse rounded bg-emerald-500/10 px-1.5 py-0.5 text-[7px] font-bold text-emerald-400 uppercase tracking-tighter">Live</div>
            </div>
            <pre className="font-mono text-[9px] leading-relaxed text-zinc-400 md:text-sm text-left whitespace-pre-wrap break-all md:break-normal">
              <span className="text-emerald-400">const</span> res = <span className="text-blue-400">await</span> dandi.<span className="text-amber-400">summarize</span>(&quot;facebook/react&quot;);<br />
              <br />
              <span className="text-zinc-600">{"// Get instant intelligence"}</span><br />
              console.<span className="text-amber-400">log</span>(res.metadata.stars); <span className="text-zinc-500">{"// 225,402"}</span><br />
              console.<span className="text-amber-400">log</span>(res.summary); <span className="text-zinc-500">{"// \"React is a...\""}</span>
            </pre>
          </div>
        </div>

        {/* Floating Card Mockup */}
        <div className="relative mt-12 block xl:mt-0 animate-in fade-in zoom-in duration-1000 delay-300 scale-90 sm:scale-100 max-w-xl mx-auto w-full">
          <div className="relative z-10 overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 shadow-[0_32px_64px_-15px_rgba(0,0,0,0.1)] dark:shadow-none transition-all hover:scale-[1.02] hover:-rotate-1">
            <div className="rounded-2xl bg-zinc-50/50 dark:bg-zinc-800/50 p-6">
              <div className="mb-8 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Workspace</p>
                  <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Research Labs</h4>
                </div>
                <div className="flex -space-x-2">
                  {AVATAR_IDS.map((i) => (
                    <div key={i} className="h-8 w-8 rounded-full border-2 border-white dark:border-zinc-900 bg-zinc-200 dark:bg-zinc-800" />
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                {STATS_DATA.map((stat) => (
                  <div key={stat.label} className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                      <span className="text-zinc-400 dark:text-zinc-500">{stat.label}</span>
                      <span className="text-zinc-900 dark:text-zinc-100">{stat.val}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div className={`h-full rounded-full ${stat.color}`} style={{ width: stat.label === "Edge Response" ? "12%" : stat.val }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 rounded-2xl bg-zinc-900 dark:bg-zinc-950 p-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-600">Live Traffic</p>
                    <p className="mt-1 text-2xl font-bold">14,204 <span className="text-xs font-normal text-zinc-500 dark:text-zinc-600">req/s</span></p>
                  </div>
                  <div className="flex items-end gap-1">
                    {TRAFFIC_BARS.map((h, i) => (
                      <div key={i} className="w-1 rounded-full bg-emerald-500" style={{ height: `${h * 2}px` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Background Glow for Card */}
          <div className="absolute -inset-4 z-0 bg-gradient-to-tr from-blue-100/50 to-emerald-100/50 dark:from-blue-950/10 dark:to-emerald-950/10 blur-3xl opacity-50"></div>
        </div>
      </div>
    </header>
  );
}
