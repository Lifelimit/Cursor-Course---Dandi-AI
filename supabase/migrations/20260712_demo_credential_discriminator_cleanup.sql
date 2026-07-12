-- Distinguish demo-originated ingestion/index data from ordinary API-key data.
ALTER TABLE public.ingestion_jobs
  ADD COLUMN IF NOT EXISTS credential_type text NOT NULL DEFAULT 'api_key';

ALTER TABLE public.repository_chunks
  ADD COLUMN IF NOT EXISTS credential_type text NOT NULL DEFAULT 'api_key';

ALTER TABLE public.ingestion_jobs
  DROP CONSTRAINT IF EXISTS ingestion_jobs_credential_type_check;

ALTER TABLE public.ingestion_jobs
  ADD CONSTRAINT ingestion_jobs_credential_type_check
  CHECK (credential_type IN ('api_key', 'demo'));

ALTER TABLE public.repository_chunks
  DROP CONSTRAINT IF EXISTS repository_chunks_credential_type_check;

ALTER TABLE public.repository_chunks
  ADD CONSTRAINT repository_chunks_credential_type_check
  CHECK (credential_type IN ('api_key', 'demo'));

CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_credential_type
  ON public.ingestion_jobs(credential_type, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_repository_chunks_credential_type
  ON public.repository_chunks(credential_type, user_id, created_at DESC);

-- Rows created by the legacy shared demo owner are the only historical rows
-- that can be identified without guessing at user-owned data.
UPDATE public.ingestion_jobs
SET credential_type = 'demo'
WHERE user_id = 'demo-user-id'
  AND api_key_id IS NULL;

UPDATE public.repository_chunks
SET credential_type = 'demo'
WHERE user_id = 'demo-user-id'
  AND api_key_id IS NULL;

DELETE FROM public.repository_chunks
WHERE credential_type = 'demo'
  AND user_id = 'demo-user-id';

DELETE FROM public.ingestion_jobs
WHERE credential_type = 'demo'
  AND user_id = 'demo-user-id';
