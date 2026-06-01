-- repository_chunks is a server-managed RAG index.
-- Keep client roles out while giving the service role an explicit RLS policy.
ALTER TABLE public.repository_chunks ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.repository_chunks FROM anon, authenticated;
GRANT ALL ON TABLE public.repository_chunks TO service_role;

DROP POLICY IF EXISTS "Service role can manage repository chunks" ON public.repository_chunks;
CREATE POLICY "Service role can manage repository chunks"
  ON public.repository_chunks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
