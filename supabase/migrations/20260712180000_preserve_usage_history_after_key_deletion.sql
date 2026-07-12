-- Usage history belongs to the account, not to the lifecycle of one API key.
-- Preserve the bounded 90-day audit/export record when a key is deleted while
-- keeping the key reference nullable for metadata joins.

ALTER TABLE public.api_usage_log
  ALTER COLUMN api_key_id DROP NOT NULL;

ALTER TABLE public.api_usage_log
  DROP CONSTRAINT IF EXISTS api_usage_log_api_key_id_fkey;

ALTER TABLE public.api_usage_log
  ADD CONSTRAINT api_usage_log_api_key_id_fkey
  FOREIGN KEY (api_key_id)
  REFERENCES public.api_keys(id)
  ON DELETE SET NULL;

-- The retention trigger prunes by timestamp across accounts. Give that global
-- predicate a matching index instead of relying on the user/key composite ones.
CREATE INDEX IF NOT EXISTS idx_api_usage_log_used_at
  ON public.api_usage_log(used_at);
