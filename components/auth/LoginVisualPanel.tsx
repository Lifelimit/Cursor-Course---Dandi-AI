import Link from "next/link";

const analysisStages = [
  { label: "Reading project structure", detail: "247 files · TypeScript · Next.js", tone: "text-cyan-200" },
  { label: "Architecture summary", detail: "Auth, billing, API routes, shared services", tone: "text-violet-200" },
  { label: "Sources verified", detail: "Ready for grounded questions", tone: "text-emerald-200" },
];

export function LoginVisualPanel() {
  return (
    <section className="command-ambient relative isolate order-2 flex min-h-[430px] flex-col overflow-hidden border-t border-white/8 px-5 py-7 sm:px-8 sm:py-9 lg:order-1 lg:min-h-screen lg:border-t-0 lg:px-[clamp(2rem,6vw,7rem)] lg:py-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(52,211,153,0.06),transparent_42%),radial-gradient(circle_at_20%_75%,rgba(34,211,238,0.08),transparent_32%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 top-1/3 h-64 w-64 rounded-full bg-emerald-300/5 blur-3xl" />

      <div className="relative z-10 flex items-center justify-between gap-4">
        <Link href="/" className="group inline-flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-300/35 bg-emerald-300/10 font-serif text-lg font-bold italic text-emerald-100 shadow-[0_0_20px_rgba(52,211,153,0.12)] transition-colors group-hover:border-emerald-200/70" aria-hidden="true">D</span>
          <span className="dandi-type-display text-sm font-bold tracking-[0.1em] text-white">Dandi AI</span>
          <span className="sr-only">Return to the Dandi homepage</span>
        </Link>
        <span className="dandi-type-metadata hidden items-center gap-2 text-[var(--dandi-text-meta)] sm:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden="true" />
          Repository intelligence
        </span>
      </div>

      <div className="relative z-10 flex flex-1 items-center py-12 lg:py-16">
        <div className="w-full max-w-2xl">
          <p className="dandi-type-metadata mb-5 font-bold uppercase text-emerald-200/80">Understand the source</p>
          <h1 className="dandi-type-display max-w-xl text-[clamp(2.5rem,5.2vw,5.4rem)] font-bold leading-[0.98] tracking-tight text-white">
            Understand any codebase <span className="text-slate-500 italic">in minutes.</span>
          </h1>
          <p className="mt-6 max-w-xl text-sm leading-7 text-slate-300/80 sm:text-base sm:leading-8">
            Summarize repositories, explore indexed code, and ask grounded questions with source-backed answers.
          </p>

          <div className="dandi-surface-elevated dandi-intensity-elevated relative mt-10 overflow-hidden rounded-[26px] p-4 shadow-[var(--dandi-glow-elevated)] sm:p-5">
            <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(52,211,153,0.12),transparent_40%),linear-gradient(135deg,transparent_25%,rgba(34,211,238,0.035),transparent_70%)]" />
            <div className="relative space-y-4">
              <div className="flex items-start justify-between gap-4 border-b border-[var(--dandi-border-standard)] pb-4">
                <div className="min-w-0">
                  <p className="dandi-type-metadata font-bold uppercase text-cyan-200/80">Example analysis</p>
                  <p className="mt-2 truncate font-mono text-sm text-slate-100">github.com/acme/platform</p>
                </div>
                <span className="dandi-type-metadata shrink-0 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 font-bold uppercase text-emerald-200">preview</span>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                {analysisStages.map((stage, index) => (
                  <div key={stage.label} className="relative rounded-xl border border-white/8 bg-black/20 p-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-emerald-300/40 bg-emerald-300/10 text-[10px] font-bold text-emerald-200" aria-hidden="true">{index + 1}</span>
                      <span className={`dandi-type-metadata font-bold uppercase ${stage.tone}`}>{stage.label}</span>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-slate-400">{stage.detail}</p>
                    {index < analysisStages.length - 1 && <span aria-hidden="true" className="command-pipeline-line absolute -right-2 top-1/2 hidden h-px w-4 bg-emerald-300/20 sm:block" />}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--dandi-border-subtle)] pt-4">
                <p className="dandi-type-metadata flex items-center gap-2 font-bold uppercase text-emerald-200/75">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden="true" />
                  Sources verified
                </p>
                <p className="dandi-type-metadata text-[var(--dandi-text-meta)]">Private repositories via GitHub access</p>
              </div>
            </div>
          </div>

          <div className="mt-7 grid max-w-xl grid-cols-3 gap-3 border-y border-white/8 py-4">
            {[
              ["01", "Summarize", "See structure"],
              ["02", "Prepare", "Index once"],
              ["03", "Ask", "Inspect evidence"],
            ].map(([number, title, detail]) => (
              <div key={number} className="min-w-0">
                <p className="dandi-type-metadata font-bold text-emerald-200/75">{number} / {title}</p>
                <p className="mt-1 text-xs text-slate-500">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="relative z-10 dandi-type-metadata hidden text-[var(--dandi-text-meta)] lg:block">A calmer way to work from the source.</p>
    </section>
  );
}
