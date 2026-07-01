import type { IndexedRepositoryStats, RepositoryIngestStatus } from "@/hooks/useRepositoryIngestion";
import type { PlaygroundMode, PlaygroundStatusTone, TransparencyRow } from "./types";

export function buildTransparencyRows({
  activeTab,
  githubUrl,
  ingestStatus,
  hasIndexedCounts,
  indexedFilesLabel,
  indexedChunksLabel,
  hasIndexingFailure,
  currentIndexStats,
  hasSourceEvidence,
  retrievalAttempted,
  getRepoPath,
}: {
  activeTab: PlaygroundMode;
  githubUrl: string;
  ingestStatus: RepositoryIngestStatus;
  hasIndexedCounts: boolean;
  indexedFilesLabel: string;
  indexedChunksLabel: string;
  hasIndexingFailure: boolean;
  currentIndexStats: IndexedRepositoryStats | null;
  hasSourceEvidence: boolean;
  retrievalAttempted: boolean;
  getRepoPath: (url: string) => string;
}): TransparencyRow[] {
  return [
    {
      label: "Analyzed",
      value: githubUrl ? getRepoPath(githubUrl) : "No repository",
      detail: activeTab === "summary"
        ? "The summary request uses the public GitHub repository URL, repository metadata, and the summarizer response returned by the API."
        : "Ask a Repository uses the public GitHub repository URL and eligible files selected for source-backed answers.",
    },
    {
      label: "Indexed",
      value: ingestStatus === "completed" && hasIndexedCounts ? `${indexedFilesLabel} files / ${indexedChunksLabel} chunks` : hasIndexingFailure ? "Failed" : "Not indexed yet",
      detail: ingestStatus === "completed"
        ? "These counts come from the completed preparation job. They describe searchable chunks available for questions."
        : hasIndexingFailure
          ? currentIndexStats?.error || "Repository preparation did not complete. Source-backed answers are not available for this repository."
          : "This repository has not been prepared yet. Index it once to ask source-backed questions.",
    },
    {
      label: "Not indexed",
      value: "Not fully enumerated",
      detail: "The current API does not return a skipped-file manifest or branch-by-branch coverage, so Dandi only shows confirmed indexed counts when ingestion completes.",
    },
    {
      label: "Evidence",
      value: hasSourceEvidence ? "Sources returned" : retrievalAttempted ? "No sources returned" : "Not requested",
      detail: hasSourceEvidence
        ? "Matched source files are shown under the answer and come from response metadata."
        : retrievalAttempted
          ? "The answer streamed, but the API did not return source metadata. Treat it as uncited."
          : "Ask a question after indexing to see whether Dandi returns source evidence.",
    },
  ];
}

export function buildTransparencyStatus({
  activeTab,
  ingestStatus,
  isPipelineActive,
  hasPipelineError,
}: {
  activeTab: PlaygroundMode;
  ingestStatus: RepositoryIngestStatus;
  isPipelineActive: boolean;
  hasPipelineError: boolean;
}): { tone: PlaygroundStatusTone; label: string } {
  const tone: PlaygroundStatusTone =
    isPipelineActive
      ? "warning"
      : hasPipelineError
        ? "danger"
        : activeTab === "rag"
          ? ingestStatus === "completed" ? "success" : "neutral"
          : "info";

  const label =
    isPipelineActive
      ? "Updating"
      : hasPipelineError
        ? "Needs review"
        : activeTab === "rag"
          ? ingestStatus === "completed" ? "Indexed" : "Not indexed"
          : "Tracked";

  return { tone, label };
}
