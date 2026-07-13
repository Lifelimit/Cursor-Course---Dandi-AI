-- Durable, resumable repository ingestion and versioned indexes.
-- This migration is additive and intentionally does not rewrite existing migration history.

CREATE TABLE IF NOT EXISTS public.repository_index_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  repo_url text NOT NULL,
  commit_sha text,
  embedding_model text NOT NULL,
  status text NOT NULL DEFAULT 'building' CHECK (status IN ('building', 'active', 'retired', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  completed_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_repository_index_versions_active
  ON public.repository_index_versions(user_id, repo_url)
  WHERE status = 'active';

ALTER TABLE public.repository_chunks
  ADD COLUMN IF NOT EXISTS index_version uuid REFERENCES public.repository_index_versions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS chunk_index integer,
  ADD COLUMN IF NOT EXISTS content_hash text,
  ADD COLUMN IF NOT EXISTS start_offset integer,
  ADD COLUMN IF NOT EXISTS end_offset integer;

CREATE UNIQUE INDEX IF NOT EXISTS idx_repository_chunks_version_identity
  ON public.repository_chunks(index_version, file_path, chunk_index, content_hash);

-- Preserve existing owner-scoped indexes without rewriting their vectors. These
-- synthetic active versions have no commit SHA; the next refresh replaces them
-- with a commit-pinned build. Legacy rows without an owner remain unqueryable.
INSERT INTO public.repository_index_versions (user_id, repo_url, embedding_model, status, activated_at, completed_at)
SELECT DISTINCT rc.user_id, rc.repo_url, rc.embedding_model, 'active', now(), now()
FROM public.repository_chunks rc
WHERE rc.index_version IS NULL
  AND rc.user_id IS NOT NULL
ON CONFLICT DO NOTHING;

UPDATE public.repository_chunks rc
SET index_version = iv.id
FROM public.repository_index_versions iv
WHERE rc.index_version IS NULL
  AND rc.user_id IS NOT NULL
  AND iv.status = 'active'
  AND iv.user_id = rc.user_id
  AND iv.repo_url = rc.repo_url
  AND iv.embedding_model = rc.embedding_model;

ALTER TABLE public.ingestion_jobs
  ADD COLUMN IF NOT EXISTS selected_files jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS branch text,
  ADD COLUMN IF NOT EXISTS commit_sha text,
  ADD COLUMN IF NOT EXISTS index_version uuid REFERENCES public.repository_index_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS file_cursor integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chunk_cursor integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prepared_chunk_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS embedded_chunk_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS persisted_chunk_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS skipped_file_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_file_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS heartbeat_at timestamptz,
  ADD COLUMN IF NOT EXISTS lease_owner text,
  ADD COLUMN IF NOT EXISTS lease_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_provider_status integer,
  ADD COLUMN IF NOT EXISTS last_error_code text,
  ADD COLUMN IF NOT EXISTS cancel_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS quota_reserved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS usage_finalized boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phase_started_at timestamptz;

ALTER TABLE public.ingestion_jobs DROP CONSTRAINT IF EXISTS ingestion_jobs_status_check;
ALTER TABLE public.ingestion_jobs
  ADD CONSTRAINT ingestion_jobs_status_check
  CHECK (status IN ('queued', 'running', 'retrying', 'cancel_requested', 'completed', 'cancelled', 'failed'));

ALTER TABLE public.ingestion_jobs DROP CONSTRAINT IF EXISTS ingestion_jobs_current_step_check;
ALTER TABLE public.ingestion_jobs
  ADD CONSTRAINT ingestion_jobs_current_step_check
  CHECK (current_step IS NULL OR current_step IN (
    'queued', 'validating', 'fetching_tree', 'selecting_files', 'fetching_files',
    'chunking', 'embedding', 'persisting', 'finalizing', 'retrying', 'ready',
    'cancelled', 'failed',
    'cloning', 'analyzing', 'summarizing', 'indexing'
  ));

CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_worker_queue
  ON public.ingestion_jobs(status, retry_at, lease_expires_at, updated_at);

ALTER TABLE public.repository_index_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.repository_index_versions FROM anon, authenticated;
GRANT ALL ON TABLE public.repository_index_versions TO service_role;

DROP POLICY IF EXISTS "Service role can manage repository index versions" ON public.repository_index_versions;
CREATE POLICY "Service role can manage repository index versions"
  ON public.repository_index_versions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Retrieval is scoped to the one completed active index. A failed refresh never
-- removes the previous active version from the search path.
CREATE OR REPLACE FUNCTION public.match_repository_chunks(
  query_embedding extensions.vector(768),
  match_threshold float,
  match_count int,
  p_repo_url text,
  p_user_id text,
  p_embedding_model text DEFAULT 'gemini-embedding-001'
)
RETURNS TABLE (id uuid, file_path text, content text, similarity float)
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT rc.id, rc.file_path, rc.content,
    1 - (rc.embedding OPERATOR(extensions.<=>) query_embedding) AS similarity
  FROM public.repository_chunks rc
  JOIN public.repository_index_versions iv ON iv.id = rc.index_version
  WHERE iv.status = 'active'
    AND iv.user_id = p_user_id
    AND iv.repo_url = p_repo_url
    AND rc.embedding_model = p_embedding_model
    AND 1 - (rc.embedding OPERATOR(extensions.<=>) query_embedding) > match_threshold
  ORDER BY rc.embedding OPERATOR(extensions.<=>) query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_repository_index(
  p_version_id uuid,
  p_user_id text,
  p_repo_url text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.repository_index_versions
    WHERE id = p_version_id AND user_id = p_user_id AND repo_url = p_repo_url AND status = 'building'
  ) THEN
    RAISE EXCEPTION 'Repository index version is not an activatable build';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.repository_chunks WHERE index_version = p_version_id) THEN
    RAISE EXCEPTION 'Repository index version contains no persisted chunks';
  END IF;

  UPDATE public.repository_index_versions
  SET status = 'retired'
  WHERE user_id = p_user_id AND repo_url = p_repo_url AND status = 'active';

  UPDATE public.repository_index_versions
  SET status = 'active', activated_at = now(), completed_at = now()
  WHERE id = p_version_id;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_repository_index(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_repository_index(uuid, text, text) TO service_role;
