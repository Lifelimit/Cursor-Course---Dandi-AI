import type { ValidatedApiKeyData } from "@/types/api-keys";

export type IngestionJobStatus = "queued" | "running" | "retrying" | "cancel_requested" | "completed" | "cancelled" | "failed";
export type IngestionJobStep =
  | "queued"
  | "validating"
  | "fetching_tree"
  | "selecting_files"
  | "fetching_files"
  | "chunking"
  | "embedding"
  | "persisting"
  | "finalizing"
  | "retrying"
  | "ready"
  | "cancelled"
  | "failed"
  // Legacy values remain readable for jobs created before the durable worker migration.
  | "cloning"
  | "analyzing"
  | "summarizing"
  | "indexing";
export type IngestionCredentialType = "api_key" | "demo";

export type IngestionJob = {
  id: string;
  user_id: string;
  api_key_id: string | null;
  credential_type: IngestionCredentialType;
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
  selected_files?: Array<{ path: string; size: number }> | null;
  branch?: string | null;
  commit_sha?: string | null;
  index_version?: string | null;
  file_cursor?: number | null;
  chunk_cursor?: number | null;
  prepared_chunk_count?: number | null;
  embedded_chunk_count?: number | null;
  persisted_chunk_count?: number | null;
  skipped_file_count?: number | null;
  failed_file_count?: number | null;
  heartbeat_at?: string | null;
  lease_owner?: string | null;
  lease_expires_at?: string | null;
  attempt_count?: number | null;
  retry_count?: number | null;
  retry_at?: string | null;
  last_provider_status?: number | null;
  last_error_code?: string | null;
  cancel_requested_at?: string | null;
  quota_reserved?: boolean | null;
  usage_finalized?: boolean | null;
  phase_started_at?: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  updated_at: string;
};

export type IngestionJobSummary = {
  jobId: string;
  apiKeyId?: string | null;
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
  heartbeatAt?: string | null;
  leaseExpiresAt?: string | null;
  retryAt?: string | null;
  retryCount?: number | null;
  lastProviderStatus?: number | null;
  lastErrorCode?: string | null;
  skippedFileCount?: number | null;
  failedFileCount?: number | null;
  preparedChunkCount?: number | null;
  embeddedChunkCount?: number | null;
  persistedChunkCount?: number | null;
  fileCursor?: number | null;
  chunkCursor?: number | null;
  totalFiles?: number | null;
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
