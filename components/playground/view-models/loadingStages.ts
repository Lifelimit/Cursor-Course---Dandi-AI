import type { LoadingStage } from "@/components/ui/LoadingStages";
import type { LogEntry } from "@/components/playground/NetworkLog";
import type { ChatProgressStep } from "@/hooks/useRepositoryChat";
import type { IndexedRepositoryStats, RepositoryIngestStatus } from "@/hooks/useRepositoryIngestion";
import { formatRequestCount } from "@/lib/format";
import type { RepositoryMetadata, RepositorySummaryStatus, ModeLogStatus } from "./types";

export const getModeLogStatus = (logs: LogEntry[], id: string): ModeLogStatus => {
  const log = logs.find((entry) => entry.id === id);
  if (!log) return "idle";
  if (log.status === "pending") return "active";
  if (log.status === "success") return "done";
  return "error";
};

export function buildSummaryLoadingStages({
  githubUrl,
  repoMetadata,
  summaryRequestLogs,
  summaryStatus,
  summaryHasData,
  isLoadingSummary,
  getRepoPath,
}: {
  githubUrl: string;
  repoMetadata: RepositoryMetadata | null;
  summaryRequestLogs: LogEntry[];
  summaryStatus: RepositorySummaryStatus;
  summaryHasData: boolean;
  isLoadingSummary: boolean;
  getRepoPath: (url: string) => string;
}): LoadingStage[] {
  const summaryAuthStage = getModeLogStatus(summaryRequestLogs, "auth");
  const summaryRepoStage = getModeLogStatus(summaryRequestLogs, "repo_fetch");
  const summaryAiStage = getModeLogStatus(summaryRequestLogs, "ai_processing");

  return [
    {
      id: "summary-url",
      label: "Validating repository URL",
      detail: githubUrl ? getRepoPath(githubUrl) : "Waiting for a GitHub URL",
      status: summaryRequestLogs.length > 0 || isLoadingSummary || summaryHasData ? "done" : "idle",
    },
    {
      id: "summary-access",
      label: "Checking access & limits",
      detail: "Validating API key and request limit",
      status: summaryAuthStage,
    },
    {
      id: "summary-metadata",
      label: "Fetching repository metadata",
      detail: repoMetadata ? `${formatRequestCount(repoMetadata.stars)} stars · ${repoMetadata.license}` : "Reading public GitHub metadata",
      status: summaryRepoStage,
    },
    {
      id: "summary-structure",
      label: "Analyzing repository structure",
      detail: "Preparing files and repository context",
      status: summaryAiStage === "active" ? "active" : summaryAiStage === "done" || summaryHasData ? "done" : summaryAiStage,
    },
    {
      id: "summary-generate",
      label: "Generating summary",
      detail: "Creating the structured Dandi response",
      status: summaryStatus === "success" ? "done" : summaryStatus === "error" || summaryStatus === "empty" ? "error" : isLoadingSummary ? "active" : "idle",
    },
    {
      id: "summary-finalize",
      label: "Finalizing results",
      detail: "Preparing visual and JSON outputs",
      status: summaryStatus === "success" ? "done" : summaryStatus === "error" || summaryStatus === "empty" ? "error" : isLoadingSummary && summaryAiStage === "done" ? "active" : "idle",
    },
  ];
}

export function buildIndexingLoadingStages({
  githubUrl,
  indexedRequestLogs,
  currentIndexStats,
  indexedFilesLabel,
  indexedChunksLabel,
  ingestStatus,
  hasIndexingFailure,
  getRepoPath,
}: {
  githubUrl: string;
  indexedRequestLogs: LogEntry[];
  currentIndexStats: IndexedRepositoryStats | null;
  indexedFilesLabel: string;
  indexedChunksLabel: string;
  ingestStatus: RepositoryIngestStatus;
  hasIndexingFailure: boolean;
  getRepoPath: (url: string) => string;
}): LoadingStage[] {
  const indexedAuthStage = getModeLogStatus(indexedRequestLogs, "auth");
  const indexedRepoStage = getModeLogStatus(indexedRequestLogs, "repo_fetch");
  const indexedAiStage = getModeLogStatus(indexedRequestLogs, "ai_processing");

  return [
    {
      id: "index-validate",
      label: "Validating repository",
      detail: githubUrl ? getRepoPath(githubUrl) : "Waiting for repository URL",
      status: indexedAuthStage,
    },
    {
      id: "index-read",
      label: "Reading repository contents",
      detail: "Starting ingestion and repository traversal",
      status: indexedRepoStage,
    },
    {
      id: "index-chunks",
      label: "Creating searchable chunks",
      detail: currentIndexStats?.filesCount ? `${indexedFilesLabel} files selected` : "Splitting eligible files into searchable sections",
      status: ingestStatus === "crawling" ? "active" : ingestStatus === "embedding" || ingestStatus === "completed" ? "done" : hasIndexingFailure ? "error" : "idle",
    },
    {
      id: "index-embeddings",
      label: "Generating embeddings",
      detail: "Encoding chunks for semantic search",
      status: ingestStatus === "embedding" ? "active" : ingestStatus === "completed" ? "done" : hasIndexingFailure && indexedAiStage === "error" ? "error" : "idle",
    },
    {
      id: "index-store",
      label: "Preparing repository for questions",
      detail: currentIndexStats?.chunksCount ? `${indexedChunksLabel} searchable chunks` : "Saving chunks and vector index",
      status: ingestStatus === "completed" ? "done" : ingestStatus === "embedding" ? "active" : hasIndexingFailure ? "error" : "idle",
    },
    {
      id: "index-ready",
      label: "Repository ready",
      detail: "Questions can now use repository evidence",
      status: ingestStatus === "completed" ? "done" : hasIndexingFailure ? "error" : "idle",
    },
  ];
}

export function buildChatLoadingStages(chatProgressStep: ChatProgressStep): LoadingStage[] {
  return [
    {
      id: "chat-search",
      label: "Searching repository",
      detail: "Finding indexed chunks related to your question",
      status: chatProgressStep === "searching" ? "active" : ["ranking", "context", "answer", "sources"].includes(chatProgressStep) ? "done" : "idle",
    },
    {
      id: "chat-rank",
      label: "Ranking relevant chunks",
      detail: "Prioritizing strongest source matches",
      status: chatProgressStep === "ranking" ? "active" : ["context", "answer", "sources"].includes(chatProgressStep) ? "done" : "idle",
    },
    {
      id: "chat-context",
      label: "Building context",
      detail: "Preparing evidence for the answer",
      status: chatProgressStep === "context" ? "active" : ["answer", "sources"].includes(chatProgressStep) ? "done" : "idle",
    },
    {
      id: "chat-answer",
      label: "Generating answer",
      detail: "Streaming the response into the chat",
      status: chatProgressStep === "answer" ? "active" : chatProgressStep === "sources" ? "done" : "idle",
    },
    {
      id: "chat-sources",
      label: "Preparing sources",
      detail: "Attaching source evidence when useful",
      status: chatProgressStep === "sources" ? "active" : "idle",
    },
  ];
}
