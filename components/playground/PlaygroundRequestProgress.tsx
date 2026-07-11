"use client";

import type { RefObject } from "react";
import dynamic from "next/dynamic";
import { LoadingStages, type LoadingStage } from "@/components/ui/LoadingStages";
import { GuidedError } from "@/components/ui/GuidedError";
import { CardSkeleton } from "@/components/ui/SkeletonBlocks";
import { CommandPanel, StatusPill } from "@/components/command";
import type { LogEntry } from "@/components/playground/NetworkLog";
import { getErrorGuidance } from "@/lib/error-guidance";

const NetworkLog = dynamic(() => import("@/components/playground/NetworkLog").then((mod) => mod.NetworkLog), {
  loading: () => <CardSkeleton lines={4} className="min-h-[20rem]" />,
});

type PlaygroundMode = "summary" | "rag";

type PlaygroundRequestProgressProps = {
  activeTab: PlaygroundMode;
  requestProgressRef: RefObject<HTMLDivElement | null>;
  shouldShowTopLevelError: boolean;
  errorMessage: string;
  requestLogs: LogEntry[];
  summaryRequestLogs: LogEntry[];
  indexedRequestLogs: LogEntry[];
  isLoadingSummary: boolean;
  isIndexingActive: boolean;
  summaryLoadingStages: LoadingStage[];
  indexingLoadingStages: LoadingStage[];
  showToast: (type: "success" | "error", message: string) => void;
};

export function PlaygroundRequestProgress({
  activeTab,
  requestProgressRef,
  shouldShowTopLevelError,
  errorMessage,
  requestLogs,
  summaryRequestLogs,
  indexedRequestLogs,
  isLoadingSummary,
  isIndexingActive,
  summaryLoadingStages,
  indexingLoadingStages,
  showToast,
}: PlaygroundRequestProgressProps) {
  return (
    <>
      {shouldShowTopLevelError && (
        <GuidedError
          {...getErrorGuidance({
            workflow: activeTab === "rag" ? "repository-chat" : "repository-summary",
            message: errorMessage,
          })}
          technicalDetails={{
            message: errorMessage,
            activeTab,
            requestLogs: requestLogs.filter((entry) => entry.status === "error"),
          }}
        />
      )}

      <div ref={requestProgressRef} className="scroll-mt-24 space-y-4" aria-label="Execution plane">
        {(isLoadingSummary || isIndexingActive || requestLogs.length > 0) && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-200/80">Execution plane</p>
              <p className="mt-1 text-sm font-semibold text-slate-300">Live request lifecycle</p>
            </div>
            <StatusPill tone={shouldShowTopLevelError ? "danger" : isLoadingSummary || isIndexingActive ? "warning" : "success"} compact>
              {shouldShowTopLevelError ? "Needs attention" : isLoadingSummary || isIndexingActive ? "Running" : "Complete"}
            </StatusPill>
          </div>
        )}
        {activeTab === "summary" && (isLoadingSummary || summaryRequestLogs.length > 0) && (
          <LoadingStages
            title={isLoadingSummary ? "Summarizing repository" : "Summary workflow"}
            description="Dandi validates access, reads repository context, and prepares the final summary output."
            stages={summaryLoadingStages}
            className="mb-4"
          />
        )}
        {activeTab === "rag" && (isIndexingActive || indexedRequestLogs.length > 0) && (
          <LoadingStages
            title={isIndexingActive ? "Preparing repository" : "Repository preparation workflow"}
            description="Dandi prepares searchable repository evidence for source-backed questions."
            stages={indexingLoadingStages}
            className="mb-4"
          />
        )}
        <details className="group rounded-2xl border border-white/10 bg-slate-950/35">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-xs font-semibold text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-inset">
            <span className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Developer diagnostics</span>
              <span className="text-slate-500">{requestLogs.length ? `${requestLogs.length} request step${requestLogs.length === 1 ? "" : "s"}` : "Idle until a request starts"}</span>
            </span>
            <span aria-hidden="true" className="text-slate-500 transition-transform group-open:rotate-180">⌄</span>
          </summary>
          <div className="border-t border-white/10 p-3 sm:p-4">
            {requestLogs.length > 0 ? <NetworkLog logs={requestLogs} onShowToast={showToast} /> : <RequestLogIdleShell />}
          </div>
        </details>
      </div>
    </>
  );
}

function RequestLogIdleShell() {
  return (
    <CommandPanel className="border-white/10 bg-slate-950/45 p-4">
      <p className="text-sm font-semibold text-slate-300">No request diagnostics yet.</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">Client-side URL validation stays beside the repository field; no request is logged until a valid workflow begins.</p>
    </CommandPanel>
  );
}
