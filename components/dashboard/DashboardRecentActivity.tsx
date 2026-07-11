import { CommandPanel, StatusPill } from "@/components/command";
import { formatShortDate } from "@/lib/format";
import type { DashboardRepositoryWork } from "./dashboard-types";

export function DashboardRecentActivity({ works }: { works: DashboardRepositoryWork[] }) {
  const activities = works.slice(0, 5);

  return (
    <CommandPanel padding="md" className="h-full">
      <div>
        <p className="dandi-type-metadata font-black uppercase text-cyan-200/80">Signal log</p>
        <h2 className="mt-2 text-xl font-bold tracking-tight text-white">Recent activity</h2>
      </div>
      {activities.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-white/[0.06] bg-slate-950/25 p-4 text-xs leading-5 text-slate-500">Repository processing events will appear here as your workspace gets moving.</p>
      ) : (
        <ol className="mt-5 space-y-4">
          {activities.map((work, index) => (
            <li key={`${work.id}-${index}`} className="relative flex gap-3">
              {index < activities.length - 1 && <span aria-hidden="true" className="absolute left-[5px] top-4 h-[calc(100%+8px)] w-px bg-white/[0.08]" />}
              <span aria-hidden="true" className={`relative mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${work.status === "failed" ? "bg-rose-300" : work.status === "completed" ? "bg-emerald-300" : "bg-cyan-300"}`} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-xs font-bold text-slate-200">{work.repoName || "Repository workflow"}</p>
                  <StatusPill tone={work.status === "failed" ? "danger" : work.status === "completed" ? "success" : "info"} compact>{work.status}</StatusPill>
                </div>
                <p className="mt-1 text-[11px] leading-5 text-slate-500">{work.status === "completed" ? (work.indexAvailable ? "Repository indexed and ready for Ask." : "Repository summary completed.") : work.status === "failed" ? "Processing stopped and needs a retry." : "Repository workflow is still in progress."}</p>
                <time dateTime={work.updatedAt} className="mt-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-700">{formatShortDate(work.updatedAt)}</time>
              </div>
            </li>
          ))}
        </ol>
      )}
    </CommandPanel>
  );
}
