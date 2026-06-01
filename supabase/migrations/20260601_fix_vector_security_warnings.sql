-- Keep pgvector outside the public schema and pin function name resolution.
-- This clears Supabase advisory warnings for vector and match_repository_chunks.
CREATE SCHEMA IF NOT EXISTS extensions;

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
ALTER EXTENSION vector SET SCHEMA extensions;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.match_repository_chunks(
  query_embedding extensions.vector(768),
  match_threshold float,
  match_count int,
  p_repo_url text
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
    AND 1 - (rc.embedding OPERATOR(extensions.<=>) query_embedding) > match_threshold
  ORDER BY rc.embedding OPERATOR(extensions.<=>) query_embedding
  LIMIT match_count;
END;
$$;
