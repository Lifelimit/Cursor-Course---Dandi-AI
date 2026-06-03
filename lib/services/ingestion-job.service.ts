import { fetchWithRetry } from "@/lib/http-retry";
import { getRequestTelemetry } from "@/lib/account-environments";
import { isUuid } from "@/lib/security-core";
import { incrementKeyUsage } from "@/lib/services/api-key.service";
import { fetchGitHubBranch, fetchGitHubRepoTree, fetchRawFileContent } from "@/lib/services/github.service";
import { selectRagFiles } from "@/lib/services/rag-file-selection.service";
import { redis } from "@/lib/redis";
import { supabaseAdmin } from "@/lib/supabase-admin";

const BATCH_SIZE = 100;
const BATCH_DELAY_MS = 500;
const LOCK_TTL_SEC = 900;

export type IngestionJobStatus = "queued" | "running" | "completed" | "failed";

export type IngestionJob = {
  id: string;
  user_id: string;
  api_key_id: string | null;
  repo_url: string;
  status: IngestionJobStatus;
  error: string | null;
  files_count: number | null;
  chunks_count: number | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
};

export type IngestionKeyData = {
  id: string;
  name: string;
  usage_count: number;
  monthly_limit: number | null;
  user_id: string;
  key_type: "development" | "production";
  plan?: string;
  is_active?: boolean;
  alert_threshold?: number | null;
  alert_channels?: string[] | null;
  email?: string | null;
};

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

async function googleBatchEmbed(values: string[]): Promise<number[][]> {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("Google Generative AI API key is missing.");
  }

  const batches: string[][] = [];
  for (let i = 0; i < values.length; i += BATCH_SIZE) {
    batches.push(values.slice(i, i + BATCH_SIZE));
  }

  const embeddingsResults: number[][][] = [];

  for (let i = 0; i < batches.length; i++) {
    const requests = batches[i].map((text) => ({
      model: "models/gemini-embedding-001",
      content: { parts: [{ text }] },
      outputDimensionality: 768,
    }));

    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requests }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Google Batch Embedding API error: ${JSON.stringify(errorData)}`);
    }

    const data = (await response.json()) as { embeddings: { values: number[] }[] };
    embeddingsResults.push(data.embeddings.map((embedding) => embedding.values));

    if (i < batches.length - 1 && BATCH_DELAY_MS > 0) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  return embeddingsResults.flat();
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
      status: "queued",
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
      error: null,
      started_at: job.started_at ?? new Date().toISOString(),
    });

    const branch = await fetchGitHubBranch(job.repo_url);
    const tree = await fetchGitHubRepoTree(job.repo_url, branch);
    const filesToIngest = selectRagFiles(tree);

    if (filesToIngest.length === 0) {
      throw new Error("No queryable text or code assets found in this repository.");
    }

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

    if (allChunks.length > 0) {
      const embeddings = await googleBatchEmbed(allChunks.map((chunk) => chunk.content));
      const rowsToInsert = allChunks.map((chunk, index) => ({
        repo_url: job.repo_url,
        user_id: job.user_id,
        api_key_id: job.api_key_id,
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
      files_count: filesToIngest.length,
      chunks_count: allChunks.length,
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
    const message = err instanceof Error ? err.message : String(err);
    await updateJob(job.id, {
      status: "failed",
      error: message,
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
