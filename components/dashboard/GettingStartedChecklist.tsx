import { CommandPanel, StatusPill } from "@/components/command";

type GettingStartedChecklistProps = {
  hasApiKey: boolean;
  hasSuccessfulRepositoryAnalysis: boolean;
  hasAskedRepository: boolean;
  hasReviewedUsage: boolean;
  onCreateApiKey: () => void;
  onOpenSummary: () => void;
  onOpenAskRepository: () => void;
  onOpenUsage: () => void;
  onDismiss: () => void;
};

type ChecklistItem = {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  actionLabel: string;
  onAction: () => void;
};

function CompletionMark({ completed }: { completed: boolean }) {
  return (
    <span
      className={[
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition duration-300",
        completed
          ? "animate-in zoom-in-95 border-emerald-300/35 bg-emerald-300/15 text-emerald-200"
          : "border-zinc-700 bg-zinc-950/70 text-zinc-600",
      ].join(" ")}
      aria-hidden="true"
    >
      {completed ? (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor">
          <path d="M5 12.5l4.2 4.2L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <span className="h-2 w-2 rounded-full bg-current" />
      )}
    </span>
  );
}

export function GettingStartedChecklist({
  hasApiKey,
  hasSuccessfulRepositoryAnalysis,
  hasAskedRepository,
  hasReviewedUsage,
  onCreateApiKey,
  onOpenSummary,
  onOpenAskRepository,
  onOpenUsage,
  onDismiss,
}: GettingStartedChecklistProps) {
  const items: ChecklistItem[] = [
    {
      id: "api-key",
      title: "Create your first API key",
      description: "Use your own key for repository analysis and request tracking.",
      completed: hasApiKey,
      actionLabel: "Create API Key",
      onAction: onCreateApiKey,
    },
    {
      id: "summary",
      title: "Summarize a public repository",
      description: "Get an overview of a repository's structure, purpose, and key components.",
      completed: hasSuccessfulRepositoryAnalysis,
      actionLabel: "Open Playground",
      onAction: onOpenSummary,
    },
    {
      id: "ask",
      title: "Ask a repository a question",
      description: "Index a repository once, then ask source-backed questions.",
      completed: hasAskedRepository,
      actionLabel: "Open Ask Mode",
      onAction: onOpenAskRepository,
    },
    {
      id: "usage",
      title: "Review your usage dashboard",
      description: "Check request usage, limits, and recent activity.",
      completed: hasReviewedUsage,
      actionLabel: "Open Usage Center",
      onAction: onOpenUsage,
    },
  ];

  const completedCount = items.filter((item) => item.completed).length;
  const allComplete = completedCount === items.length;
  const progressPercent = Math.round((completedCount / items.length) * 100);

  return (
    <CommandPanel tone={allComplete ? "elevated" : "default"} padding="sm" className="rounded-[22px] md:rounded-[24px]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300/75">
              Getting Started
            </p>
            <StatusPill tone={allComplete ? "success" : "info"} compact>
              {completedCount} / {items.length} completed
            </StatusPill>
          </div>
          <h2 className="mt-2 font-serif text-xl font-bold text-white sm:text-2xl">
            {allComplete ? "Dandi setup complete" : "Create key, summarize, ask, review usage."}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">
            {allComplete
              ? "You have completed the core Dandi workflow and can keep analyzing repositories from the Playground."
              : "Follow the core Dandi workflow without leaving the dashboard."}
          </p>
        </div>

        {allComplete && (
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex shrink-0 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200 transition hover:border-emerald-200/45 hover:bg-emerald-300/15"
          >
            Dismiss
          </button>
        )}
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-900 ring-1 ring-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {allComplete ? (
        <div className="mt-4 rounded-2xl border border-emerald-300/15 bg-emerald-300/10 p-4 text-sm text-emerald-100">
          Your first setup path is done: key created, repository analyzed, questions enabled, and request usage reviewed.
        </div>
      ) : (
        <div className="mt-4 grid gap-3 lg:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.id}
              className={[
                "flex min-h-[156px] flex-col justify-between rounded-2xl border p-4 transition duration-300",
                item.completed
                  ? "animate-in fade-in zoom-in-95 border-emerald-300/20 bg-emerald-300/[0.06]"
                  : "border-zinc-800 bg-zinc-950/45 hover:border-cyan-300/25 hover:bg-zinc-900/55",
              ].join(" ")}
            >
              <div className="flex items-start gap-3">
                <CompletionMark completed={item.completed} />
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white">{item.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">{item.description}</p>
                </div>
              </div>

              <div className="mt-4">
                {item.completed ? (
                  <span className="inline-flex items-center rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200">
                    Done
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={item.onAction}
                    className="inline-flex w-full items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100 transition hover:border-cyan-200/45 hover:bg-cyan-300/15"
                  >
                    {item.actionLabel}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </CommandPanel>
  );
}
