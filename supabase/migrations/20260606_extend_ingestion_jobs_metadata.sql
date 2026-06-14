ALTER TABLE public.ingestion_jobs
ADD COLUMN IF NOT EXISTS current_step text,
ADD COLUMN IF NOT EXISTS repo_name text,
ADD COLUMN IF NOT EXISTS failed_at timestamptz,
ADD COLUMN IF NOT EXISTS error_message text,
ADD COLUMN IF NOT EXISTS indexed_file_count integer,
ADD COLUMN IF NOT EXISTS chunk_count integer,
ADD COLUMN IF NOT EXISTS summary_available boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS index_available boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ingestion_jobs_current_step_check'
      AND conrelid = 'public.ingestion_jobs'::regclass
  ) THEN
    ALTER TABLE public.ingestion_jobs
    ADD CONSTRAINT ingestion_jobs_current_step_check
    CHECK (
      current_step IS NULL OR current_step IN (
        'queued',
        'cloning',
        'analyzing',
        'summarizing',
        'indexing',
        'ready',
        'failed'
      )
    ) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_user_status_updated
ON public.ingestion_jobs(user_id, status, updated_at DESC);
