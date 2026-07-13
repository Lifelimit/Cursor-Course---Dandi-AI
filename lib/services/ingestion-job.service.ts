import { getRequestTelemetry } from "@/lib/account-environments";
import { isUuid } from "@/lib/security-core";
import { ApiKeyQuotaError, getApiKeyDataOwnerId, incrementKeyUsage, reserveApiKeyUsage } from "@/lib/services/api-key.service";
import {
  assertPublicRepositoryForRag,
  fetchGitHubBranch,
  fetchGitHubRepoTree,
  fetchRawFileContent,
  GitHubPublicRepositoryCheckError,
  GitHubPublicRepositoryRequiredError,
} from "@/lib/services/github.service";
import { googleBatchEmbedWithModel, isGeminiEmbeddingRateLimitError } from "@/lib/services/google-gemini.service";
import { selectRagFiles } from "@/lib/services/rag-file-selection.service";
import { redis } from "@/lib/redis";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { IngestionJob, IngestionJobStep, IngestionKeyData, IngestionJobSummary } from "@/types/rag";

const LOCK_TTL_SEC = 900;
const STALE_ACTIVE_JOB_MS = LOCK_TTL_SEC * 1000;
const QUEUED_START_GRACE_MS = 60_000;
const ORPHANED_INGESTION_MESSAGE = "Repository ingestion stopped unexpectedly. Retry preparation.";
const TIMED_OUT_INGESTION_MESSAGE = "Repository ingestion timed out before finishing. Retry preparation.";

const DEFAULT_FETCH_CONCURRENCY = 6;
const DEFAULT_EMBED_FLUSH_CHUNKS = 200;
const DEFAULT_INSERT_BATCH_SIZE = 200;
const DEFAULT_PROGRESS_HEARTBEAT_MS = 2_500;
const DEFAULT_LOCK_REFRESH_MS = 10_000;

export type { IngestionJob, IngestionJobStatus, IngestionJobStep, IngestionKeyData, IngestionJobSummary } from "@/types/rag";

type JobResult = {
  job: IngestionJob;
  reused: boolean;
};

type RequestTelemetry = ReturnType<typeof getRequestTelemetry>;

function activeJobQuery(userId: string, repoUrl: string) {
  return supabaseAdmin
    .from("ingestion_jobs")
    .select("*")
    .eq("user_id", userId)
    .eq("repo_url", repoUrl)
    .in("status", ["queued", "running"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

function toIngestionJob(value: unknown): IngestionJob {
  return value as IngestionJob;
}

function getRepoName(repoUrl: string) {
  try {
    const url = new URL(repoUrl);
    const [owner, repo] = url.pathname.split("/").filter(Boolean);
    return owner && repo ? `${owner}/${repo.replace(/\.git$/i, "")}` : null;
  } catch {
    return null;
  }
}

function deriveCurrentStep(job: IngestionJob): IngestionJobStep {
  if (job.current_step) return job.current_step;
  if (job.status === "completed") return "ready";
  if (job.status === "failed") return "failed";
  if (job.status === "running") return "indexing";
  return "queued";
}

function sanitizeIngestionError(err: unknown) {
  if (err instanceof GitHubPublicRepositoryRequiredError || err instanceof GitHubPublicRepositoryCheckError) {
    return err.message;
  }

  if (isGeminiEmbeddingRateLimitError(err)) {
    return "Gemini embedding rate limit reached during ingestion. Please retry this repository after the quota window resets.";
  }

  if (err instanceof ApiKeyQuotaError) {
    return err.code === "unavailable"
      ? "Usage quota is temporarily unavailable. Retry repository preparation shortly."
      : "The workspace request allowance has been reached. Upgrade your plan or retry after the quota window resets.";
  }

  const message = err instanceof Error ? err.message : String(err);
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("no queryable text or code assets")) {
    return "No queryable text or code assets found in this repository.";
  }

  if (lowerMessage.includes("failed to fetch repository tree")) {
    return "Dandi could not read the repository file tree from GitHub.";
  }

  if (lowerMessage.includes("failed to insert repository chunks") || lowerMessage.includes("supabase")) {
    return "Dandi could not persist the repository index.";
  }

  if (lowerMessage.includes("credential is no longer available")) {
    return "The ingestion credential is no longer available. Start repository preparation again.";
  }

  if (lowerMessage.includes("could not read queryable repository content")) {
    return "Dandi could not read queryable repository content from GitHub.";
  }

  if (lowerMessage.includes("gemini embedding")) {
    return "Repository embedding is temporarily unavailable. Retry preparation shortly.";
  }

  if (lowerMessage.includes("ingestion stopped unexpectedly") || lowerMessage.includes("timed out before finishing")) {
    return message;
  }

  return "Repository ingestion failed. Wait a moment, then retry preparation.";
}

function getIngestionLockKey(job: IngestionJob) {
  return `lock:ingest:${job.user_id}:${job.repo_url}`;
}

function isActiveIngestionJob(job: IngestionJob) {
  return job.status === "queued" || job.status === "running";
}

function getJobAgeMs(job: IngestionJob, now = Date.now()) {
  return now - new Date(job.updated_at).getTime();
}

async function hasActiveIngestionLock(job: IngestionJob) {
  const lockValue = await redis.get<string>(getIngestionLockKey(job));
  return Boolean(lockValue);
}

export async function isOrphanedActiveIngestionJob(job: IngestionJob) {
  if (!isActiveIngestionJob(job)) return false;
  if (getJobAgeMs(job) >= STALE_ACTIVE_JOB_MS) return true;

  const lockHeld = await hasActiveIngestionLock(job);
  if (job.status === "running") return !lockHeld;
  return !lockHeld && getJobAgeMs(job) > QUEUED_START_GRACE_MS;
}

async function failOrphanedIngestionJob(job: IngestionJob) {
  const message = getJobAgeMs(job) >= STALE_ACTIVE_JOB_MS
    ? TIMED_OUT_INGESTION_MESSAGE
    : ORPHANED_INGESTION_MESSAGE;

  return updateJob(job.id, {
    status: "failed",
    current_step: "failed",
    error: message,
    error_message: message,
    failed_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  });
}

export async function reconcileIngestionJob(job: IngestionJob) {
  if (!(await isOrphanedActiveIngestionJob(job))) return job;
  return failOrphanedIngestionJob(job);
}

async function reconcileIngestionJobs(jobs: IngestionJob[]) {
  return Promise.all(jobs.map((job) => reconcileIngestionJob(job)));
}

function getPublicIngestionErrorMessage(job: IngestionJob) {
  if (job.status !== "failed") return null;
  const raw = job.error_message ?? job.error;
  if (!raw) return "Repository ingestion failed. Wait a moment, then retry preparation.";
  if (job.error_message) return job.error_message;
  return sanitizeIngestionError(new Error(raw));
}

export function formatIngestionJob(job: IngestionJob): IngestionJobSummary {
  const indexedFileCount = job.status === "completed" ? job.indexed_file_count ?? job.files_count : job.indexed_file_count;
  const chunkCount = job.status === "completed" ? job.chunk_count ?? job.chunks_count : job.chunk_count;
  const errorMessage = getPublicIngestionErrorMessage(job);

  return {
    jobId: job.id,
    apiKeyId: job.api_key_id,
    status: job.status,
    currentStep: deriveCurrentStep(job),
    repoUrl: job.repo_url,
    repoName: job.repo_name ?? getRepoName(job.repo_url),
    error: job.error,
    errorMessage,
    filesCount: job.files_count,
    chunksCount: job.chunks_count,
    indexedFileCount,
    chunkCount,
    summaryAvailable: Boolean(job.summary_available),
    indexAvailable: Boolean(job.index_available) || job.status === "completed",
    createdAt: job.created_at,
    startedAt: job.started_at,
    completedAt: job.completed_at,
    failedAt: job.failed_at,
    updatedAt: job.updated_at,
  };
}

function splitIntoChunks(text: string, path: string, chunkSize = 1000, overlap = 150): string[] {
  const chunks: string[] = [];
  if (!text || text.trim().length === 0) return [];

  let i = 0;
  while (i < text.length) {
    const chunk = text.slice(i, i + chunkSize);
    chunks.push(`[File Context: ${path}]\n${chunk}`);

    if (text.length <= chunkSize) break;
    i += chunkSize - overlap;
  }
  return chunks;
}

function toPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt((value ?? "").trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>
) {
  if (items.length === 0) return;
  const maxConcurrency = Math.max(1, Math.min(concurrency, items.length));
  let nextIndex = 0;
  await Promise.all(
    Array.from({ length: maxConcurrency }, async () => {
      while (true) {
        const index = nextIndex++;
        if (index >= items.length) return;
        await worker(items[index], index);
      }
    })
  );
}

async function updateJob(jobId: string, values: Partial<IngestionJob>) {
  const { data, error } = await supabaseAdmin
    .from("ingestion_jobs")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", jobId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to update ingestion job: ${error.message}`);
  }

  return toIngestionJob(data);
}

async function loadJob(jobId: string) {
  const { data, error } = await supabaseAdmin
    .from("ingestion_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (error || !data) {
    throw new Error("Ingestion job not found.");
  }

  return toIngestionJob(data);
}

async function loadUsageKeyData(job: IngestionJob): Promise<IngestionKeyData | null> {
  if (job.credential_type === "demo") {
    return {
      id: "demo-id",
      name: "Playground Demo Key",
      usage_count: 0,
      monthly_limit: 1000,
      user_id: "demo-user-id",
      browserUserId: job.user_id,
      key_type: "production",
      plan: "Hobby",
    };
  }

  // A null FK is ambiguous because deleted regular keys use ON DELETE SET NULL.
  if (!job.api_key_id) return null;

  const { data, error } = await supabaseAdmin
    .from("api_keys")
    .select("id, name, usage_count, monthly_limit, user_id, key_type, is_active, alert_threshold, alert_channels, profiles(plan, email)")
    .eq("id", job.api_key_id)
    .single();

  if (error || !data) {
    console.warn("Ingestion usage credential lookup failed.");
    return null;
  }

  const keyData = data as unknown as IngestionKeyData & {
    profiles?: { plan?: string; email?: string } | { plan?: string; email?: string }[];
  };
  const profile = Array.isArray(keyData.profiles) ? keyData.profiles[0] : keyData.profiles;

  return {
    ...keyData,
    plan: profile?.plan ?? keyData.plan,
    email: profile?.email ?? keyData.email,
  };
}

function requestFromTelemetry(telemetry?: RequestTelemetry) {
  if (!telemetry) return undefined;

  const headers = new Headers();
  if (telemetry.ip) headers.set("x-real-ip", telemetry.ip);
  if (telemetry.userAgent) headers.set("user-agent", telemetry.userAgent);
  if (telemetry.city) headers.set("x-vercel-ip-city", telemetry.city);
  if (telemetry.region) headers.set("x-vercel-ip-country-region", telemetry.region);
  if (telemetry.country) headers.set("x-vercel-ip-country", telemetry.country);

  return new Request("https://dandi.invalid/internal/ingestion-job", { headers });
}

export async function createIngestionJob(input: {
  keyData: IngestionKeyData;
  repoUrl: string;
}): Promise<JobResult> {
  const ownerId = getApiKeyDataOwnerId(input.keyData);
  const existing = await activeJobQuery(ownerId, input.repoUrl);
  if (existing.data) {
    const existingJob = await reconcileIngestionJob(toIngestionJob(existing.data));
    if (isActiveIngestionJob(existingJob)) {
      return { job: existingJob, reused: true };
    }
  }

  const { data, error } = await supabaseAdmin
    .from("ingestion_jobs")
    .insert({
      user_id: ownerId,
      api_key_id: isUuid(input.keyData.id) ? input.keyData.id : null,
      credential_type: input.keyData.id === "demo-id" ? "demo" : "api_key",
      repo_url: input.repoUrl,
      repo_name: getRepoName(input.repoUrl),
      status: "queued",
      current_step: "queued",
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      const duplicate = await activeJobQuery(ownerId, input.repoUrl);
      if (duplicate.data) {
        const duplicateJob = await reconcileIngestionJob(toIngestionJob(duplicate.data));
        if (isActiveIngestionJob(duplicateJob)) {
          return { job: duplicateJob, reused: true };
        }
      }
    }
    throw new Error(`Failed to create ingestion job: ${error.message}`);
  }

  return { job: toIngestionJob(data), reused: false };
}

export async function getIngestionJob(input: {
  jobId: string;
  keyData: IngestionKeyData;
}) {
  const ownerId = getApiKeyDataOwnerId(input.keyData);
  const { data, error } = await supabaseAdmin
    .from("ingestion_jobs")
    .select("*")
    .eq("id", input.jobId)
    .eq("user_id", ownerId)
    .single();

  if (error || !data) {
    throw new Error("Ingestion job not found.");
  }

  return reconcileIngestionJob(toIngestionJob(data));
}

export async function cancelIngestionJob(input: {
  jobId: string;
  keyData: IngestionKeyData;
}) {
  const job = await getIngestionJob(input);
  if (job.status === "completed") return job;

  const message = "Repository ingestion cancelled by user.";
  return updateJob(job.id, {
    status: "failed",
    current_step: "failed",
    error: message,
    error_message: message,
    failed_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  });
}

export async function listRecentIngestionJobs(input: {
  userId: string;
  apiKeyId?: string | null;
  limit?: number;
}) {
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 50);
  let query = supabaseAdmin
    .from("ingestion_jobs")
    .select("*")
    .eq("user_id", input.userId);
  if (input.apiKeyId) query = query.eq("api_key_id", input.apiKeyId);
  const { data, error } = await query.order("updated_at", { ascending: false }).limit(limit);

  if (error) {
    throw new Error(`Failed to load ingestion jobs: ${error.message}`);
  }

  return reconcileIngestionJobs((data ?? []).map(toIngestionJob));
}

export async function runIngestionJob(
  jobId: string,
  telemetry?: RequestTelemetry,
  requestKeyData?: IngestionKeyData,
) {
  const startTime = Date.now();
  let lockAcquired = false;
  let lockKey = "";
  let job = await loadJob(jobId);
  const requestOwnerMatches = (() => {
    if (!requestKeyData) return false;
    try {
      return getApiKeyDataOwnerId(requestKeyData) === job.user_id;
    } catch {
      return false;
    }
  })();
  let usageKeyData = requestKeyData
    && requestOwnerMatches
    && (job.api_key_id ? requestKeyData.id === job.api_key_id : requestKeyData.id === "demo-id")
    ? requestKeyData
    : null;

  if (job.status === "completed") return job;

  try {
    lockKey = `lock:ingest:${job.user_id}:${job.repo_url}`;
    const locked = await redis.set(lockKey, job.id, { nx: true, ex: LOCK_TTL_SEC });
    if (!locked) {
      return job;
    }
    lockAcquired = true;

    usageKeyData ??= await loadUsageKeyData(job);
    if (!usageKeyData) {
      throw new Error("The ingestion credential is no longer available. Start repository preparation again.");
    }

    await assertPublicRepositoryForRag(job.repo_url);
    await reserveApiKeyUsage(usageKeyData);

    job = await updateJob(job.id, {
      status: "running",
      current_step: "cloning",
      error: null,
      error_message: null,
      failed_at: null,
      index_available: false,
      started_at: job.started_at ?? new Date().toISOString(),
    });

    const branch = await fetchGitHubBranch(job.repo_url);
    const tree = await fetchGitHubRepoTree(job.repo_url, branch);
    job = await updateJob(job.id, {
      current_step: "analyzing",
      repo_name: job.repo_name ?? getRepoName(job.repo_url),
    });
    const filesToIngest = selectRagFiles(tree);

    if (filesToIngest.length === 0) {
      throw new Error("No queryable text or code assets found in this repository.");
    }

    job = await updateJob(job.id, {
      files_count: filesToIngest.length,
      indexed_file_count: 0,
      chunks_count: 0,
      chunk_count: 0,
    });

    await supabaseAdmin
      .from("repository_chunks")
      .delete()
      .eq("repo_url", job.repo_url)
      .eq("user_id", job.user_id);

    job = await updateJob(job.id, {
      current_step: "indexing",
      indexed_file_count: 0,
      chunks_count: 0,
      chunk_count: 0,
    });

    const fetchConcurrency = toPositiveInt(process.env.RAG_INGEST_FETCH_CONCURRENCY, DEFAULT_FETCH_CONCURRENCY);
    const embedFlushChunks = toPositiveInt(process.env.RAG_INGEST_EMBED_FLUSH_CHUNKS, DEFAULT_EMBED_FLUSH_CHUNKS);
    const insertBatchSize = toPositiveInt(process.env.RAG_INGEST_INSERT_BATCH_SIZE, DEFAULT_INSERT_BATCH_SIZE);
    const heartbeatMs = toPositiveInt(process.env.RAG_INGEST_PROGRESS_HEARTBEAT_MS, DEFAULT_PROGRESS_HEARTBEAT_MS);
    const lockRefreshMs = toPositiveInt(process.env.RAG_INGEST_LOCK_REFRESH_MS, DEFAULT_LOCK_REFRESH_MS);

    let indexedFileCount = 0;
    let preparedChunkCount = 0;
    let insertedChunkCount = 0;
    let lastHeartbeatAt = 0;
    let lastLockRefreshAt = 0;

    const maybeRefreshLock = async (force = false) => {
      const now = Date.now();
      if (!force && now - lastLockRefreshAt < lockRefreshMs) return;
      lastLockRefreshAt = now;
      try {
        await redis.expire(lockKey, LOCK_TTL_SEC);
      } catch {
        // Best-effort; do not fail the ingestion job on lock refresh issues.
        console.warn("Failed to refresh ingestion lock TTL.");
      }
    };

    const maybeHeartbeat = async (force = false) => {
      const now = Date.now();
      if (!force && now - lastHeartbeatAt < heartbeatMs) {
        await maybeRefreshLock(false);
        return;
      }
      lastHeartbeatAt = now;
      await maybeRefreshLock(false);
      try {
        const latest = await loadJob(job.id);
        if (latest.status === "failed" && (latest.error_message || latest.error)?.toLowerCase().includes("cancelled")) {
          throw new Error("Repository ingestion cancelled.");
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes("cancelled")) {
          throw err;
        }
        // If the cancellation check fails, continue indexing and rely on lock/orphan reconciliation.
      }
      try {
        job = await updateJob(job.id, {
          indexed_file_count: indexedFileCount,
          chunks_count: preparedChunkCount,
          chunk_count: insertedChunkCount,
        });
      } catch {
        // Best-effort; we still want to continue indexing even if progress updates fail.
        console.warn("Failed to persist ingestion progress.");
      }
    };

    const pendingChunks: { path: string; content: string }[] = [];
    let flushInFlight: Promise<void> | null = null;

    const flushPendingChunks = async (force = false) => {
      while (pendingChunks.length >= embedFlushChunks || (force && pendingChunks.length > 0)) {
        const batch = pendingChunks.splice(0, Math.min(embedFlushChunks, pendingChunks.length));
        const { embeddings, model } = await googleBatchEmbedWithModel(batch.map((chunk) => chunk.content));

        for (let i = 0; i < batch.length; i += insertBatchSize) {
          const slice = batch.slice(i, i + insertBatchSize);
          const sliceEmbeddings = embeddings.slice(i, i + slice.length);
          const rowsToInsert = slice.map((chunk, index) => ({
            repo_url: job.repo_url,
            user_id: job.user_id,
            api_key_id: job.api_key_id,
            credential_type: job.credential_type,
            embedding_model: model,
            file_path: chunk.path,
            content: chunk.content,
            embedding: sliceEmbeddings[index],
          }));

          const { error: insertError } = await supabaseAdmin
            .from("repository_chunks")
            .insert(rowsToInsert);

          if (insertError) {
            throw new Error(`Failed to insert repository chunks into Supabase: ${insertError.message}`);
          }

          insertedChunkCount += rowsToInsert.length;
          await maybeHeartbeat(false);
        }
      }
    };

    const ensureFlushed = async (force = false) => {
      if (flushInFlight) {
        await flushInFlight;
        if (!force) return;
      }
      flushInFlight = (async () => {
        try {
          await flushPendingChunks(force);
        } finally {
          flushInFlight = null;
        }
      })();
      await flushInFlight;
    };

    await runWithConcurrency(filesToIngest, fetchConcurrency, async (file) => {
      await maybeHeartbeat(false);

      let text = "";
      try {
        text = await fetchRawFileContent(job.repo_url, branch, file.path);
      } catch {
        console.warn("A repository file was skipped during ingestion.");
        return;
      }

      const chunks = splitIntoChunks(text, file.path);
      indexedFileCount += 1;
      preparedChunkCount += chunks.length;

      for (const content of chunks) {
        pendingChunks.push({ path: file.path, content });
      }

      await maybeHeartbeat(false);

      if (pendingChunks.length >= embedFlushChunks) {
        await ensureFlushed(false);
      }
    });

    await ensureFlushed(true);

    if (insertedChunkCount === 0) {
      throw new Error("Dandi could not read queryable repository content from GitHub.");
    }

    const completedJob = await updateJob(job.id, {
      status: "completed",
      current_step: "ready",
      files_count: filesToIngest.length,
      chunks_count: preparedChunkCount,
      indexed_file_count: indexedFileCount,
      chunk_count: insertedChunkCount,
      index_available: true,
      completed_at: new Date().toISOString(),
    });

    if (usageKeyData) {
      await incrementKeyUsage(
        usageKeyData,
        job.repo_url,
        Date.now() - startTime,
        "success",
        requestFromTelemetry(telemetry)
      );
    }

    return completedJob;
  } catch (err) {
    const message = sanitizeIngestionError(err);
    await updateJob(job.id, {
      status: "failed",
      current_step: "failed",
      error: message,
      error_message: message,
      failed_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    });

    if (usageKeyData) {
      await incrementKeyUsage(
        usageKeyData,
        job.repo_url,
        Date.now() - startTime,
        "error",
        requestFromTelemetry(telemetry)
      );
    }

    throw err;
  } finally {
    if (lockAcquired && lockKey) {
      try {
        await redis.del(lockKey);
      } catch {
        console.error("Failed to release an ingestion lock.");
      }
    }
  }
}
