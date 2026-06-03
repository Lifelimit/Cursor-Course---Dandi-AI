CREATE TABLE IF NOT EXISTS public.ingestion_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  repo_url text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  error text,
  files_count integer,
  chunks_count integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ingestion_jobs_active_user_repo
ON public.ingestion_jobs(user_id, repo_url)
WHERE status IN ('queued', 'running');

CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_user_created
ON public.ingestion_jobs(user_id, created_at DESC);

ALTER TABLE public.ingestion_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ingestion_jobs FROM anon, authenticated;
GRANT ALL ON TABLE public.ingestion_jobs TO service_role;

DROP POLICY IF EXISTS "Service role can manage ingestion jobs" ON public.ingestion_jobs;
CREATE POLICY "Service role can manage ingestion jobs"
  ON public.ingestion_jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
