-- PostgREST upserts need to infer a complete unique index from the onConflict
-- columns. A partial index cannot be inferred by the repository chunk writer.
-- The non-partial index remains compatible with legacy rows because PostgreSQL
-- allows multiple NULL values in a unique index.
DROP INDEX IF EXISTS public.idx_repository_chunks_version_identity;

CREATE UNIQUE INDEX IF NOT EXISTS idx_repository_chunks_version_identity
  ON public.repository_chunks(index_version, file_path, chunk_index, content_hash);
