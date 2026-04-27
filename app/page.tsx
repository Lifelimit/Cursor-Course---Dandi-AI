import Image from "next/image";
import Link from "next/link";
import { auth, signIn } from "@/auth";
import { Navbar } from "@/components/landing/Navbar";

export default async function Home() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-[#f4f2ed] font-sans text-[#18181b] selection:bg-zinc-200 overflow-x-hidden">
      {/* Navigation */}
      <Navbar session={session} />

      {/* Hero Section */}

      {/* Hero Section */}
      <header className="relative mx-auto max-w-7xl px-4 pt-20 pb-16 md:px-6 md:pt-56 md:pb-40 overflow-hidden">
        <div className="grid items-center gap-16 xl:grid-cols-2 xl:gap-24">
          <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000 ease-out max-w-2xl mx-auto xl:mx-0 text-center xl:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/50 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              v1.0 Live on Edge
            </div>
            
            <h1 className="font-serif text-[clamp(1.8rem,8vw,5.5rem)] font-bold leading-[1.1] tracking-tight md:text-8xl md:leading-[1.05]">
              Infrastructure <br className="hidden md:block" />
              <span className="text-zinc-400 italic">for <span className="whitespace-nowrap">Intelligence.</span></span>
            </h1>
            
            <p className="max-w-md text-sm leading-relaxed text-zinc-500 md:text-xl mx-auto xl:mx-0">
              The high-performance API orchestration layer for engineering teams who demand precision and speed.
            </p>
            
            <div className="flex flex-col gap-4 sm:flex-row justify-center xl:justify-start">
              <form action={async () => { "use server"; await signIn("google", { redirectTo: "/dashboards" }); }}>
                <button className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-full bg-[#18181b] px-6 py-4 text-sm font-bold uppercase tracking-widest text-white shadow-2xl transition-all hover:bg-zinc-800 sm:w-auto md:px-10 md:py-5">
                  <span className="relative z-10 text-[9px] sm:text-xs">Initialize Session</span>
                  <svg viewBox="0 0 24 24" className="relative z-10 h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor">
                    <path d="M5 12h14m-7-7l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </form>
            </div>

            {/* Code Snippet Component */}
            <div className="group relative w-full max-w-[calc(100vw-2rem)] md:max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-[#1e1e1e] p-4 md:p-6 shadow-2xl transition-all hover:border-zinc-500/30 mx-auto xl:mx-0">
              <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-500/20 border border-amber-500/50"></div>
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
                  <span className="ml-2 font-mono text-[9px] text-zinc-500 uppercase tracking-widest">dandi.init.js</span>
                </div>
                <div className="animate-pulse rounded bg-emerald-500/10 px-1.5 py-0.5 text-[7px] font-bold text-emerald-400 uppercase tracking-tighter">Live</div>
              </div>
              <pre className="font-mono text-[9px] leading-relaxed text-zinc-400 overflow-x-auto no-scrollbar md:text-sm text-left">
                <span className="text-emerald-400">const</span> dandi = <span className="text-blue-400">await</span> Dandi.<span className="text-amber-400">connect</span>(process.env.DANDI_KEY);<br />
                <br />
                <span className="text-zinc-600">// Validate & track usage instantly</span><br />
                <span className="text-emerald-400">const</span> session = <span className="text-blue-400">await</span> dandi.<span className="text-amber-400">authorize</span>(&#123;<br />
                &nbsp;&nbsp;user: <span className="text-zinc-500">&quot;researcher_01&quot;</span>,<br />
                &nbsp;&nbsp;limit: <span className="text-zinc-500">1000</span><br />
                &#125;);
              </pre>
            </div>
          </div>

          {/* Floating Card Mockup */}
          <div className="relative mt-12 block xl:mt-0 animate-in fade-in zoom-in duration-1000 delay-300 scale-90 sm:scale-100 max-w-xl mx-auto w-full">
            <div className="relative z-10 overflow-hidden rounded-3xl border border-zinc-200 bg-white p-3 shadow-[0_32px_64px_-15px_rgba(0,0,0,0.1)] transition-all hover:scale-[1.02] hover:-rotate-1">
              <div className="rounded-2xl bg-zinc-50/50 p-6">
                <div className="mb-8 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Workspace</p>
                    <h4 className="text-lg font-bold">Project Alpha</h4>
                  </div>
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-8 w-8 rounded-full border-2 border-white bg-zinc-200" />
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  {[
                    { label: "Semantic Search", val: "82%", color: "bg-emerald-500" },
                    { label: "LLM Gateway", val: "44%", color: "bg-blue-500" },
                    { label: "Vector Sync", val: "12%", color: "bg-zinc-300" },
                  ].map((stat) => (
                    <div key={stat.label} className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                        <span className="text-zinc-400">{stat.label}</span>
                        <span className="text-zinc-900">{stat.val}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-zinc-100">
                        <div className={`h-full rounded-full ${stat.color}`} style={{ width: stat.val }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-10 rounded-2xl bg-zinc-900 p-5 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Live Traffic</p>
                      <p className="mt-1 text-2xl font-bold">14,204 <span className="text-xs font-normal text-zinc-500">req/s</span></p>
                    </div>
                    <div className="flex items-end gap-1">
                      {[4, 7, 5, 9, 6, 8, 4].map((h, i) => (
                        <div key={i} className="w-1 rounded-full bg-emerald-500" style={{ height: `${h * 2}px` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Background Glow for Card */}
            <div className="absolute -inset-4 z-0 bg-gradient-to-tr from-blue-100/50 to-emerald-100/50 blur-3xl opacity-50"></div>
          </div>
        </div>
      </header>

      {/* Bento Feature Grid */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:py-40">
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
                {[1,2,3,4].map(i => <div key={i} className="h-1 w-8 rounded-full bg-zinc-800 overflow-hidden"><div className="h-full bg-emerald-400 w-1/2 animate-pulse"></div></div>)}
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

      {/* Pricing Section */}
      <section className="bg-white/50 py-24 md:py-40 backdrop-blur-sm border-y border-zinc-200">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-20 text-center space-y-4">
            <h2 className="font-serif text-4xl font-bold md:text-5xl">Simple, transparent <br /> pricing for builders.</h2>
            <p className="text-zinc-500">Start for free, scale as you grow.</p>
          </div>

          <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
            {/* Hobby Plan */}
            <div className="group rounded-[40px] border border-zinc-200 bg-white p-10 transition-all hover:scale-[1.02]">
              <div className="mb-10 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">The Hobbyist</p>
                <h4 className="text-4xl font-bold">$0<span className="text-sm font-normal text-zinc-400">/mo</span></h4>
              </div>
              <ul className="mb-12 space-y-4 text-sm text-zinc-600">
                <li className="flex items-center gap-3">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor"><path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Up to 1,000 requests / mo
                </li>
                <li className="flex items-center gap-3">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor"><path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  3 Active API Keys
                </li>
                <li className="flex items-center gap-3 opacity-50">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><path d="M18 12H6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Enterprise Security
                </li>
              </ul>
              <button className="w-full rounded-full border border-zinc-200 py-4 text-sm font-bold uppercase tracking-widest transition-colors hover:bg-zinc-50">Get Started</button>
            </div>

            {/* Researcher Plan */}
            <div className="group relative rounded-[40px] border-2 border-zinc-900 bg-white p-10 transition-all hover:scale-[1.02] shadow-2xl">
              <div className="absolute top-6 right-8 rounded-full bg-zinc-900 px-3 py-1 text-[8px] font-black text-white uppercase tracking-widest">Most Popular</div>
              <div className="mb-10 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">The Researcher</p>
                <h4 className="text-4xl font-bold">$25<span className="text-sm font-normal text-zinc-400">/mo</span></h4>
              </div>
              <ul className="mb-12 space-y-4 text-sm text-zinc-600">
                <li className="flex items-center gap-3">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor"><path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Unlimited requests / mo
                </li>
                <li className="flex items-center gap-3">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor"><path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Unlimited Active API Keys
                </li>
                <li className="flex items-center gap-3">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor"><path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Custom Branding & Security
                </li>
              </ul>
              <button className="w-full rounded-full bg-zinc-900 py-4 text-sm font-bold uppercase tracking-widest text-white shadow-xl transition-all hover:bg-zinc-800">Subscribe Now</button>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:py-48 text-center">
        <div className="space-y-10">
          <h2 className="font-serif text-5xl font-bold md:text-8xl">Start building <br /> the future.</h2>
          <form action={async () => { "use server"; await signIn("google", { redirectTo: "/dashboards" }); }}>
            <button className="mx-auto flex items-center justify-center gap-3 rounded-full bg-[#18181b] px-12 py-6 text-sm font-bold uppercase tracking-[0.3em] text-white shadow-2xl transition-all hover:scale-105 hover:bg-zinc-800 active:scale-95">
              Initialize Account
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
                <path d="M12 2v20M2 12h20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Instant Access via Google SSO</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-7xl px-6 py-12 border-t border-zinc-200">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-zinc-900"></div>
            <span className="text-sm font-black tracking-tighter uppercase">Dandi AI</span>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-300">© 2026 Dandi AI. Built for the modern researcher.</p>
          <div className="flex gap-6 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            <Link href="#" className="hover:text-zinc-900 transition-colors">Twitter</Link>
            <Link href="#" className="hover:text-zinc-900 transition-colors">GitHub</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}


