# Durable RAG ingestion with direct Gemini execution

## Decision

Repository preparation is a durable database-backed job. `POST /api/rag/ingest` creates or reuses a job and directly runs the Gemini embedding pipeline until the request safety window is reached. Larger jobs continue through the authenticated `/api/rag/ingest/advance` route after each durable checkpoint. There is no background ingestion worker or cron recovery path; a later authenticated page load resumes an active job.

The direct executor uses an ownership-checked Redis lock as a fast duplicate guard and a Supabase lease/heartbeat as the durable source of truth. A lost request becomes `retrying` and can resume from `file_cursor` and `chunk_cursor`. Each Gemini batch is persisted before its cursor is advanced; replaying a batch is safe because chunk identity is unique and persistence uses an idempotent upsert. Quota reservation and final usage telemetry are persisted on the job so retries do not reserve or record the same lifecycle repeatedly.

## Index safety

Each refresh writes to a new `repository_index_versions` row. Chunks are keyed by index version, file path, chunk index, and content hash. The migration wraps existing owner-scoped chunks in a synthetic active version so they remain searchable; the next refresh replaces that version with a commit-pinned build. The `activate_repository_index` function retires the previous active version and activates the new version only after at least one chunk exists. Retrieval filters to the active completed version, so a failed refresh leaves the previous index usable.

## Operational contract

Apply `supabase/migrations/20260713090000_durable_rag_ingestion.sql` before deploying code. Run `node scripts/rag-readiness.mjs` for read-only checks and `node scripts/rag-readiness.mjs --mutate` only against an environment where a temporary diagnostic row can be created and deleted.

The ingest and advance routes are deliberately bounded by `maxDuration = 55`; small repositories generally finish in one direct request, while larger repositories return after the safety window with a durable checkpoint. Gemini batches default to 100 embeddings with no fixed delay between successful batches. The advance route is authenticated with the user API key, rate-limited, and ownership-checked before it can claim work. If the browser is closed, a later authenticated session resumes the job.
