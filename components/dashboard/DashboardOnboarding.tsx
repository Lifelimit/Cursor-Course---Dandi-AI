import Link from "next/link";
import { CommandPanel, StatusPill } from "@/components/command";
import { ProgressBar } from "@/components/ui/ProgressBar";

type DashboardOnboardingProps = {
  hasRepositoryWork: boolean;
  hasIndexedRepository: boolean;
  hasApiKey: boolean | null;
  hasGithubConnection: boolean | null;
};

export function DashboardOnboarding({ hasRepositoryWork, hasIndexedRepository, hasApiKey, hasGithubConnection }: DashboardOnboardingProps) {
  const productComplete = Number(hasRepositoryWork) + Number(hasIndexedRepository);
  const isComplete = productComplete === 2;

  if (isComplete) {
    return (
      <CommandPanel padding="sm" className="rounded-[22px] md:rounded-[24px]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-300/10 text-emerald-200" aria-hidden="true">✓</span>
            <div className="min-w-0"><p className="text-sm font-bold text-white">Workspace setup complete</p><p className="mt-0.5 truncate text-xs text-slate-500">Your product workflow is ready. Reopen a repository or launch another analysis anytime.</p></div>
          </div>
          <Link href="/docs" className="shrink-0 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 transition hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">Developer docs ↗</Link>
        </div>
      </CommandPanel>
    );
  }

  return (
    <CommandPanel padding="md" className="relative overflow-hidden">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3"><p className="dandi-type-metadata font-black uppercase text-emerald-300/80">Suggested next steps</p><StatusPill tone="info" compact>{productComplete} / 2 core milestones</StatusPill></div>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl">Build your workspace context</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">Dandi works best when it has a repository to understand and an index to ground your questions.</p>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-950 ring-1 ring-white/10 lg:mb-2 lg:w-40" role="progressbar" aria-label="Product workflow setup progress" aria-valuemin={0} aria-valuemax={2} aria-valuenow={productComplete}><ProgressBar value={productComplete * 50} indicatorClassName="text-emerald-300" /></div>
      </div>

      <div className="mt-5 grid gap-2.5 md:grid-cols-2">
        <OnboardingItem complete={hasRepositoryWork} title="Analyze a repository" description="Generate a README-grounded overview from a public GitHub repository." href="/playground?mode=summary" action={hasRepositoryWork ? "Run another analysis" : "Analyze now"} />
        <OnboardingItem complete={hasIndexedRepository} title="Index for Ask" description="Prepare a repository for grounded questions and source-backed answers." href="/playground?mode=ask" action={hasIndexedRepository ? "Open Ask mode" : "Index a repository"} />
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-white/[0.06] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-xs font-bold text-white">Developer track <span className="ml-2 text-[9px] font-black uppercase tracking-[0.14em] text-slate-600">Optional</span></p><p className="mt-1 text-[11px] text-slate-500">{hasApiKey === null ? "API access status is unavailable right now." : hasApiKey ? "API access is configured." : "Create an API key when you are ready to integrate Dandi into your own systems."}</p></div>
        <div className="flex flex-wrap gap-2"><Link href="/account?tab=api" className="inline-flex min-h-9 items-center justify-center rounded-full border border-violet-300/20 bg-violet-300/[0.06] px-3.5 text-[9px] font-black uppercase tracking-[0.15em] text-violet-100 transition hover:border-violet-200/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">{hasApiKey ? "Manage API access" : hasApiKey === null ? "Open API access" : "Set up API access"}</Link><Link href="/docs" className="inline-flex min-h-9 items-center justify-center rounded-full border border-white/10 px-3.5 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 transition hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Read docs</Link></div>
      </div>

      {hasGithubConnection !== true && <p className="mt-3 text-[10px] leading-5 text-slate-600">GitHub connection is optional. Summary, Prepare, and Ask currently read public repositories only.</p>}
    </CommandPanel>
  );
}

function OnboardingItem({ complete, title, description, href, action }: { complete: boolean; title: string; description: string; href: string; action: string }) {
  return <div className={`flex min-w-0 flex-col justify-between rounded-2xl border p-4 ${complete ? "border-emerald-300/15 bg-emerald-300/[0.04]" : "border-white/[0.07] bg-slate-950/25"}`}><div className="flex gap-3"><span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${complete ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200" : "border-cyan-300/20 bg-cyan-300/[0.06] text-cyan-200"}`} aria-hidden="true">{complete ? "✓" : "→"}</span><div className="min-w-0"><h3 className="text-sm font-bold text-white">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div></div><Link href={href} className="mt-4 inline-flex min-h-9 items-center justify-center rounded-full border border-white/10 px-3 text-[9px] font-black uppercase tracking-[0.15em] text-slate-300 transition hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">{action} ↗</Link></div>;
}
