# Durable RAG ingestion worker

## Decision

Repository preparation is a durable database-backed job. `POST /api/rag/ingest` creates or reuses a job and returns immediately. The authenticated browser calls `/api/rag/ingest/advance` while it polls; each request claims one job lease and processes bounded chunks across a small number of selected files before persisting a checkpoint. Vercel invokes `/api/internal/rag/worker` through a daily cron recovery sweep for jobs whose browser was closed or whose request stopped unexpectedly.

The worker uses an ownership-checked Redis lock as a fast duplicate guard and a Supabase lease/heartbeat as the durable source of truth. A lost invocation becomes `retrying` and can resume from `file_cursor` and `chunk_cursor`. Quota reservation and final usage telemetry are persisted on the job so retries do not reserve or record the same lifecycle repeatedly.

## Index safety

Each refresh writes to a new `repository_index_versions` row. Chunks are keyed by index version, file path, chunk index, and content hash. The migration wraps existing owner-scoped chunks in a synthetic active version so they remain searchable; the next refresh replaces that version with a commit-pinned build. The `activate_repository_index` function retires the previous active version and activates the new version only after at least one chunk exists. Retrieval filters to the active completed version, so a failed refresh leaves the previous index usable.

## Operational contract

Set Vercel's `CRON_SECRET` for the scheduled invocation, or set `RAG_WORKER_SECRET` when using an explicitly authenticated worker invocation. Apply `supabase/migrations/20260713090000_durable_rag_ingestion.sql` before deploying code. Run `node scripts/rag-readiness.mjs` for read-only checks and `node scripts/rag-readiness.mjs --mutate` only against an environment where a temporary diagnostic row can be created and deleted.

Both worker routes are deliberately bounded by `maxDuration = 55`; neither is a promise that a single serverless request can finish a repository. The default worker slice embeds up to 16 chunks and advances up to four selected files, returning early when the safety window is reached. The polling advance route is authenticated with the user API key, rate-limited, and ownership-checked before it can claim work. The Vercel Hobby cron runs daily at 03:00 UTC as recovery; if the browser is closed, the job remains queued/retryable until that sweep or a later authenticated session resumes it.
