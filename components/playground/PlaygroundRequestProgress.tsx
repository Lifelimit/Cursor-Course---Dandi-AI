import type { RefObject } from "react";
import { LoadingStages, type LoadingStage } from "@/components/ui/LoadingStages";
import { GuidedError } from "@/components/ui/GuidedError";
import { NetworkLog, type LogEntry } from "@/components/playground/NetworkLog";
import { getErrorGuidance } from "@/lib/error-guidance";

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
        <NetworkLog logs={requestLogs} onShowToast={showToast} />
      </div>
    </>
  );
}
