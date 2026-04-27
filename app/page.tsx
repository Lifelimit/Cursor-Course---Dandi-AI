import Image from "next/image";
import Link from "next/link";
import { auth, signIn, signOut } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-[#f4f2ed] font-sans text-[#18181b] selection:bg-zinc-200">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-zinc-200/50 bg-[#f4f2ed]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#18181b] text-white">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight">DANDI AI</span>
          </div>
          
          <div className="hidden items-center gap-8 text-sm font-medium text-zinc-600 md:flex">
            <Link href="#" className="transition hover:text-[#18181b]">Products</Link>
            <Link href="#" className="transition hover:text-[#18181b]">Documentation</Link>
            <Link href="#" className="transition hover:text-[#18181b]">Pricing</Link>
            <Link href="#" className="transition hover:text-[#18181b]">Changelog</Link>
          </div>

          <div className="flex items-center gap-4">
            {session ? (
              <div className="flex items-center gap-4">
                <Link href="/dashboards" className="text-sm font-medium transition hover:text-zinc-600">Dashboard</Link>
                {session.user?.image && (
                  <Image src={session.user.image} alt="Avatar" width={32} height={32} className="rounded-full border border-zinc-200" />
                )}
              </div>
            ) : (
              <>
                <Link href="/api/auth/signin" className="text-sm font-medium transition hover:text-zinc-600">Log in</Link>
                <form action={async () => { "use server"; await signIn("google", { redirectTo: "/dashboards" }); }}>
                  <button className="rounded-full bg-[#18181b] px-5 py-2 text-sm font-medium text-white transition hover:bg-zinc-800">
                    Get API Key
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative mx-auto max-w-7xl px-6 pt-32 pb-20 md:pt-48 md:pb-32">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div className="max-w-2xl space-y-8">
            <h1 className="font-serif text-6xl font-bold leading-[1.1] tracking-tight md:text-7xl">
              API Infrastructure <br />
              <span className="text-zinc-500 italic">for the Intelligence Age</span>
            </h1>
            <p className="max-w-lg text-lg leading-relaxed text-zinc-600">
              The modern API management platform built for the complexities of modern engineering teams. Distribute, track, and limit keys with researcher-grade precision.
            </p>
            
            <div className="flex flex-col gap-4 sm:flex-row">
              {session ? (
                <Link href="/dashboards" className="flex items-center justify-center gap-2 rounded-full bg-[#18181b] px-8 py-4 text-lg font-medium text-white transition hover:bg-zinc-800">
                  Go to Dashboard →
                </Link>
              ) : (
                <form action={async () => { "use server"; await signIn("google", { redirectTo: "/dashboards" }); }}>
                  <button className="flex w-full items-center justify-center gap-2 rounded-full bg-[#18181b] px-8 py-4 text-lg font-medium text-white transition hover:bg-zinc-800 sm:w-auto">
                    Create API Key →
                  </button>
                </form>
              )}
              <Link href="#" className="flex items-center justify-center rounded-full border border-zinc-300 px-8 py-4 text-lg font-medium transition hover:bg-white/50">
                Read Documentation
              </Link>
            </div>
          </div>

          {/* Floating Card Mockup */}
          <div className="relative lg:block">
            <div className="relative z-10 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2 shadow-2xl shadow-zinc-400/20 transition-transform hover:-translate-y-2 hover:rotate-1">
              <div className="rounded-xl bg-zinc-50 p-6">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Your API Keys</h3>
                  <button className="rounded-md bg-zinc-900 px-3 py-1 text-[10px] font-bold text-white uppercase">Get API Keys</button>
                </div>
                <div className="space-y-4">
                  {[
                    { name: 'Marketing App', usage: '4.2M requests', status: 'Active' },
                    { name: 'User Service', usage: '1.8M requests', status: 'Active' },
                    { name: 'Data Sync', usage: '7.1M requests', status: 'Active' },
                    { name: 'Legacy App', usage: '3.2M requests', status: 'Revoked', color: 'text-red-500' },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-zinc-200 pb-3 last:border-0 last:pb-0">
                      <div>
                        <p className="text-sm font-semibold">{row.name}</p>
                        <p className="font-mono text-[10px] text-zinc-400">dndi_live_a6cDcF12...</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium">{row.usage}</p>
                        <p className={`text-[10px] font-bold uppercase ${row.color || 'text-emerald-500'}`}>{row.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Decorative backgrounds */}
            <div className="absolute -top-10 -right-10 h-64 w-64 rounded-full bg-blue-100/50 blur-3xl"></div>
            <div className="absolute -bottom-10 -left-10 h-64 w-64 rounded-full bg-zinc-200/50 blur-3xl"></div>
          </div>
        </div>
      </main>

      {/* Feature Grid */}
      <section className="mx-auto max-w-7xl px-6 py-20 border-t border-zinc-200">
        <div className="grid gap-12 md:grid-cols-3">
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm border border-zinc-100">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h4 className="text-xl font-bold">Lightning Fast</h4>
            <p className="text-zinc-500 text-sm leading-relaxed">Edge-optimized key validation with sub-10ms latency. Your users won't wait.</p>
          </div>
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm border border-zinc-100">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h4 className="text-xl font-bold">Secure by Default</h4>
            <p className="text-zinc-500 text-sm leading-relaxed">Enterprise-grade encryption and automatic key rotation options included.</p>
          </div>
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm border border-zinc-100">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor">
                <path d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h4 className="text-xl font-bold">Smart Limits</h4>
            <p className="text-zinc-500 text-sm leading-relaxed">Advanced rate limiting and monthly quotas to protect your infrastructure costs.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-7xl px-6 py-12 border-t border-zinc-200 text-center">
        <p className="text-sm text-zinc-400">© 2026 Dandi AI. Built for the modern researcher.</p>
      </footer>
    </div>
  );
}

