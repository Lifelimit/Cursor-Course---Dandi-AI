import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(process.cwd());
const read = (file) => readFileSync(resolve(root, file), "utf8");

test("ingestion runs directly through Gemini and has no worker or cron path", () => {
  const route = read("app/api/rag/ingest/route.ts");
  const advance = read("app/api/rag/ingest/advance/route.ts");
  assert.match(route, /processIngestionJob/);
  assert.match(route, /maxDuration = 55/);
  assert.match(advance, /processIngestionJob/);
  assert.match(advance, /maxDuration = 55/);
  assert.match(advance, /getIngestionJob/);
  assert.deepEqual(JSON.parse(read("vercel.json")), {});
  assert.doesNotMatch(route, /after\(/);
});

test("embedding reliability is bounded and validates the provider contract", () => {
  const source = read("lib/services/google-gemini.service.ts");
  assert.match(source, /RAG_EMBED_REQUEST_TIMEOUT_MS/);
  assert.match(source, /new AbortController\(\)/);
  assert.match(source, /RAG_EMBED_MAX_ATTEMPTS/);
  assert.match(source, /retryAfter/);
  assert.match(source, /Number\.isFinite/);
  assert.match(source, /values\.length !== EMBEDDING_DIMENSIONS/);
  assert.match(source, /values\.length !== expectedCount/);
});

test("direct ingestion checkpoints are lease- and index-version-aware", () => {
  const service = read("lib/services/ingestion-job.service.ts");
  const migration = read("supabase/migrations/20260713090000_durable_rag_ingestion.sql");
  assert.match(service, /claimIngestionJob/);
  assert.match(service, /file_cursor/);
  assert.match(service, /chunk_cursor/);
  assert.match(service, /refreshIngestionLock/);
  assert.match(service, /releaseIngestionLock/);
  assert.match(service, /latest\.cancel_requested_at/);
  assert.match(service, /DEFAULT_INGESTION_MAX_MS = 45_000/);
  assert.match(service, /DEFAULT_FILE_FETCH_CONCURRENCY = 4/);
  assert.match(service, /Promise\.all\(filesToFetch\.map/);
  assert.match(service, /INGESTION_SAFETY_WINDOW_MS/);
  assert.match(service, /batch\.push\(\.\.\.fileBatch\)/);
  assert.match(service, /const remaining = embeddingBatchSize - batch\.length/);
  assert.doesNotMatch(service, /processQueuedIngestionJobs|RAG_WORKER_MAX/);
  assert.match(service, /upsert\(rows, \{ onConflict: "index_version,file_path,chunk_index,content_hash" \}\)/);
  assert.match(migration, /repository_index_versions/);
  assert.match(migration, /activate_repository_index/);
  assert.match(migration, /heartbeat_at/);
  assert.match(migration, /lease_expires_at/);
  assert.match(migration, /quota_reserved/);
  assert.match(migration, /usage_finalized/);
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS idx_repository_chunks_version_identity[\s\S]*ON public\.repository_chunks\(index_version, file_path, chunk_index, content_hash\);/);
  assert.doesNotMatch(migration, /WHERE index_version IS NOT NULL/);
});

test("durable ingestion chunk upserts use an inferable unique index", () => {
  const migration = read("supabase/migrations/20260713210000_fix_repository_chunk_upsert_conflict.sql");
  assert.match(migration, /DROP INDEX IF EXISTS public\.idx_repository_chunks_version_identity/);
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS idx_repository_chunks_version_identity/);
  assert.doesNotMatch(migration, /WHERE index_version IS NOT NULL/);
});

test("retrieval is limited to the active completed index", () => {
  const migration = read("supabase/migrations/20260713090000_durable_rag_ingestion.sql");
  assert.match(migration, /iv\.status = 'active'/);
  assert.match(migration, /iv\.user_id = p_user_id/);
  assert.match(migration, /rc\.embedding_model = p_embedding_model/);
  assert.match(read("app/api/rag/chat/route.ts"), /match_repository_chunks/);
});

test("polling remains active for retryable and resumable states", () => {
  const hook = read("hooks/useRepositoryIngestion.ts");
  assert.match(hook, /while \(!controller\.signal\.aborted\)/);
  assert.match(hook, /\/api\/rag\/ingest\/advance/);
  assert.match(hook, /method: "POST"/);
  assert.match(hook, /"retrying"/);
  assert.match(hook, /statusData\.status === "cancelled"/);
  assert.match(hook, /Retry-After|retryAfter/);
});
