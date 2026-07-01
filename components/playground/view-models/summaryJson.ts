import type { ApiKey } from "@/types/api";
import type { IndexedRepositoryStats, RepositoryIngestStatus } from "@/hooks/useRepositoryIngestion";
import type { LatencyRow, RepositoryMetadata, RepositorySummaryResult, RepositorySummaryStatus, TransparencyRow } from "./types";
import type { PipelineFlowStep } from "@/components/command";

export function buildSummaryJsonData({
  activeKeyData,
  githubUrl,
  repoMetadata,
  summaryResult,
  summaryFacts,
  summaryHasData,
  isLoadingSummary,
  summaryStatus,
  summaryStreamMessage,
  ingestedRepo,
  ingestStatus,
  hasSourceEvidence,
  retrievalAttempted,
  currentIndexStats,
  hasIndexingFailure,
  isPipelineActive,
  hasPipelineError,
  transparencyRows,
  pipelineSteps,
  summaryProcessingSteps,
  lifecycleSteps,
  latencyRows,
  getRepoPath,
}: {
  activeKeyData: ApiKey | undefined;
  githubUrl: string;
  repoMetadata: RepositoryMetadata | null;
  summaryResult: RepositorySummaryResult | undefined;
  summaryFacts: string[];
  summaryHasData: boolean;
  isLoadingSummary: boolean;
  summaryStatus: RepositorySummaryStatus;
  summaryStreamMessage: string;
  ingestedRepo: string | null;
  ingestStatus: RepositoryIngestStatus;
  hasSourceEvidence: boolean;
  retrievalAttempted: boolean;
  currentIndexStats: IndexedRepositoryStats | null;
  hasIndexingFailure: boolean;
  isPipelineActive: boolean;
  hasPipelineError: boolean;
  transparencyRows: TransparencyRow[];
  pipelineSteps: PipelineFlowStep[];
  summaryProcessingSteps: PipelineFlowStep[];
  lifecycleSteps: PipelineFlowStep[];
  latencyRows: LatencyRow[];
  getRepoPath: (url: string) => string;
}): unknown {
  return summaryHasData
    ? {
        success: true,
        message: `Successfully summarized ${githubUrl || "repository"}`,
        data: {
          owner: activeKeyData?.name || "API Key Owner",
          repo: githubUrl || "",
          metadata: repoMetadata || {},
          summary: summaryResult?.summary || "",
          cool_facts: summaryFacts,
          repository: {
            url: githubUrl || "",
            path: githubUrl ? getRepoPath(githubUrl) : "",
            metadata: repoMetadata || null,
          },
          result: {
            status: isLoadingSummary ? "generating" : summaryStatus === "success" ? "generated" : "awaiting_result",
            summary: summaryResult?.summary || "",
            key_findings: summaryFacts,
          },
          result_context: {
            searchable_index: ingestedRepo === githubUrl && ingestStatus === "completed" ? "available" : "use_indexed_q_and_a",
            evidence: hasSourceEvidence ? "sources_returned" : retrievalAttempted ? "no_sources_returned" : "returned_in_source_backed_answers",
          },
          analysis_scope: {
            used: [
              "Public repository URL",
              "GitHub metadata when available",
              "Structured summary returned by the API",
            ],
            limitations: [
              "Summary mode does not prepare a repository for follow-up questions.",
              "Summary mode does not return a skipped-file manifest.",
              "Use Ask a Repository for file/chunk counts and source-backed answers.",
            ],
            current_index: currentIndexStats?.status === "completed"
              ? {
                  status: "completed",
                  files: currentIndexStats.filesCount ?? null,
                  chunks: currentIndexStats.chunksCount ?? null,
                  indexed_file_count: currentIndexStats.indexedFileCount ?? currentIndexStats.filesCount ?? null,
                  chunk_count: currentIndexStats.chunkCount ?? currentIndexStats.chunksCount ?? null,
                  completed_at: currentIndexStats.completedAt ?? null,
                  updated_at: currentIndexStats.updatedAt ?? null,
                }
              : {
                  status: hasIndexingFailure ? "failed" : "not_started",
                  message: hasIndexingFailure
                    ? currentIndexStats?.error || "Indexing did not complete."
                    : "This repository has not been prepared yet. Index it once to ask source-backed questions.",
                },
          },
          transparency: transparencyRows,
          processing: {
            pipeline: pipelineSteps,
            summary_steps: summaryProcessingSteps,
            lifecycle: lifecycleSteps,
            latency: latencyRows,
          },
        }
      }
    : {
        status: summaryStatus,
        message: summaryStatus === "empty" ? "No summary was returned." : summaryStreamMessage || "Awaiting summary stream.",
        context: {
          repository: githubUrl ? getRepoPath(githubUrl) : "No repository",
          current_state: isPipelineActive ? "Running" : hasPipelineError ? "Needs review" : "Ready",
        },
      };
}
