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

export type SummaryJsonData =
  | {
      success: true;
      message: string;
      data: {
        owner: string;
        repo: string;
        metadata: RepositoryMetadata | Record<string, never>;
        summary: string;
        cool_facts: string[];
        repository: {
          url: string;
          path: string;
          metadata: RepositoryMetadata | null;
        };
        result: {
          status: "generating" | "generated" | "awaiting_result";
          summary: string;
          key_findings: string[];
        };
        result_context: {
          searchable_index: "available" | "use_indexed_q_and_a";
          evidence: "sources_returned" | "no_sources_returned" | "returned_in_source_backed_answers";
        };
        analysis_scope: {
          used: string[];
          limitations: string[];
          current_index:
            | {
                status: "completed";
                files: number | null;
                chunks: number | null;
                indexed_file_count: number | null;
                chunk_count: number | null;
                completed_at: string | null;
                updated_at: string | null;
              }
            | {
                status: "failed" | "not_started";
                message: string;
              };
        };
        transparency: TransparencyRow[];
        processing: {
          pipeline: PipelineFlowStep[];
          summary_steps: PipelineFlowStep[];
          lifecycle: PipelineFlowStep[];
          latency: LatencyRow[];
        };
      };
    }
  | {
      status: RepositorySummaryStatus;
      message: string;
      context: {
        repository: string;
        current_state: "Running" | "Needs review" | "Ready";
      };
    };
