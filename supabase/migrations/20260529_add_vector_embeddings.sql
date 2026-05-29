-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create table to hold repository code chunks
CREATE TABLE IF NOT EXISTS repository_chunks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_url     text NOT NULL,
  file_path    text NOT NULL,
  content      text NOT NULL,
  embedding    vector(768),
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Index using HNSW and cosine distance for fast semantic retrieval
CREATE INDEX IF NOT EXISTS idx_repo_chunks_embedding 
ON repository_chunks 
USING hnsw (embedding vector_cosine_ops);

-- Similarity matching function for repository RAG querying
CREATE OR REPLACE FUNCTION match_repository_chunks(
  query_embedding vector(768),
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
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rc.id,
    rc.file_path,
    rc.content,
    1 - (rc.embedding <=> query_embedding) AS similarity
  FROM repository_chunks rc
  WHERE rc.repo_url = p_repo_url
    AND 1 - (rc.embedding <=> query_embedding) > match_threshold
  ORDER BY rc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
