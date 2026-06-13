import Link from "next/link";

export function Footer() {
  return (
    <footer className="mx-auto mt-12 max-w-7xl border-t border-white/10 px-4 py-10 sm:px-6 md:mt-20">
      <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
        <Link href="/" className="flex items-center gap-2 group cursor-pointer">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-100 transition-colors group-hover:border-emerald-300/60">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-sm font-black uppercase tracking-[0.12em] text-white">Dandi AI</span>
        </Link>
        <p className="text-center text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">© 2026 Dandi AI. Built for developers working with repository data.</p>
        <div className="flex gap-6 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          <Link href="/docs" className="transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 rounded">API Docs</Link>
        </div>
      </div>
    </footer>
  );
}
