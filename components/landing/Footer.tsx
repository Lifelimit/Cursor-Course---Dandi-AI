import Link from "next/link";

export function Footer() {
  return (
    <footer className="mx-auto max-w-7xl px-6 py-12 border-t border-zinc-200 dark:border-zinc-800 mt-20">
      <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
        <Link href="/" className="flex items-center gap-2 group cursor-pointer">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 transition-transform group-hover:rotate-12">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-sm font-black tracking-tighter uppercase">Dandi AI</span>
        </Link>
        <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-300 dark:text-zinc-600">© 2026 Dandi AI. Built for the modern researcher.</p>
        <div className="flex gap-6 text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          <Link href="/docs" className="hover:text-zinc-900 dark:hover:text-white transition-colors">API Docs</Link>
        </div>
      </div>
    </footer>
  );
}
