import { CommandPanel, StatusPill } from "@/components/command";
import { GuidedError } from "@/components/ui/GuidedError";
import { getErrorGuidance } from "@/lib/error-guidance";
import type { LogEntry } from "@/components/playground/NetworkLog";
import type { IndexedRepositoryStats } from "@/hooks/useRepositoryIngestion";

type RepositoryIndexingIntroPanelProps = {
  hasIndexingFailure: boolean;
  errorMessage: string;
  githubUrl: string;
  indexedRepositoryStats: IndexedRepositoryStats | null;
  indexedRequestLogs: LogEntry[];
};

export function RepositoryIndexingIntroPanel({
  hasIndexingFailure,
  errorMessage,
  githubUrl,
  indexedRepositoryStats,
  indexedRequestLogs,
}: RepositoryIndexingIntroPanelProps) {
  return (
    <CommandPanel tone="elevated" className="space-y-5 animate-in fade-in duration-500 p-5 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-300 shadow-[0_0_28px_rgba(52,211,153,0.10)] select-none">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300/70">Repository Q&A</p>
            <h3 className="mt-1 font-serif text-2xl font-bold text-white">Repository Chat</h3>
            <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-slate-300">
              Index a repository once, then ask source-backed questions.
            </p>
          </div>
        </div>
        <StatusPill tone={hasIndexingFailure ? "danger" : "neutral"} compact>
          {hasIndexingFailure ? "Needs retry" : "Not indexed"}
        </StatusPill>
      </div>

      {hasIndexingFailure && (
        <GuidedError
          {...getErrorGuidance({ workflow: "repository-indexing", message: errorMessage })}
          technicalDetails={{
            message: errorMessage || "Process interrupted.",
            repository: githubUrl,
            stats: indexedRepositoryStats,
            requestLogs: indexedRequestLogs.filter((entry) => entry.status === "error"),
          }}
          compact
        />
      )}

      <div className="grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["1", "Index", "Dandi reads eligible code and markdown files."],
          ["2", "Search", "Questions search the prepared repository sections for relevant context."],
          ["3", "Answer", "Responses include matched source files when available."],
          ["4", "Verify", "Use source paths and match scores to inspect the answer basis."],
        ].map(([step, label, detail]) => (
          <div key={label} className="rounded-2xl border border-[var(--command-border)] bg-slate-950/60 p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-300/10 text-[10px] font-black text-emerald-300">{step}</span>
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-200">{label}</span>
            </div>
            <p className="text-[11px] font-medium leading-relaxed text-slate-400">{detail}</p>
          </div>
        ))}
      </div>
      <p className="max-w-2xl text-xs font-medium leading-relaxed text-slate-500">
        Dandi shows confirmed file and chunk counts after indexing completes. The current API does not return a full skipped-file manifest, so unavailable or excluded files are not listed individually.
      </p>
    </CommandPanel>
  );
}
