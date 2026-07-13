import crypto from "node:crypto";
import { getRequestTelemetry } from "@/lib/account-environments";
import { isUuid } from "@/lib/security-core";
import { ApiKeyQuotaError, getApiKeyDataOwnerId, incrementKeyUsage, reserveApiKeyUsageForIngestionJob } from "@/lib/services/api-key.service";
import {
  assertPublicRepositoryForRag,
  fetchGitHubBranch,
  fetchGitHubRepoTreeSnapshot,
  fetchRawFileContent,
  GitHubPublicRepositoryCheckError,
  GitHubPublicRepositoryRequiredError,
} from "@/lib/services/github.service";
import { googleBatchEmbedWithModel, isGeminiEmbeddingRateLimitError, type EmbeddingAttemptError } from "@/lib/services/google-gemini.service";
import { selectRagFiles } from "@/lib/services/rag-file-selection.service";
import { redis } from "@/lib/redis";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { IngestionJob, IngestionJobStep, IngestionKeyData, IngestionJobSummary } from "@/types/rag";

const LOCK_TTL_SEC = 120;
const LEASE_TTL_MS = 90_000;
const DEFAULT_WORKER_MAX_MS = 45_000;
const DEFAULT_MAX_CHUNKS_PER_INVOCATION = 20;
const DEFAULT_MAX_FILES_PER_INVOCATION = 8;
const WORKER_SAFETY_WINDOW_MS = 8_000;
const DEFAULT_MAX_JOB_RETRIES = 8;
const ORPHANED_INGESTION_MESSAGE = "Repository ingestion is being resumed after a worker stopped unexpectedly.";
const CANCELLED_INGESTION_MESSAGE = "Repository ingestion cancelled by user.";

const LOCK_REFRESH_SCRIPT = "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('EXPIRE', KEYS[1], ARGV[2]) else return 0 end";
const LOCK_RELEASE_SCRIPT = "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end";

export type { IngestionJob, IngestionJobStatus, IngestionJobStep, IngestionKeyData, IngestionJobSummary } from "@/types/rag";
type RequestTelemetry = ReturnType<typeof getRequestTelemetry>;
type WorkerOutcome = "completed" | "progressed" | "retrying" | "cancelled" | "failed" | "locked" | "idle";

class IngestionWorkerError extends Error {
  constructor(public readonly code: string, message: string, public readonly retryable = false, public readonly providerStatus?: number) {
    super(message);
    this.name = "IngestionWorkerError";
  }
}

function nowIso() { return new Date().toISOString(); }
function positiveInt(name: string, fallback: number, max?: number) {
  const value = Number.parseInt((process.env[name] || "").trim(), 10);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return max ? Math.min(value, max) : value;
}

function getRepoName(repoUrl: string) {
  try {
    const [owner, repo] = new URL(repoUrl).pathname.split("/").filter(Boolean);
    return owner && repo ? `${owner}/${repo.replace(/\.git$/i, "")}` : null;
  } catch { return null; }
}

function toIngestionJob(value: unknown) { return value as IngestionJob; }
function isActiveIngestionJob(job: IngestionJob) {
  return ["queued", "running", "retrying", "cancel_requested"].includes(job.status);
}

function deriveCurrentStep(job: IngestionJob): IngestionJobStep {
  if (job.current_step) return job.current_step;
  if (job.status === "completed") return "ready";
  if (job.status === "cancelled") return "cancelled";
  if (job.status === "failed") return "failed";
  if (job.status === "retrying") return "retrying";
  return job.status === "running" || job.status === "cancel_requested" ? "fetching_files" : "queued";
}

function safeErrorCode(error: unknown) {
  const candidate = error as Partial<EmbeddingAttemptError> | undefined;
  if (candidate?.code) return candidate.code;
  if (error instanceof IngestionWorkerError) return error.code;
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes("tree")) return "GITHUB_TREE_FETCH_FAILED";
  if (message.includes("insert") || message.includes("supabase")) return "DATABASE_INSERT_FAILED";
  return "INGESTION_FAILED";
}

function sanitizeIngestionError(error: unknown) {
  if (error instanceof GitHubPublicRepositoryRequiredError || error instanceof GitHubPublicRepositoryCheckError) return error.message;
  if (error instanceof ApiKeyQuotaError) return error.code === "unavailable" ? "Usage quota is temporarily unavailable. Retry repository preparation shortly." : "The workspace request allowance has been reached. Upgrade your plan or retry after the quota window resets.";
  if (error instanceof IngestionWorkerError && error.code === "JOB_CANCELLED") return CANCELLED_INGESTION_MESSAGE;
  if (isGeminiEmbeddingRateLimitError(error)) return "Gemini embedding rate limit reached. Dandi will retry this repository automatically.";
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes("no queryable text")) return "No queryable text or code assets found in this repository.";
  if (message.includes("truncated")) return "GitHub returned a truncated repository tree. Reduce the repository size or retry later.";
  if (message.includes("credential is no longer available")) return "The ingestion credential is no longer available. Start repository preparation again.";
  if (message.includes("invalid embedding") || message.includes("mismatched embedding")) return "The embedding provider returned an invalid vector. Retry preparation shortly.";
  if (message.includes("schema") || message.includes("insert repository chunks")) return "Dandi could not persist the repository index. Verify the latest Supabase migrations.";
  if (error instanceof IngestionWorkerError && error.code === "JOB_EXECUTION_EXPIRED") return "This worker slice reached its execution limit. Dandi will resume from the saved checkpoint.";
  return "Repository ingestion failed. Wait a moment, then retry preparation.";
}

function getIngestionLockKey(job: IngestionJob) { return `lock:ingest:${job.user_id}:${job.repo_url}`; }

async function acquireIngestionLock(key: string, token: string) {
  try { return Boolean(await redis.set(key, token, { nx: true, ex: LOCK_TTL_SEC })); } catch { return false; }
}

export async function refreshIngestionLock(key: string, token: string) {
  const result = await redis.eval(LOCK_REFRESH_SCRIPT, [key], [token, String(LOCK_TTL_SEC)]);
  return Number(result) === 1;
}

export async function releaseIngestionLock(key: string, token: string) {
  const result = await redis.eval(LOCK_RELEASE_SCRIPT, [key], [token]);
  return Number(result) === 1;
}

function activeJobQuery(userId: string, repoUrl: string) {
  return supabaseAdmin.from("ingestion_jobs").select("*").eq("user_id", userId).eq("repo_url", repoUrl).in("status", ["queued", "running", "retrying", "cancel_requested"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
}

async function loadJob(jobId: string) {
  const { data, error } = await supabaseAdmin.from("ingestion_jobs").select("*").eq("id", jobId).single();
  if (error || !data) throw new Error("Ingestion job not found.");
  return toIngestionJob(data);
}

async function updateJob(jobId: string, values: Record<string, unknown>, leaseToken?: string) {
  let query = supabaseAdmin.from("ingestion_jobs").update({ ...values, updated_at: nowIso() }).eq("id", jobId);
  if (leaseToken) query = query.eq("lease_owner", leaseToken);
  const { data, error } = await query.select("*").maybeSingle();
  if (error) throw new IngestionWorkerError("DATABASE_JOB_UPDATE_FAILED", "Failed to update the ingestion job.", true);
  if (!data) throw new IngestionWorkerError("JOB_LEASE_LOST", "Ingestion worker lease is no longer owned.", true);
  return toIngestionJob(data);
}

async function claimIngestionJob(job: IngestionJob, token: string) {
  const leaseValues = {
    status: "running",
    lease_owner: token,
    lease_expires_at: new Date(Date.now() + LEASE_TTL_MS).toISOString(),
    heartbeat_at: nowIso(),
    attempt_count: (job.attempt_count ?? 0) + 1,
    retry_at: null,
  };
  const query = supabaseAdmin.from("ingestion_jobs").update({ ...leaseValues, updated_at: nowIso() }).eq("id", job.id).in("status", ["queued", "retrying", "cancel_requested"]);
  let result = await query.select("*").maybeSingle();
  if (!result.data && !result.error) {
    result = await supabaseAdmin.from("ingestion_jobs").update({ ...leaseValues, updated_at: nowIso() }).eq("id", job.id).eq("status", "running").is("lease_expires_at", null).select("*").maybeSingle();
  }
  if (!result.data && !result.error) {
    result = await supabaseAdmin.from("ingestion_jobs").update({ ...leaseValues, updated_at: nowIso() }).eq("id", job.id).eq("status", "running").lt("lease_expires_at", nowIso()).select("*").maybeSingle();
  }
  if (result.error || !result.data) return null;
  return toIngestionJob(result.data);
}

function leaseExpired(job: IngestionJob) {
  return !job.lease_expires_at || Date.parse(job.lease_expires_at) <= Date.now();
}

export async function isOrphanedActiveIngestionJob(job: IngestionJob) {
  if (job.status !== "running") return false;
  return leaseExpired(job) || (job.heartbeat_at ? Date.now() - Date.parse(job.heartbeat_at) > LEASE_TTL_MS : Date.now() - Date.parse(job.updated_at) > LEASE_TTL_MS);
}

export async function reconcileIngestionJob(job: IngestionJob) {
  if (!(await isOrphanedActiveIngestionJob(job))) return job;
  try {
    return await updateJob(job.id, { status: "retrying", current_step: "retrying", error: ORPHANED_INGESTION_MESSAGE, error_message: ORPHANED_INGESTION_MESSAGE, last_error_code: "JOB_EXECUTION_EXPIRED", retry_at: nowIso(), lease_owner: null, lease_expires_at: null, heartbeat_at: nowIso() });
  } catch { return job; }
}

function getPublicIngestionErrorMessage(job: IngestionJob) {
  if (!["failed", "cancelled"].includes(job.status)) return null;
  return job.error_message || job.error || (job.status === "cancelled" ? CANCELLED_INGESTION_MESSAGE : "Repository ingestion failed. Wait a moment, then retry preparation.");
}

export function formatIngestionJob(job: IngestionJob): IngestionJobSummary {
  return {
    jobId: job.id,
    apiKeyId: job.api_key_id,
    status: job.status,
    currentStep: deriveCurrentStep(job),
    repoUrl: job.repo_url,
    repoName: job.repo_name ?? getRepoName(job.repo_url),
    error: job.error,
    errorMessage: getPublicIngestionErrorMessage(job),
    filesCount: job.files_count,
    chunksCount: job.chunks_count,
    indexedFileCount: job.indexed_file_count,
    chunkCount: job.chunk_count,
    summaryAvailable: Boolean(job.summary_available),
    indexAvailable: Boolean(job.index_available),
    createdAt: job.created_at,
    startedAt: job.started_at,
    completedAt: job.completed_at,
    failedAt: job.failed_at,
    updatedAt: job.updated_at,
    heartbeatAt: job.heartbeat_at,
    leaseExpiresAt: job.lease_expires_at,
    retryAt: job.retry_at,
    retryCount: job.retry_count,
    lastProviderStatus: job.last_provider_status,
    lastErrorCode: job.last_error_code,
    skippedFileCount: job.skipped_file_count,
    failedFileCount: job.failed_file_count,
    preparedChunkCount: job.prepared_chunk_count,
    embeddedChunkCount: job.embedded_chunk_count,
    persistedChunkCount: job.persisted_chunk_count,
    fileCursor: job.file_cursor,
    chunkCursor: job.chunk_cursor,
    totalFiles: job.files_count,
  };
}

type Chunk = { path: string; chunkIndex: number; content: string; contentHash: string; startOffset: number; endOffset: number };

function splitIntoChunks(text: string, path: string, chunkSize = 1200, overlap = 150): Chunk[] {
  if (!text.trim()) return [];
  const chunks: Chunk[] = [];
  let start = 0;
  let index = 0;
  while (start < text.length) {
    let end = Math.min(text.length, start + chunkSize);
    if (end < text.length) {
      const newline = text.lastIndexOf("\n", end);
      if (newline > start + Math.floor(chunkSize * 0.5)) end = newline;
    }
    const content = text.slice(start, end);
    chunks.push({ path, chunkIndex: index, content, contentHash: crypto.createHash("sha256").update(content).digest("hex"), startOffset: start, endOffset: end });
    if (end >= text.length) break;
    start = Math.max(start + 1, end - overlap);
    index += 1;
  }
  return chunks;
}

async function loadUsageKeyData(job: IngestionJob): Promise<IngestionKeyData | null> {
  if (job.credential_type === "demo") return { id: "demo-id", name: "Playground Demo Key", usage_count: 0, monthly_limit: 1000, user_id: "demo-user-id", browserUserId: job.user_id, key_type: "production", plan: "Hobby" };
  if (!job.api_key_id) return null;
  const { data, error } = await supabaseAdmin.from("api_keys").select("id, name, usage_count, monthly_limit, user_id, key_type, is_active, alert_threshold, alert_channels, profiles(plan, email)").eq("id", job.api_key_id).single();
  if (error || !data) return null;
  const value = data as unknown as IngestionKeyData & { profiles?: { plan?: string; email?: string } | Array<{ plan?: string; email?: string }> };
  const profile = Array.isArray(value.profiles) ? value.profiles[0] : value.profiles;
  return { ...value, plan: profile?.plan ?? value.plan, email: profile?.email ?? value.email };
}

function requestFromTelemetry(telemetry?: RequestTelemetry) {
  if (!telemetry) return undefined;
  const headers = new Headers();
  if (telemetry.ip) headers.set("x-real-ip", telemetry.ip);
  if (telemetry.userAgent) headers.set("user-agent", telemetry.userAgent);
  return new Request("https://dandi.invalid/internal/ingestion-job", { headers });
}

export async function createIngestionJob(input: { keyData: IngestionKeyData; repoUrl: string }) {
  const ownerId = getApiKeyDataOwnerId(input.keyData);
  const existing = await activeJobQuery(ownerId, input.repoUrl);
  if (existing.data) {
    const job = await reconcileIngestionJob(toIngestionJob(existing.data));
    if (isActiveIngestionJob(job)) return { job, reused: true };
  }
  const { data, error } = await supabaseAdmin.from("ingestion_jobs").insert({ user_id: ownerId, api_key_id: isUuid(input.keyData.id) ? input.keyData.id : null, credential_type: input.keyData.id === "demo-id" ? "demo" : "api_key", repo_url: input.repoUrl, repo_name: getRepoName(input.repoUrl), status: "queued", current_step: "queued", selected_files: [], file_cursor: 0 }).select("*").single();
  if (error) {
    if (error.code === "23505") {
      const duplicate = await activeJobQuery(ownerId, input.repoUrl);
      if (duplicate.data) return { job: toIngestionJob(duplicate.data), reused: true };
    }
    throw new Error(`Failed to create ingestion job: ${error.message}`);
  }
  return { job: toIngestionJob(data), reused: false };
}

export async function getIngestionJob(input: { jobId: string; keyData: IngestionKeyData }) {
  const ownerId = getApiKeyDataOwnerId(input.keyData);
  const { data, error } = await supabaseAdmin.from("ingestion_jobs").select("*").eq("id", input.jobId).eq("user_id", ownerId).single();
  if (error || !data) throw new Error("Ingestion job not found.");
  return reconcileIngestionJob(toIngestionJob(data));
}

export async function cancelIngestionJob(input: { jobId: string; keyData: IngestionKeyData }) {
  const job = await getIngestionJob(input);
  if (["completed", "failed", "cancelled"].includes(job.status)) return job;
  return updateJob(job.id, { status: "cancel_requested", current_step: "retrying", cancel_requested_at: nowIso(), error: CANCELLED_INGESTION_MESSAGE, error_message: CANCELLED_INGESTION_MESSAGE });
}

async function reconcileIngestionJobs(jobs: IngestionJob[]) { return Promise.all(jobs.map(reconcileIngestionJob)); }

export async function listRecentIngestionJobs(input: { userId: string; apiKeyId?: string | null; limit?: number }) {
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 50);
  let query = supabaseAdmin.from("ingestion_jobs").select("*").eq("user_id", input.userId);
  if (input.apiKeyId) query = query.eq("api_key_id", input.apiKeyId);
  const { data, error } = await query.order("updated_at", { ascending: false }).limit(limit);
  if (error) throw new Error(`Failed to load ingestion jobs: ${error.message}`);
  return reconcileIngestionJobs((data ?? []).map(toIngestionJob));
}

async function countVersionChunks(indexVersion: string) {
  const { count, error } = await supabaseAdmin.from("repository_chunks").select("id", { count: "exact", head: true }).eq("index_version", indexVersion);
  if (error) throw new IngestionWorkerError("DATABASE_COUNT_FAILED", "Failed to verify persisted repository chunks.", true);
  return count ?? 0;
}

async function heartbeat(job: IngestionJob, token: string, values: Record<string, unknown> = {}) {
  const leaseExpiresAt = new Date(Date.now() + LEASE_TTL_MS).toISOString();
  return updateJob(job.id, { ...values, heartbeat_at: nowIso(), lease_expires_at: leaseExpiresAt }, token);
}

async function assertNotCancelled(jobId: string) {
  const latest = await loadJob(jobId);
  if (["cancel_requested", "cancelled"].includes(latest.status) || latest.cancel_requested_at) throw new IngestionWorkerError("JOB_CANCELLED", CANCELLED_INGESTION_MESSAGE);
  return latest;
}

async function prepareJob(job: IngestionJob, token: string) {
  if (Array.isArray(job.selected_files) && job.selected_files.length > 0 && job.index_version) return job;
  await heartbeat(job, token, { status: "running", current_step: "validating", phase_started_at: nowIso(), started_at: job.started_at ?? nowIso(), index_available: false });
  await assertPublicRepositoryForRag(job.repo_url);
  const branch = await fetchGitHubBranch(job.repo_url);
  job = await heartbeat(job, token, { current_step: "fetching_tree", branch });
  const snapshot = await fetchGitHubRepoTreeSnapshot(job.repo_url, branch);
  if (snapshot.truncated) throw new IngestionWorkerError("GITHUB_TREE_TRUNCATED", "GitHub returned a truncated repository tree.", false);
  const files = selectRagFiles(snapshot.files, { maxFileCount: positiveInt("RAG_MAX_FILE_COUNT", 40, 100), maxFileSizeBytes: positiveInt("RAG_MAX_FILE_SIZE_BYTES", 50_000, 250_000) });
  if (files.length === 0) throw new IngestionWorkerError("NO_QUERYABLE_ASSETS", "No queryable text or code assets found in this repository.");
  job = await heartbeat(job, token, { current_step: "selecting_files", selected_files: files, files_count: files.length, skipped_file_count: Math.max(0, snapshot.files.length - files.length), commit_sha: snapshot.commitSha });
  const { data: version, error } = await supabaseAdmin.from("repository_index_versions").insert({ user_id: job.user_id, repo_url: job.repo_url, commit_sha: snapshot.commitSha, embedding_model: process.env.GOOGLE_EMBEDDING_MODEL?.replace(/^models\//, "") || "gemini-embedding-001", status: "building" }).select("id").single();
  if (error || !version?.id) throw new IngestionWorkerError("DATABASE_INDEX_VERSION_FAILED", "Failed to create a repository index version.", true);
  return heartbeat(job, token, { current_step: "fetching_files", index_version: version.id, file_cursor: 0, chunk_cursor: 0, chunks_count: 0, chunk_count: 0, prepared_chunk_count: 0, embedded_chunk_count: 0, persisted_chunk_count: 0 });
}

async function finalizeUsage(job: IngestionJob, usageKeyData: IngestionKeyData | null, telemetry: RequestTelemetry | undefined, status: "success" | "error") {
  if (job.usage_finalized || !usageKeyData) return;
  await incrementKeyUsage(usageKeyData, job.repo_url, job.started_at ? Date.now() - Date.parse(job.started_at) : 0, status, requestFromTelemetry(telemetry));
  await supabaseAdmin.from("ingestion_jobs").update({ usage_finalized: true, updated_at: nowIso() }).eq("id", job.id).eq("usage_finalized", false);
}

async function processOneWorkerUnit(job: IngestionJob, token: string, telemetry?: RequestTelemetry): Promise<{ job: IngestionJob; outcome: WorkerOutcome }> {
  const deadline = Date.now() + positiveInt("RAG_WORKER_MAX_MS", DEFAULT_WORKER_MAX_MS, 55_000);
  const maxChunksPerInvocation = positiveInt("RAG_WORKER_MAX_CHUNKS_PER_INVOCATION", DEFAULT_MAX_CHUNKS_PER_INVOCATION, 20);
  const maxFilesPerInvocation = positiveInt("RAG_WORKER_MAX_FILES_PER_INVOCATION", DEFAULT_MAX_FILES_PER_INVOCATION, 8);
  job = await assertNotCancelled(job.id);
  const usageKeyData = await loadUsageKeyData(job);
  if (!usageKeyData && !job.quota_reserved) throw new IngestionWorkerError("CREDENTIAL_UNAVAILABLE", "The ingestion credential is no longer available. Start repository preparation again.");
  if (!job.quota_reserved) {
    if (!usageKeyData) throw new IngestionWorkerError("CREDENTIAL_UNAVAILABLE", "The ingestion credential is no longer available. Start repository preparation again.");
    await reserveApiKeyUsageForIngestionJob(usageKeyData, job.id);
    job = await heartbeat(job, token, { quota_reserved: true });
  }
  job = await prepareJob(job, token);
  const files = Array.isArray(job.selected_files) ? job.selected_files : [];

  while (true) {
    const fileCursor = job.file_cursor ?? 0;
    if (fileCursor >= files.length) {
      if (Date.now() + WORKER_SAFETY_WINDOW_MS >= deadline) return { job, outcome: "progressed" };
      job = await heartbeat(job, token, { current_step: "finalizing" });
      if (!job.index_version) throw new IngestionWorkerError("DATABASE_INDEX_VERSION_FAILED", "Repository index version is missing.");
      const count = await countVersionChunks(job.index_version);
      if (count <= 0) throw new IngestionWorkerError("NO_PERSISTED_CHUNKS", "Dandi could not read queryable repository content from GitHub.");
      const { error } = await supabaseAdmin.rpc("activate_repository_index", { p_version_id: job.index_version, p_user_id: job.user_id, p_repo_url: job.repo_url });
      if (error) throw new IngestionWorkerError("DATABASE_ACTIVATION_FAILED", "Failed to activate the repository index.", true);
      job = await heartbeat(job, token, { status: "completed", current_step: "ready", index_available: true, chunk_count: count, chunks_count: count, prepared_chunk_count: count, embedded_chunk_count: count, persisted_chunk_count: count, completed_at: nowIso() });
      await finalizeUsage(job, usageKeyData, telemetry, "success");
      job = await updateJob(job.id, { lease_owner: null, lease_expires_at: null }, token);
      return { job, outcome: "completed" };
    }
    if (Date.now() + WORKER_SAFETY_WINDOW_MS >= deadline) return { job, outcome: "progressed" };

    const branch = job.branch || "main";
    let nextFileCursor = fileCursor;
    let nextChunkCursor = job.chunk_cursor ?? 0;
    let filesVisited = 0;
    let failedFiles = 0;
    let skippedFiles = 0;
    const batch: ReturnType<typeof splitIntoChunks> = [];

    while (batch.length < maxChunksPerInvocation && filesVisited < maxFilesPerInvocation && nextFileCursor < files.length) {
      if (Date.now() + WORKER_SAFETY_WINDOW_MS >= deadline) break;
      const file = files[nextFileCursor];
      let text = "";
      try {
        text = await fetchRawFileContent(job.repo_url, branch, file.path);
      } catch {
        nextFileCursor += 1;
        nextChunkCursor = 0;
        filesVisited += 1;
        failedFiles += 1;
        skippedFiles += 1;
        continue;
      }
      const chunks = splitIntoChunks(text, file.path);
      if (chunks.length === 0) {
        nextFileCursor += 1;
        nextChunkCursor = 0;
        filesVisited += 1;
        continue;
      }
      const remaining = maxChunksPerInvocation - batch.length;
      const fileBatch = chunks.slice(nextChunkCursor, nextChunkCursor + remaining);
      batch.push(...fileBatch);
      const fileFinished = nextChunkCursor + fileBatch.length >= chunks.length;
      if (fileFinished) {
        nextFileCursor += 1;
        nextChunkCursor = 0;
        filesVisited += 1;
      } else {
        nextChunkCursor += fileBatch.length;
        break;
      }
    }

    if (batch.length === 0) {
      if (nextFileCursor === fileCursor && failedFiles === 0 && skippedFiles === 0) return { job, outcome: "progressed" };
      job = await heartbeat(job, token, { current_step: "fetching_files", file_cursor: nextFileCursor, chunk_cursor: nextChunkCursor, failed_file_count: (job.failed_file_count ?? 0) + failedFiles, skipped_file_count: (job.skipped_file_count ?? 0) + skippedFiles, last_error_code: failedFiles > 0 ? "GITHUB_FILE_FETCH_FAILED" : job.last_error_code });
      continue;
    }

    const { embeddings, model } = await googleBatchEmbedWithModel(batch.map((chunk) => chunk.content));
    if (embeddings.length !== batch.length) throw new IngestionWorkerError("EMBEDDING_INVALID_RESPONSE", "Gemini returned a mismatched embedding count.");
    await assertNotCancelled(job.id);
    const rows = batch.map((chunk, index) => ({ repo_url: job.repo_url, user_id: job.user_id, api_key_id: job.api_key_id, credential_type: job.credential_type, index_version: job.index_version, embedding_model: model, file_path: chunk.path, chunk_index: chunk.chunkIndex, content_hash: chunk.contentHash, start_offset: chunk.startOffset, end_offset: chunk.endOffset, content: chunk.content, embedding: embeddings[index] }));
    const { error: insertError } = await supabaseAdmin.from("repository_chunks").upsert(rows, { onConflict: "index_version,file_path,chunk_index,content_hash" });
    if (insertError) throw new IngestionWorkerError("DATABASE_INSERT_FAILED", "Failed to insert repository chunks.", true);
    const persistedCount = job.index_version ? await countVersionChunks(job.index_version) : 0;
    job = await heartbeat(job, token, { current_step: nextChunkCursor > 0 ? "embedding" : "fetching_files", file_cursor: nextFileCursor, chunk_cursor: nextChunkCursor, chunk_count: persistedCount, chunks_count: persistedCount, prepared_chunk_count: persistedCount, embedded_chunk_count: persistedCount, persisted_chunk_count: persistedCount, failed_file_count: (job.failed_file_count ?? 0) + failedFiles, skipped_file_count: (job.skipped_file_count ?? 0) + skippedFiles });
    if (nextFileCursor < files.length) return { job, outcome: "progressed" };
  }
}

async function handleWorkerError(job: IngestionJob, token: string, error: unknown, telemetry?: RequestTelemetry) {
  if (error instanceof IngestionWorkerError && error.code === "JOB_LEASE_LOST") return { job, outcome: "retrying" as WorkerOutcome };
  const code = safeErrorCode(error);
  const publicMessage = sanitizeIngestionError(error);
  const retryable = error instanceof IngestionWorkerError ? error.retryable : Boolean((error as Partial<EmbeddingAttemptError>)?.retryable || isGeminiEmbeddingRateLimitError(error));
  const nextRetryCount = (job.retry_count ?? 0) + (retryable ? 1 : 0);
  const canRetry = retryable && nextRetryCount <= positiveInt("RAG_MAX_JOB_RETRIES", DEFAULT_MAX_JOB_RETRIES, 20);
  if (canRetry) {
    const delay = Math.min(60_000, 1_000 * 2 ** Math.min(nextRetryCount - 1, 6));
    const next = await updateJob(job.id, { status: "retrying", current_step: "retrying", error: publicMessage, error_message: publicMessage, last_error_code: code, last_provider_status: (error as Partial<EmbeddingAttemptError>)?.status ?? null, retry_count: nextRetryCount, retry_at: new Date(Date.now() + delay).toISOString(), lease_owner: null, lease_expires_at: null, heartbeat_at: nowIso() }, token).catch(() => job);
    console.warn("RAG ingestion worker will retry", { jobId: job.id, phase: job.current_step, errorCode: code, retryCount: nextRetryCount });
    return { job: next, outcome: "retrying" as WorkerOutcome };
  }
  const next = await updateJob(job.id, { status: "failed", current_step: "failed", error: publicMessage, error_message: publicMessage, failed_at: nowIso(), completed_at: nowIso(), last_error_code: code, last_provider_status: (error as Partial<EmbeddingAttemptError>)?.status ?? null, lease_owner: null, lease_expires_at: null, heartbeat_at: nowIso() }, token).catch(() => job);
  const usage = await loadUsageKeyData(next);
  await finalizeUsage(next, usage, telemetry, "error").catch(() => undefined);
  return { job: next, outcome: "failed" as WorkerOutcome };
}

export async function processIngestionJobUnit(jobId: string, telemetry?: RequestTelemetry): Promise<{ job: IngestionJob; outcome: WorkerOutcome }> {
  const original = await loadJob(jobId);
  if (["completed", "failed", "cancelled"].includes(original.status)) return { job: original, outcome: original.status === "completed" ? "completed" : original.status === "cancelled" ? "cancelled" : "failed" };
  if (original.status === "retrying" && original.retry_at && Date.parse(original.retry_at) > Date.now()) return { job: original, outcome: "retrying" };
  const lockKey = getIngestionLockKey(original);
  const token = `worker:${crypto.randomUUID()}`;
  if (!(await acquireIngestionLock(lockKey, token))) return { job: original, outcome: "locked" };
  try {
    let job: IngestionJob;
    try {
      const claimed = await claimIngestionJob(original, token);
      if (!claimed) return { job: original, outcome: "locked" };
      job = claimed;
    } catch { return { job: original, outcome: "locked" }; }
    try {
      const result = await processOneWorkerUnit(job, token, telemetry);
      return result;
    } catch (error) {
      if (error instanceof IngestionWorkerError && error.code === "JOB_CANCELLED") {
        const cancelled = await updateJob(job.id, { status: "cancelled", current_step: "cancelled", error: CANCELLED_INGESTION_MESSAGE, error_message: CANCELLED_INGESTION_MESSAGE, completed_at: nowIso(), lease_owner: null, lease_expires_at: null }, token).catch(() => job);
        const usage = await loadUsageKeyData(cancelled);
        await finalizeUsage(cancelled, usage, telemetry, "error").catch(() => undefined);
        return { job: cancelled, outcome: "cancelled" };
      }
      return handleWorkerError(job, token, error, telemetry);
    }
  } finally {
    try { await releaseIngestionLock(lockKey, token); } catch { console.warn("Failed to release an owned ingestion lock."); }
  }
}

export async function processQueuedIngestionJobs(input: { limit?: number; telemetry?: RequestTelemetry } = {}) {
  const limit = Math.min(Math.max(input.limit ?? 1, 1), 5);
  const { data, error } = await supabaseAdmin.from("ingestion_jobs").select("*").in("status", ["queued", "retrying", "running", "cancel_requested"]).order("created_at", { ascending: true }).limit(limit * 3);
  if (error) throw new Error("Failed to load ingestion worker queue.");
  const results: Array<{ job: IngestionJob; outcome: WorkerOutcome }> = [];
  for (const candidate of (data ?? []).filter((value) => value.status !== "retrying" || !value.retry_at || Date.parse(value.retry_at) <= Date.now()).filter((value) => value.status !== "running" || !value.lease_expires_at || Date.parse(value.lease_expires_at) <= Date.now()).slice(0, limit)) {
    results.push(await processIngestionJobUnit(candidate.id, input.telemetry));
  }
  return results;
}

// Kept as a compatibility export for scripts and older internal callers. It now
// processes one bounded worker unit and never owns the entire repository run.
export async function runIngestionJob(jobId: string, telemetry?: RequestTelemetry, requestKeyData?: IngestionKeyData) {
  void requestKeyData;
  return (await processIngestionJobUnit(jobId, telemetry)).job;
}
