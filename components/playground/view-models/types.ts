import type { PipelineFlowStep } from "@/components/command";
import type { StatusPillProps } from "@/components/command/StatusPill";
import type { LoadingStageStatus } from "@/components/ui/LoadingStages";
import type { LogEntry } from "@/components/playground/NetworkLog";

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
};

export type ModeLogStatus = LoadingStageStatus;

export type SummaryApiBody = {
  summary: string;
  cool_facts: string[];
};

export type SummaryGithubMetadataHeader = {
  repo: string;
  metadata: RepositoryMetadata;
};

export type SummaryJsonData =
  | {
      body: SummaryApiBody;
      headers?: {
        "x-github-metadata": SummaryGithubMetadataHeader;
      };
    }
  | {
      error: string;
    }
  | {
      message: string;
    };
