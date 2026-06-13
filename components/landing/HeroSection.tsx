import Link from "next/link";
import { Session } from "@supabase/supabase-js";
import { WorkspaceMockup } from "./WorkspaceMockup";

export function HeroSection({ session }: { session: Session | null }) {
  return (
    <header className="relative mx-auto max-w-7xl overflow-hidden px-4 pb-10 pt-28 md:px-6 md:pb-32 md:pt-48">
      <div className="grid items-center gap-8 xl:grid-cols-2 xl:gap-24">
        
        {/* Left Intro Text Section */}
        <div className="mx-auto max-w-2xl space-y-8 text-center animate-in fade-in slide-in-from-left-8 duration-1000 ease-out xl:mx-0 xl:text-left">
          <div className="inline-flex max-w-full items-center gap-2 rounded-xl border border-emerald-400/10 bg-slate-950/65 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            Repository API for developers
          </div>
          
          <h1 className="font-serif text-[clamp(1.8rem,8vw,5.5rem)] font-bold leading-[1.1] tracking-tight md:text-8xl md:leading-[1.05] text-white">
            The Repository <br className="hidden md:block" />
            <span className="text-slate-400 italic">Insights <span className="whitespace-nowrap">API.</span></span>
          </h1>
          
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-slate-400 md:text-xl xl:mx-0">
            Summarize public repositories, inspect project metadata, and ship GitHub-aware product features through one developer API.
          </p>
          
          <div className="flex flex-col gap-4 sm:flex-row justify-center xl:justify-start max-w-xs sm:max-w-none mx-auto xl:mx-0 w-full">
            {session ? (
              <Link href="/dashboards" className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-emerald-400 px-6 py-4 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-950 shadow-[0_18px_40px_rgba(16,185,129,0.16)] transition-all hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:w-auto sm:text-xs md:px-10 md:py-5">
                <span className="relative z-10">Go to Dashboard</span>
                <svg viewBox="0 0 24 24" className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" aria-hidden="true">
                  <path d="M5 12h14m-7-7l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            ) : (
              <Link href="/signup" className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-emerald-400 px-6 py-4 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-950 shadow-[0_18px_40px_rgba(16,185,129,0.16)] transition-all hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:w-auto sm:text-xs md:px-10 md:py-5">
                <span className="relative z-10">Start Building</span>
                <svg viewBox="0 0 24 24" className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" aria-hidden="true">
                  <path d="M5 12h14m-7-7l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            )}
            {session && (
              <Link href="/playground" className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-950/70 px-6 py-4 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 shadow-sm transition-all hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 sm:w-auto sm:text-xs md:px-10 md:py-5">
                Launch Playground
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" aria-hidden="true">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6H9.4L11 7.7a1 1 0 0 0-1.4-1.4l-3.3 3.3a1 1 0 0 0 0 1.4l3.3 3.3a1 1 0 0 0 1.4-1.4L9.4 11.7h6.9l-1.6 1.6a1 1 0 0 0 1.4 1.4l3.3-3.3a1 1 0 0 0 0-1.4l-3.3-3.3z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            )}
          </div>

          {/* Code Snippet Component */}
          <div className="group relative mx-auto w-full max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/10 bg-slate-950/85 p-4 shadow-2xl shadow-black/20 transition-all hover:border-emerald-400/20 md:max-w-md md:p-6 xl:mx-0">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/8 pb-4">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500/20 border border-amber-500/50"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
                <span className="ml-2 font-mono text-[9px] uppercase tracking-widest text-slate-500">github-summary.ts</span>
              </div>
              <div className="rounded-lg border border-emerald-400/10 bg-emerald-400/10 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider text-emerald-300">Sample</div>
            </div>
            <pre className="overflow-x-auto whitespace-pre text-left font-mono text-[9px] leading-relaxed text-slate-400 md:text-sm">
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
        <WorkspaceMockup />
      </div>
    </header>
  );
}
