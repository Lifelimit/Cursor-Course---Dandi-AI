-- Track the embedding model used for each RAG chunk so query embeddings stay in the same vector space.
ALTER TABLE public.repository_chunks
ADD COLUMN IF NOT EXISTS embedding_model text NOT NULL DEFAULT 'gemini-embedding-001';

CREATE INDEX IF NOT EXISTS idx_repository_chunks_user_repo_model
ON public.repository_chunks(user_id, repo_url, embedding_model);

CREATE OR REPLACE FUNCTION public.match_repository_chunks(
  query_embedding extensions.vector(768),
  match_threshold float,
  match_count int,
  p_repo_url text,
  p_user_id text,
  p_embedding_model text DEFAULT 'gemini-embedding-001'
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
    AND rc.embedding_model = p_embedding_model
    AND 1 - (rc.embedding OPERATOR(extensions.<=>) query_embedding) > match_threshold
  ORDER BY rc.embedding OPERATOR(extensions.<=>) query_embedding
  LIMIT match_count;
END;
$$;
