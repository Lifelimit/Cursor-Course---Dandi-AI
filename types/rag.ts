import type { ValidatedApiKeyData } from "@/types/api-keys";

export type IngestionJobStatus = "queued" | "running" | "completed" | "failed";
export type IngestionJobStep = "queued" | "cloning" | "analyzing" | "summarizing" | "indexing" | "ready" | "failed";

export type IngestionJob = {
  id: string;
  user_id: string;
  api_key_id: string | null;
  repo_url: string;
  repo_name: string | null;
  status: IngestionJobStatus;
  current_step: IngestionJobStep | null;
  error: string | null;
  error_message: string | null;
  files_count: number | null;
  chunks_count: number | null;
  indexed_file_count: number | null;
  chunk_count: number | null;
  summary_available: boolean | null;
  index_available: boolean | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  updated_at: string;
};

export type IngestionJobSummary = {
  jobId: string;
  status: IngestionJobStatus;
  currentStep?: IngestionJobStep;
  repoUrl: string;
  repoName?: string | null;
  error?: string | null;
  errorMessage?: string | null;
  filesCount?: number | null;
  chunksCount?: number | null;
  indexedFileCount?: number | null;
  chunkCount?: number | null;
  summaryAvailable?: boolean;
  indexAvailable?: boolean;
  createdAt?: string;
  startedAt?: string | null;
  completedAt?: string | null;
  failedAt?: string | null;
  updatedAt?: string;
};

export type IngestionKeyData = ValidatedApiKeyData;

export type RagSource = {
  chunkId?: string;
  filePath: string;
  preview?: string;
  similarity: number;
};

export type RagMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: RagSource[];
};

export type MatchedRepositoryChunk = {
  id: string;
  file_path: string;
  content: string;
  similarity: number;
};
