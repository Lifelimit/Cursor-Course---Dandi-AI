import Link from "next/link";
import { CommandPanel } from "@/components/command";

type QuickAction = {
  label: string;
  description: string;
  href: string;
  accent: "mint" | "cyan";
  icon: string;
};

const primaryActions: QuickAction[] = [
  {
    label: "Analyze a repository",
    description: "Generate a source-backed repository overview.",
    href: "/playground?mode=summary",
    accent: "mint",
    icon: "M4 5h16M4 12h10M4 19h16M17 10l3 3-3 3",
  },
  {
    label: "Ask Dandi",
    description: "Ask grounded questions about an indexed repository.",
    href: "/playground?mode=ask",
    accent: "cyan",
    icon: "M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-6l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z",
  },
];

function QuickActionCard({ action, dominant = false }: { action: QuickAction; dominant?: boolean }) {
  const accent = action.accent === "mint"
    ? "border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-100 hover:border-emerald-200/50 hover:bg-emerald-300/[0.13]"
    : "border-cyan-300/25 bg-cyan-300/[0.07] text-cyan-100 hover:border-cyan-200/50 hover:bg-cyan-300/[0.12]";

  return (
    <Link href={action.href} className={`group relative flex min-h-36 min-w-0 flex-1 flex-col justify-between overflow-hidden rounded-[24px] border p-5 transition duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${accent} ${dominant ? "shadow-[0_18px_60px_rgba(16,185,129,0.08)]" : ""}`}>
      <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-white/[0.08] blur-3xl transition group-hover:scale-125" />
      <div className="relative flex items-start justify-between gap-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-current/20 bg-black/10">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={action.icon} /></svg>
        </span>
        <span className="text-xl opacity-40 transition group-hover:translate-x-1 group-hover:opacity-100" aria-hidden="true">↗</span>
      </div>
      <div className="relative mt-5 min-w-0">
        <h3 className="truncate text-base font-bold text-white">{action.label}</h3>
        <p className="mt-1 max-w-xs text-xs leading-5 text-slate-300/80">{action.description}</p>
      </div>
    </Link>
  );
}

export function DashboardQuickActions({ githubConnected }: { githubConnected: boolean | null }) {
  return (
    <CommandPanel padding="md" className="relative">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="dandi-type-metadata font-black uppercase text-emerald-300/80">Launchpad</p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl">Start the next workflow</h2>
        </div>
        <p className="max-w-sm text-xs leading-5 text-slate-500 sm:text-right">The fastest path from a repository URL to useful intelligence.</p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {primaryActions.map((action) => <QuickActionCard key={action.label} action={action} dominant />)}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/[0.06] pt-4">
        {githubConnected !== true && (
          <Link href="/account?tab=github" className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/10 px-3.5 text-[9px] font-black uppercase tracking-[0.15em] text-slate-300 transition hover:border-cyan-300/30 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
            Connect GitHub <span aria-hidden="true">↗</span>
          </Link>
        )}
        <Link href="/account?tab=api" className="inline-flex min-h-9 items-center gap-2 rounded-full px-1 text-[9px] font-black uppercase tracking-[0.15em] text-slate-500 transition hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
          Manage API access <span aria-hidden="true">↗</span>
        </Link>
        <Link href="/usage" className="inline-flex min-h-9 items-center gap-2 rounded-full px-1 text-[9px] font-black uppercase tracking-[0.15em] text-slate-500 transition hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
          Usage intelligence <span aria-hidden="true">↗</span>
        </Link>
        <Link href="/billing" className="inline-flex min-h-9 items-center gap-2 rounded-full px-1 text-[9px] font-black uppercase tracking-[0.15em] text-slate-500 transition hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
          Billing <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </CommandPanel>
  );
}
