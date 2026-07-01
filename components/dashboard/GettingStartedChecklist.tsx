import Link from "next/link";
import { CommandPanel, StatusPill } from "@/components/command";

type GettingStartedChecklistProps = {
  hasApiKey: boolean;
  hasSuccessfulRepositoryAnalysis: boolean;
  hasIndexedRepository: boolean;
  onCreateApiKey: () => void;
};

type ChecklistStatus = "complete" | "next" | "recommended";

type ChecklistAction =
  | {
      label: string;
      href: string;
      external?: boolean;
    }
  | {
      label: string;
      onClick: () => void;
    };

type ChecklistItem = {
  id: string;
  title: string;
  description: string;
  status: ChecklistStatus;
  evidence: string;
  action: ChecklistAction;
};

function CompletionMark({ status }: { status: ChecklistStatus }) {
  const completed = status === "complete";
  const recommended = status === "recommended";

  return (
    <span
      className={[
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition duration-300",
        completed
          ? "animate-in zoom-in-95 border-emerald-300/35 bg-emerald-300/15 text-emerald-200"
          : recommended
          ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-200"
          : "border-zinc-700 bg-zinc-950/70 text-zinc-600",
      ].join(" ")}
      aria-hidden="true"
    >
      {completed ? (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor">
          <path d="M5 12.5l4.2 4.2L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : recommended ? (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor">
          <path d="M12 5v14m7-7H5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <span className="h-2 w-2 rounded-full bg-current" />
      )}
    </span>
  );
}

function ActionButton({ action, completed }: { action: ChecklistAction; completed: boolean }) {
  const className = [
    "inline-flex min-h-10 w-full items-center justify-center rounded-full border px-3 py-2 text-center text-[10px] font-black uppercase tracking-[0.16em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
    completed
      ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100 hover:border-emerald-300/45 hover:bg-emerald-300/15"
      : "border-cyan-300/20 bg-cyan-300/10 text-cyan-100 hover:border-cyan-200/45 hover:bg-cyan-300/15",
  ].join(" ");

  if ("onClick" in action) {
    return (
      <button type="button" onClick={action.onClick} className={className}>
        {action.label}
      </button>
    );
  }

  if (action.external) {
    return (
      <a href={action.href} className={className}>
        {action.label}
      </a>
    );
  }

  return (
    <Link href={action.href} className={className}>
      {action.label}
    </Link>
  );
}

export function GettingStartedChecklist({
  hasApiKey,
  hasSuccessfulRepositoryAnalysis,
  hasIndexedRepository,
  onCreateApiKey,
}: GettingStartedChecklistProps) {
  const items: ChecklistItem[] = [
    {
      id: "api-key",
      title: hasApiKey ? "Choose an API key" : "Create your first API key",
      description: "Use a development or production key so Dandi can track requests against your account.",
      status: hasApiKey ? "complete" : "next",
      evidence: hasApiKey ? "Detected from your saved API keys." : "No saved API key was found yet.",
      action: hasApiKey
        ? { label: "Manage API Keys", href: "#api-keys" }
        : { label: "Create API Key", onClick: onCreateApiKey },
    },
    {
      id: "summary",
      title: "Test a public repository summary",
      description: "Run a public GitHub repository through Playground to confirm the full request path works.",
      status: hasSuccessfulRepositoryAnalysis ? "complete" : "next",
      evidence: hasSuccessfulRepositoryAnalysis
        ? "Detected from usage activity or repository analytics."
        : "No successful repository request is visible yet.",
      action: { label: "Open Playground", href: "/playground?mode=summary" },
    },
    {
      id: "github",
      title: "Connect GitHub for private repositories",
      description: "Add the GitHub App only if you need Dandi to verify access to private repositories.",
      status: "recommended",
      evidence: "Recommended action. Dashboard does not currently verify GitHub connection state.",
      action: { label: "Connect GitHub", href: "/api/integrations/github/start", external: true },
    },
    {
      id: "index",
      title: "Index a repository for Ask",
      description: "Prepare a repository when you want source-backed Ask/RAG answers instead of a summary only.",
      status: hasIndexedRepository ? "complete" : "recommended",
      evidence: hasIndexedRepository
        ? "Detected from a recent completed repository indexing job."
        : "Recommended action. Older indexing history may not be visible from this dashboard.",
      action: { label: "Open Ask Mode", href: "/playground?mode=ask" },
    },
  ];

  const requiredItems = items.filter((item) => item.id === "api-key" || item.id === "summary");
  const completedRequiredCount = requiredItems.filter((item) => item.status === "complete").length;
  const requiredComplete = completedRequiredCount === requiredItems.length;
  const progressPercent = Math.round((completedRequiredCount / requiredItems.length) * 100);

  return (
    <CommandPanel tone={requiredComplete ? "elevated" : "default"} padding="sm" className="rounded-[22px] md:rounded-[24px]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300/75">
              First Run Checklist
            </p>
            <StatusPill tone={requiredComplete ? "success" : "info"} compact>
              {completedRequiredCount} / {requiredItems.length} required done
            </StatusPill>
            {hasIndexedRepository && (
              <StatusPill tone="success" compact>
                Ask indexed
              </StatusPill>
            )}
          </div>
          <h2 className="mt-2 font-serif text-xl font-bold text-white sm:text-2xl">
            {requiredComplete ? "Your first Dandi path is ready." : "Create a key, then run one public repository."}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">
            {requiredComplete
              ? "Keep going from Playground, connect GitHub when private repositories matter, or review usage as activity grows."
              : "These steps use dashboard data where available and mark optional paths as recommendations when completion cannot be proved."}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href="/playground?mode=summary"
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100 transition hover:border-cyan-200/45 hover:bg-cyan-300/15"
          >
            Open Playground
          </Link>
          <Link
            href="/usage"
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100 transition hover:border-emerald-300/45 hover:bg-emerald-300/15"
          >
            View Usage
          </Link>
        </div>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-900 ring-1 ring-white/5">
        <div
          className="h-full rounded-full bg-emerald-300 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-4">
        {items.map((item) => {
          const completed = item.status === "complete";
          const recommended = item.status === "recommended";

          return (
            <div
              key={item.id}
              className={[
                "flex min-h-[190px] flex-col justify-between rounded-2xl border p-4 transition duration-300",
                completed
                  ? "animate-in fade-in zoom-in-95 border-emerald-300/20 bg-emerald-300/[0.06]"
                  : recommended
                    ? "border-cyan-300/15 bg-cyan-300/[0.04] hover:border-cyan-300/25 hover:bg-cyan-300/[0.07]"
                    : "border-zinc-800 bg-zinc-950/45 hover:border-cyan-300/25 hover:bg-zinc-900/55",
              ].join(" ")}
            >
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CompletionMark status={item.status} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{item.title}</h3>
                      <span
                        className={[
                          "inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em]",
                          completed
                            ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
                            : recommended
                              ? "border-cyan-300/20 bg-cyan-300/10 text-cyan-100"
                              : "border-zinc-700 bg-zinc-950/70 text-zinc-400",
                        ].join(" ")}
                      >
                        {completed ? "Done" : recommended ? "Recommended" : "Next"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">{item.description}</p>
                  </div>
                </div>
                <p className="rounded-xl border border-white/5 bg-slate-950/45 p-3 text-[11px] font-medium leading-5 text-slate-500">
                  {item.evidence}
                </p>
              </div>

              <div className="mt-4">
                <ActionButton action={item.action} completed={completed} />
              </div>
            </div>
          );
        })}
      </div>
    </CommandPanel>
  );
}
