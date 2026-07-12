-- Scope repository embeddings to the authenticated API-key owner.
ALTER TABLE public.repository_chunks
ADD COLUMN IF NOT EXISTS user_id text,
ADD COLUMN IF NOT EXISTS api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_repository_chunks_user_repo
ON public.repository_chunks(user_id, repo_url);

-- Existing unowned rows are intentionally left unqueryable by the owner-scoped RPC.
CREATE OR REPLACE FUNCTION public.match_repository_chunks(
  query_embedding extensions.vector(768),
  match_threshold float,
  match_count int,
  p_repo_url text,
  p_user_id text
)
RETURNS TABLE (
  id uuid,
  file_path text,
  content text,
  similarity float
)
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rc.id,
    rc.file_path,
    rc.content,
    1 - (rc.embedding OPERATOR(extensions.<=>) query_embedding) AS similarity
  FROM public.repository_chunks rc
  WHERE rc.repo_url = p_repo_url
    AND rc.user_id = p_user_id
    AND 1 - (rc.embedding OPERATOR(extensions.<=>) query_embedding) > match_threshold
  ORDER BY rc.embedding OPERATOR(extensions.<=>) query_embedding
  LIMIT match_count;
END;
$$;

-- Persist enough usage data for CSV exports without granting direct client access.
ALTER TABLE public.api_usage_log
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error')),
ADD COLUMN IF NOT EXISTS latency_ms integer NOT NULL DEFAULT 0;

ALTER TABLE public.api_usage_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.api_usage_log FROM anon, authenticated;
GRANT ALL ON TABLE public.api_usage_log TO service_role;

DROP POLICY IF EXISTS "Service role can manage usage logs" ON public.api_usage_log;
CREATE POLICY "Service role can manage usage logs"
  ON public.api_usage_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
