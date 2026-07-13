import Link from "next/link";
import { CommandPanel, StatusPill } from "@/components/command";
import { formatShortDate } from "@/lib/format";
import type { DashboardRepositoryWork } from "./dashboard-types";
import { getLatestWorkByRepo } from "./repository-work-utils";
import { playgroundRoute, ROUTES } from "@/lib/routes";

function repoLabel(work: DashboardRepositoryWork) {
  if (work.repoName) return work.repoName;
  try {
    const url = new URL(work.repoUrl);
    return url.pathname.replace(/^\//, "").replace(/\.git$/, "") || work.repoUrl;
  } catch {
    return work.repoUrl;
  }
}

function statusMeta(work: DashboardRepositoryWork) {
  if (work.status === "failed") return { label: "Needs attention", tone: "danger" as const, step: work.errorMessage || "Processing failed. Retry this workflow from Playground." };
  if (work.status === "running") return { label: "Processing", tone: "info" as const, step: work.currentStep || "Dandi is processing this repository." };
  if (work.status === "queued") return { label: "Queued", tone: "info" as const, step: "Waiting for the repository workflow to start." };
  if (work.indexAvailable) return { label: "Prepared", tone: "success" as const, step: work.summaryAvailable ? "Summary complete · Ready for grounded questions" : "Ready for grounded questions" };
  return { label: "Summary complete", tone: "success" as const, step: "Repository overview is ready" };
}

function workHref(work: DashboardRepositoryWork, mode: "summary" | "ask" = "ask") {
  return playgroundRoute(mode, work.repoUrl);
}

export function RecentRepositoryWork({ works }: { works: DashboardRepositoryWork[] }) {
  const visibleWorks = getLatestWorkByRepo(works).slice(0, 4);

  return (
    <CommandPanel padding="md" className="h-full">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="dandi-type-metadata font-black uppercase text-violet-200/80">Repository radar</p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl">Continue working</h2>
        </div>
        {visibleWorks.length > 0 && <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">Latest {visibleWorks.length}</span>}
      </div>

      {visibleWorks.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-slate-950/25 p-6 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] text-cyan-200" aria-hidden="true">⌁</div>
          <h3 className="mt-4 text-sm font-bold text-white">No repository work yet</h3>
          <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-slate-500">Analyze a public repository to start building recent repository context.</p>
          <Link href={ROUTES.playgroundSummary} className="mt-5 inline-flex min-h-10 items-center justify-center rounded-full bg-emerald-300 px-4 text-[10px] font-black uppercase tracking-[0.16em] text-slate-950 transition hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">Analyze a repository</Link>
        </div>
      ) : (
        <div className="mt-5 space-y-2.5">
          {visibleWorks.map((work) => {
            const meta = statusMeta(work);
            return (
              <div key={work.id} className="group rounded-2xl border border-white/[0.06] bg-slate-950/30 p-4 transition hover:border-violet-200/25 hover:bg-slate-950/50">
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="min-w-0 truncate text-sm font-bold text-white">{repoLabel(work)}</h3>
                      <StatusPill tone={meta.tone} compact>{meta.label}</StatusPill>
                    </div>
                    <p className="mt-1 truncate font-mono text-[10px] text-slate-600">{work.repoUrl}</p>
                    <p className="mt-2 text-[11px] leading-5 text-slate-400">{meta.step}</p>
                  </div>
                  <time dateTime={work.updatedAt} title={work.updatedAt} className="shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">{formatShortDate(work.updatedAt)}</time>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={workHref(work)} className="inline-flex min-h-8 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-300/[0.08] px-3 text-[9px] font-black uppercase tracking-[0.15em] text-emerald-100 transition hover:border-emerald-200/45 hover:bg-emerald-300/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
                    {work.status === "failed" ? "Retry" : work.indexAvailable ? "Ask Dandi" : "Continue"}
                  </Link>
                  {work.summaryAvailable && <Link href={workHref(work, "summary")} className="inline-flex min-h-8 items-center justify-center rounded-full border border-white/10 px-3 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 transition hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">View summary</Link>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </CommandPanel>
  );
}
