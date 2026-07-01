"use client";

import type { RefObject } from "react";
import dynamic from "next/dynamic";
import { LoadingStages, type LoadingStage } from "@/components/ui/LoadingStages";
import { GuidedError } from "@/components/ui/GuidedError";
import { CardSkeleton } from "@/components/ui/SkeletonBlocks";
import { MockTerminal } from "@/components/command";
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

      <div ref={requestProgressRef} className="scroll-mt-24">
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
        {requestLogs.length > 0 ? (
          <NetworkLog logs={requestLogs} onShowToast={showToast} />
        ) : (
          <RequestLogIdleShell />
        )}
      </div>
    </>
  );
}

function RequestLogIdleShell() {
  return (
    <MockTerminal title="dandi-request-log v1.0.4" status="idle" maxHeight="48rem">
      <div className="space-y-3">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--command-border)] bg-[var(--command-bg)]/40 px-4 py-3">
          <span className="rounded-full border border-cyan-300/15 bg-cyan-300/[0.08] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-200">
            Request Log
          </span>
        </div>
        <div className="min-h-[120px] rounded-2xl border border-[var(--command-border)] bg-[var(--command-bg)] p-3 font-mono text-xs text-slate-300 sm:p-4">
          <div className="flex flex-col items-center justify-center space-y-2 py-10 text-center">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-600" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Request Log Ready
              </span>
            </div>
            <p className="text-[11px] font-mono leading-relaxed text-slate-600">
              dandi@api:~$ run a repository summary or Ask request to see validation, request, and response steps here.
            </p>
            <div className="mt-2 h-4 w-1.5 animate-pulse bg-slate-600" />
          </div>
        </div>
      </div>
    </MockTerminal>
  );
}
