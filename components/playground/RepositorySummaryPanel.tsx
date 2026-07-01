"use client";

import dynamic from "next/dynamic";
import type { Dispatch, SetStateAction } from "react";
import { CommandPanel, LiveIndicator, TabsBar } from "@/components/command";
import { CardSkeleton } from "@/components/ui/SkeletonBlocks";
import { GuidedError } from "@/components/ui/GuidedError";
import { LoadingStages, type LoadingStage } from "@/components/ui/LoadingStages";
import type { LogEntry } from "@/components/playground/NetworkLog";
import { getErrorGuidance } from "@/lib/error-guidance";
import { formatRequestCount } from "@/lib/format";
import type { IndexedRepositoryStats, RepositoryIngestStatus } from "@/hooks/useRepositoryIngestion";

const JsonViewer = dynamic(() => import("@/components/playground/JsonViewer").then((mod) => mod.JsonViewer), {
  loading: () => <CardSkeleton lines={6} className="min-h-[28rem]" />,
});

type RepositoryMetadata = {
  stars: number;
  license: string;
  version: string;
  forks: number;
  description?: string;
};

type RepositorySummaryStatus = "idle" | "streaming" | "success" | "empty" | "error";

type RepositorySummaryResult = {
  summary?: string;
};

type RepositorySummaryPanelProps = {
  viewMode: "visual" | "json";
  setViewMode: Dispatch<SetStateAction<"visual" | "json">>;
  summaryHasData: boolean;
  summaryJsonData: unknown;
  summaryResult: RepositorySummaryResult | undefined;
  summaryFacts: string[];
  repoMetadata: RepositoryMetadata | null;
  isLoadingSummary: boolean;
  summaryStatus: RepositorySummaryStatus;
  streamError: Error | undefined;
  summaryStreamMessage: string;
  summaryIssue: string;
  summaryRequestLogs: LogEntry[];
  summaryLoadingStages: LoadingStage[];
  githubUrl: string;
  getRepoPath: (url: string) => string;
  ingestedRepo: string | null;
  ingestStatus: RepositoryIngestStatus;
  currentIndexStats: IndexedRepositoryStats | null;
  indexedFilesLabel: string;
  indexedChunksLabel: string;
};

export function RepositorySummaryPanel({
  viewMode,
  setViewMode,
  summaryHasData,
  summaryJsonData,
  summaryResult,
  summaryFacts,
  repoMetadata,
  isLoadingSummary,
  summaryStatus,
  streamError,
  summaryStreamMessage,
  summaryIssue,
  summaryRequestLogs,
  summaryLoadingStages,
  githubUrl,
  getRepoPath,
  ingestedRepo,
  ingestStatus,
  currentIndexStats,
  indexedFilesLabel,
  indexedChunksLabel,
}: RepositorySummaryPanelProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsBar
          tabs={[
            { id: "visual", label: "Visual Results", controlsId: "summary-visual-panel" },
            { id: "json", label: "JSON Results", controlsId: "summary-json-panel" },
          ]}
          activeId={viewMode}
          onChange={(id) => setViewMode(id as "visual" | "json")}
          variant="pills"
        />
        {viewMode === "json" && summaryHasData && (
          <button
            type="button"
            onClick={() => {
              const blob = new Blob([JSON.stringify(summaryJsonData, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "summary-result.json";
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-1.5 rounded-full bg-zinc-900 dark:bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white dark:text-zinc-900 transition hover:bg-zinc-800 dark:hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export
          </button>
        )}
      </div>

      {viewMode === "visual" ? (
        <CommandPanel id="summary-visual-panel" role="tabpanel" aria-labelledby="visual-tab" className="p-5 sm:p-8">
          <div className="flex flex-col gap-8 lg:flex-row">
            <div className="min-w-0 flex-1 space-y-6">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300/80">Repository Summary</p>
                <h2 className="font-serif text-3xl font-bold italic text-white">What Dandi Found</h2>
              </div>

              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 rounded-full border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-300 select-none">
                  <LiveIndicator active={isLoadingSummary} tone={summaryStatus === "error" ? "danger" : "success"} />
                  {isLoadingSummary ? "Generating" : summaryStatus === "success" ? "Generated" : "Awaiting Result"}
                </div>
                {repoMetadata && (
                  <>
                    <div className="flex items-center gap-1.5 rounded-full border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-300 select-none">
                      <span className="text-amber-500">★</span>
                      <span>{formatRequestCount(repoMetadata.stars)} Stars</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-300 select-none">
                      <span className="text-zinc-400">⚖</span>
                      <span>{repoMetadata.license}</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-300 select-none">
                      <span className="text-emerald-500 dark:text-emerald-400 font-serif lowercase italic">v</span>
                      <span>{repoMetadata.version}</span>
                    </div>
                  </>
                )}
              </div>

              {(summaryStatus === "empty" || summaryStatus === "error" || streamError) && !summaryHasData && (
                summaryStatus === "empty" && !streamError ? (
                  <div className="rounded-2xl border border-amber-300/25 bg-amber-950/15 p-4 text-sm font-semibold leading-relaxed text-amber-200">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">No summary returned</p>
                    <p className="mt-2">The request completed, but the response did not include summary content.</p>
                    <p className="mt-1 text-xs font-medium text-amber-100/75">Try again, or check the JSON and request log to confirm what the API returned.</p>
                  </div>
                ) : (
                  <GuidedError
                    {...getErrorGuidance({ workflow: "repository-summary", message: summaryStreamMessage })}
                    technicalDetails={{
                      message: summaryStreamMessage || "Streaming failed.",
                      streamError: streamError?.message,
                      summaryIssue,
                      requestLogs: summaryRequestLogs.filter((entry) => entry.status === "error"),
                    }}
                    compact
                  />
                )
              )}

              {summaryResult?.summary ? (
                <p className="text-lg font-medium leading-relaxed text-slate-300">
                  {summaryResult.summary}
                </p>
              ) : isLoadingSummary ? (
                <div className="space-y-4">
                  <LoadingStages
                    title="Summary in progress"
                    description="The answer area is reserved while Dandi analyzes and writes the summary."
                    stages={summaryLoadingStages}
                  />
                  <CardSkeleton lines={4} />
                </div>
              ) : (
                <p className="text-lg font-medium leading-relaxed text-slate-300">
                  {summaryStatus === "empty" && !streamError
                    ? "No summary was returned."
                    : summaryStatus === "error" || streamError
                      ? "The summary could not be displayed. See the alert above for details."
                      : "No repository summary yet. Select Demo Mode or paste an API key, enter a public GitHub URL, then run the summary request."}
                </p>
              )}
            </div>

            <div className="w-full space-y-6 lg:w-80 lg:shrink-0">
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6">
                <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Key Findings</h3>
                {summaryFacts.length > 0 ? (
                  <ul className="space-y-4">
                    {summaryFacts.map((fact, i) => (
                      <li key={i} className="flex gap-3 text-sm font-medium text-zinc-600 dark:text-zinc-300">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-600"></span>
                        {fact}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm font-medium leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {isLoadingSummary
                      ? "Findings will appear as the stream completes."
                      : "Key findings appear after a successful repository summary. Run a summary request to populate this panel."}
                  </p>
                )}
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6">
                <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Result Context</h3>
                <div className="space-y-3 text-sm font-medium text-slate-400">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500">Repository</span>
                    <span className="min-w-0 truncate text-right font-mono text-xs text-slate-200" title={githubUrl}>{githubUrl ? getRepoPath(githubUrl) : "Not set"}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500">Prepared for questions</span>
                    <span className="text-right text-xs font-bold text-slate-200">{ingestedRepo === githubUrl && ingestStatus === "completed" ? "Available" : "Use Ask a Repository"}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500">Evidence</span>
                    <span className="text-right text-xs font-bold text-slate-200">Returned in source-backed answers</span>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6">
                <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Analysis Scope</h3>
                <div className="space-y-3 text-sm font-medium text-slate-400">
                  <div>
                    <p className="text-xs font-bold text-slate-200">What Dandi used</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      Public repository URL, GitHub metadata when available, and the structured summary returned by the API.
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200">What this does not prove</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      Summary mode does not prepare a repository for follow-up questions and does not return a skipped-file manifest. Use Ask a Repository for file/chunk counts and source-backed answers.
                    </p>
                  </div>
                  {currentIndexStats?.status === "completed" && (
                    <div>
                      <p className="text-xs font-bold text-slate-200">Current index</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        {indexedFilesLabel} files were split into {indexedChunksLabel} searchable chunks for this repository.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CommandPanel>
      ) : (
        <div id="summary-json-panel" role="tabpanel" aria-labelledby="json-tab">
          <JsonViewer data={summaryJsonData} />
        </div>
      )}
    </div>
  );
}
