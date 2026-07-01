import type { PipelineFlowStep } from "@/components/command";
import type { StatusPillProps } from "@/components/command/StatusPill";
import type { LoadingStageStatus } from "@/components/ui/LoadingStages";
import type { LogEntry } from "@/components/playground/NetworkLog";
import type { IndexedRepositoryStats, RepositoryIngestStatus } from "@/hooks/useRepositoryIngestion";

export type PlaygroundMode = "summary" | "rag";

export type RepositorySummaryStatus = "idle" | "streaming" | "success" | "empty" | "error";

export type RepositoryMetadata = {
  stars: number;
  license: string;
  version: string;
  forks: number;
  description?: string;
};

export type RepositorySummaryResult = {
  summary?: string;
  cool_facts?: Array<string | undefined>;
};

export type PlaygroundPipelineStatus = NonNullable<PipelineFlowStep["status"]>;

export type PlaygroundStatusTone = NonNullable<StatusPillProps["tone"]>;

export type TransparencyRow = {
  label: string;
  value: string;
  detail: string;
};

export type LatencyRow = {
  label: string;
  value: string;
  detail: string;
};

export type PipelineState = {
  requestLogs: LogEntry[];
  isPipelineActive: boolean;
  hasPipelineError: boolean;
  activeLogsHavePending: boolean;
  activeLogsHaveError: boolean;
};

export type IndexedRepositoryViewModel = {
  currentIndexStats: IndexedRepositoryStats | null;
  indexedFilesLabel: string;
  indexedChunksLabel: string;
  hasIndexedCounts: boolean;
};

export type ModeLogStatus = LoadingStageStatus;

export type PlaygroundIngestStatus = RepositoryIngestStatus;
