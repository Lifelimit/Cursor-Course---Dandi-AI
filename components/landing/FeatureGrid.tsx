const PULSE_BARS = [1, 2, 3, 4];

export function FeatureGrid() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-24 md:py-40">
      <div className="mb-20 space-y-4 text-center md:text-left">
        <h2 className="font-serif text-4xl font-bold md:text-6xl">Architected for <br /> the next generation.</h2>
        <p className="mx-auto max-w-md text-zinc-500 md:mx-0">Every component of Dandi is built with a singular focus on performance and reliability.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-6 md:grid-rows-2 h-auto md:h-[600px]">
        {/* Bento Item 1 */}
        <div className="group relative col-span-full md:col-span-3 row-span-1 overflow-hidden rounded-[32px] border border-zinc-200 bg-white p-10 transition-all hover:border-zinc-900 min-h-[300px] md:min-h-0">
          <div className="relative z-10 space-y-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-50 shadow-sm border border-zinc-100">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-zinc-900" fill="none" stroke="currentColor">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold">Sub-10ms Latency</h3>
            <p className="max-w-xs text-sm leading-relaxed text-zinc-500">Global edge distribution ensures your keys are validated in the blink of an eye, anywhere on earth.</p>
          </div>
          <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-zinc-50 transition-transform group-hover:scale-150"></div>
        </div>

        {/* Bento Item 2 */}
        <div className="group relative col-span-full md:col-span-3 row-span-1 overflow-hidden rounded-[32px] border border-zinc-200 bg-[#18181b] p-10 text-white transition-all min-h-[300px] md:min-h-0">
          <div className="relative z-10 space-y-4">
            <h3 className="text-2xl font-bold italic font-serif">Secure by Design</h3>
            <p className="max-w-xs text-sm leading-relaxed text-zinc-400">Enterprise-grade encryption with automatic key rotation and zero-trust architecture.</p>
            <div className="flex gap-2 pt-4">
              {PULSE_BARS.map(i => (
                <div key={i} className="h-1 w-8 rounded-full bg-zinc-800 overflow-hidden">
                  <div className="h-full bg-emerald-400 w-1/2 animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute bottom-0 right-0 h-full w-1/2 bg-gradient-to-l from-white/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div>
        </div>

        {/* Bento Item 3 (Large) */}
        <div className="group relative col-span-full md:col-span-4 row-span-1 overflow-hidden rounded-[32px] border border-zinc-200 bg-white p-10 transition-all hover:shadow-xl min-h-[300px] md:min-h-0">
            <div className="flex h-full flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-2xl font-bold">Visual Orchestration</h3>
                <p className="max-w-sm text-sm leading-relaxed text-zinc-500">Manage your entire API ecosystem from a single, beautiful dashboard. Track usage, set quotas, and revoke access with a click.</p>
              </div>
              <div className="mt-8 flex gap-4 overflow-hidden opacity-40 transition-opacity group-hover:opacity-100">
                <div className="h-24 w-32 shrink-0 rounded-xl bg-zinc-100 border border-zinc-200"></div>
                <div className="h-24 w-48 shrink-0 rounded-xl bg-zinc-900 shadow-2xl"></div>
                <div className="h-24 w-32 shrink-0 rounded-xl bg-zinc-100 border border-zinc-200"></div>
              </div>
            </div>
        </div>

        {/* Bento Item 4 */}
        <div className="group relative col-span-full md:col-span-2 row-span-1 overflow-hidden rounded-[32px] border border-zinc-200 bg-[#efebe2] p-10 transition-all min-h-[300px] md:min-h-0">
          <div className="flex h-full flex-col justify-center text-center space-y-4">
            <p className="text-5xl font-black italic font-serif tracking-tighter">100%</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Uptime Record</p>
          </div>
        </div>
      </div>
    </section>
  );
}
