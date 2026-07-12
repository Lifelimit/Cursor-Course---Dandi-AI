import Link from "next/link";
import { Session } from "@supabase/supabase-js";
import { WorkspaceMockup } from "./WorkspaceMockup";

export function HeroSection({ session }: { session: Session | null }) {
  return (
    <header className="relative mx-auto max-w-7xl overflow-hidden px-4 pb-12 pt-28 sm:pt-32 md:px-6 md:pb-24 md:pt-36">
      <div className="grid items-center gap-8 xl:grid-cols-2 xl:gap-24">
        
        {/* Left Intro Text Section */}
        <div className="mx-auto max-w-2xl space-y-6 text-center xl:mx-0 xl:text-left">
          <div className="dandi-type-metadata inline-flex max-w-full items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.06] px-3 py-1.5 font-bold uppercase text-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden="true" />
            Repository intelligence for developers
          </div>
          
          <h1 className="dandi-type-display text-[clamp(2.6rem,7vw,5.8rem)] font-bold leading-[0.98] tracking-tight text-white md:text-8xl">
            Understand the code.
            <br />
            <span className="text-slate-400 italic">Ask better questions.</span>
          </h1>
          
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-slate-300/85 md:text-lg xl:mx-0">
            Dandi helps you understand unfamiliar repositories, prepare them once for retrieval, and ask source-backed questions through one developer workspace.
          </p>
          
          <div className="flex w-full max-w-xs flex-col justify-center gap-3 sm:max-w-none sm:flex-row xl:mx-0 xl:justify-start">
            {session ? (
              <Link href="/dashboards" className="dandi-transition group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-emerald-400 px-6 py-3.5 text-xs font-bold text-slate-950 shadow-[var(--dandi-glow-standard)] hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:w-auto sm:px-8">
                <span className="relative z-10">Go to Dashboard</span>
                <svg viewBox="0 0 24 24" className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" aria-hidden="true">
                  <path d="M5 12h14m-7-7l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            ) : (
              <Link href="/signup" className="dandi-transition group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-emerald-400 px-6 py-3.5 text-xs font-bold text-slate-950 shadow-[var(--dandi-glow-standard)] hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:w-auto sm:px-8">
                <span className="relative z-10">Start with a repository</span>
                <svg viewBox="0 0 24 24" className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" aria-hidden="true">
                  <path d="M5 12h14m-7-7l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            )}
            {session && (
              <Link href="/playground" className="dandi-transition flex items-center justify-center gap-2 rounded-2xl border border-[var(--dandi-border-standard)] bg-white/[0.03] px-6 py-3.5 text-xs font-semibold text-slate-300 hover:border-emerald-300/35 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 sm:w-auto sm:px-8">
                Open the Playground
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" aria-hidden="true">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6H9.4L11 7.7a1 1 0 0 0-1.4-1.4l-3.3 3.3a1 1 0 0 0 0 1.4l3.3 3.3a1 1 0 0 0 1.4-1.4L9.4 11.7h6.9l-1.6 1.6a1 1 0 0 0 1.4 1.4l3.3-3.3a1 1 0 0 0 0-1.4l-3.3-3.3z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            )}
          </div>

          <div className="grid max-w-xl grid-cols-3 gap-2 border-y border-[var(--dandi-border-subtle)] py-4 text-left xl:mx-0">
            {["Summarize", "Prepare", "Ask"].map((step, index) => (
              <div key={step} className="min-w-0 pr-2 sm:pr-4">
                <p className="dandi-type-metadata font-bold uppercase text-emerald-200">0{index + 1} / {step}</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--dandi-text-muted)]">{index === 0 ? "See structure." : index === 1 ? "Index once." : "Inspect evidence."}</p>
              </div>
            ))}
          </div>

          {/* Code Snippet Component */}
          <div className="dandi-surface-solid group relative mx-auto w-full max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border p-4 md:max-w-md md:p-5 xl:mx-0">
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
              {"  "}headers: {"{"} &quot;Content-Type&quot;: &quot;application/json&quot;, &quot;x-api-key&quot;: apiKey {"}"},<br />
              {"  "}body: JSON.stringify({"{"}<br />
              {"    "}githubUrl: &quot;https://github.com/facebook/react&quot;<br />
              {"  "}{"}"})<br />
              {"}"});<br />
              <br />
              <span className="text-emerald-400">const</span> summary = <span className="text-blue-400">await</span> res.text();<br />
              <span className="text-emerald-400">const</span> metadata = JSON.parse(atob(<br />
              {"  "}res.headers.get(&quot;x-github-metadata&quot;) ?? &quot;&quot;<br />
              ));<br />
              console.<span className="text-amber-400">log</span>(summary, metadata.metadata.stars);
            </pre>
          </div>
        </div>

        {/* Right Workspace Mockup Card (Refined & Highly Interactive!) */}
        <WorkspaceMockup />
      </div>
    </header>
  );
}
