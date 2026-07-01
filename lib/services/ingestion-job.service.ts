import { getRequestTelemetry } from "@/lib/account-environments";
import { isUuid } from "@/lib/security-core";
import { incrementKeyUsage } from "@/lib/services/api-key.service";
import { fetchGitHubBranch, fetchGitHubRepoTree, fetchRawFileContent } from "@/lib/services/github.service";
import { googleBatchEmbedWithModel, isGeminiEmbeddingRateLimitError } from "@/lib/services/google-gemini.service";
import { selectRagFiles } from "@/lib/services/rag-file-selection.service";
import { redis } from "@/lib/redis";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { IngestionJob, IngestionJobStep, IngestionKeyData, IngestionJobSummary } from "@/types/rag";

const LOCK_TTL_SEC = 900;

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
  if (isGeminiEmbeddingRateLimitError(err)) {
    return "Gemini embedding rate limit reached during ingestion. Please retry this repository after the quota window resets.";
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

  return message || "Repository ingestion failed.";
}

export function formatIngestionJob(job: IngestionJob): IngestionJobSummary {
  const indexedFileCount = job.status === "completed" ? job.indexed_file_count ?? job.files_count : job.indexed_file_count;
  const chunkCount = job.status === "completed" ? job.chunk_count ?? job.chunks_count : job.chunk_count;
  const errorMessage = job.error_message ?? job.error;

  return {
    jobId: job.id,
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
  if (!job.api_key_id && job.user_id === "demo-user-id") {
    return {
      id: "demo-id",
      name: "Playground Demo Key",
      usage_count: 0,
      monthly_limit: 1000,
      user_id: "demo-user-id",
      key_type: "production",
      plan: "Hobby",
    };
  }

  if (!job.api_key_id) return null;

  const { data, error } = await supabaseAdmin
    .from("api_keys")
    .select("id, name, usage_count, monthly_limit, user_id, key_type, is_active, alert_threshold, alert_channels, profiles(plan, email)")
    .eq("id", job.api_key_id)
    .single();

  if (error || !data) {
    console.warn("Failed to load API key for ingestion usage logging:", error?.message);
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

  return new Request("https://dandi.ai/internal/ingestion-job", { headers });
}

export async function createIngestionJob(input: {
  keyData: IngestionKeyData;
  repoUrl: string;
}): Promise<JobResult> {
  const existing = await activeJobQuery(input.keyData.user_id, input.repoUrl);
  if (existing.data) {
    return { job: toIngestionJob(existing.data), reused: true };
  }

  const { data, error } = await supabaseAdmin
    .from("ingestion_jobs")
    .insert({
      user_id: input.keyData.user_id,
      api_key_id: isUuid(input.keyData.id) ? input.keyData.id : null,
      repo_url: input.repoUrl,
      repo_name: getRepoName(input.repoUrl),
      status: "queued",
      current_step: "queued",
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      const duplicate = await activeJobQuery(input.keyData.user_id, input.repoUrl);
      if (duplicate.data) {
        return { job: toIngestionJob(duplicate.data), reused: true };
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
  const { data, error } = await supabaseAdmin
    .from("ingestion_jobs")
    .select("*")
    .eq("id", input.jobId)
    .eq("user_id", input.keyData.user_id)
    .single();

  if (error || !data) {
    throw new Error("Ingestion job not found.");
  }

  return toIngestionJob(data);
}

export async function listRecentIngestionJobs(input: {
  userId: string;
  limit?: number;
}) {
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 50);
  const { data, error } = await supabaseAdmin
    .from("ingestion_jobs")
    .select("*")
    .eq("user_id", input.userId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load ingestion jobs: ${error.message}`);
  }

  return (data ?? []).map(toIngestionJob);
}

export async function runIngestionJob(jobId: string, telemetry?: RequestTelemetry) {
  const startTime = Date.now();
  let lockAcquired = false;
  let lockKey = "";
  let job = await loadJob(jobId);
  const usageKeyData = await loadUsageKeyData(job);

  if (job.status === "completed") return job;

  try {
    lockKey = `lock:ingest:${job.user_id}:${job.repo_url}`;
    const locked = await redis.set(lockKey, job.id, { nx: true, ex: LOCK_TTL_SEC });
    if (!locked) {
      return job;
    }
    lockAcquired = true;

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
    });

    await supabaseAdmin
      .from("repository_chunks")
      .delete()
      .eq("repo_url", job.repo_url)
      .eq("user_id", job.user_id);

    const crawlResults = await Promise.all(
      filesToIngest.map(async (file) => {
        try {
          const text = await fetchRawFileContent(job.repo_url, branch, file.path);
          return { path: file.path, chunks: splitIntoChunks(text, file.path) };
        } catch (err) {
          console.error(`Failed to fetch or split ${file.path}:`, err);
          return { path: file.path, chunks: [] };
        }
      })
    );

    const allChunks = crawlResults.flatMap((result) =>
      result.chunks.map((content) => ({ path: result.path, content }))
    );

    job = await updateJob(job.id, {
      current_step: "indexing",
      chunks_count: allChunks.length,
    });

    if (allChunks.length > 0) {
      const { embeddings, model } = await googleBatchEmbedWithModel(allChunks.map((chunk) => chunk.content));
      const rowsToInsert = allChunks.map((chunk, index) => ({
        repo_url: job.repo_url,
        user_id: job.user_id,
        api_key_id: job.api_key_id,
        embedding_model: model,
        file_path: chunk.path,
        content: chunk.content,
        embedding: embeddings[index],
      }));

      const { error: insertError } = await supabaseAdmin
        .from("repository_chunks")
        .insert(rowsToInsert);

      if (insertError) {
        throw new Error(`Failed to insert repository chunks into Supabase: ${insertError.message}`);
      }
    }

    const completedJob = await updateJob(job.id, {
      status: "completed",
      current_step: "ready",
      files_count: filesToIngest.length,
      chunks_count: allChunks.length,
      indexed_file_count: filesToIngest.length,
      chunk_count: allChunks.length,
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
      } catch (err) {
        console.error(`Failed to release ingestion lock for ${lockKey}:`, err);
      }
    }
  }
}
