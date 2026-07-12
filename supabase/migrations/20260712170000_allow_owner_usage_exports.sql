-- Allow authenticated users to export only their own durable usage rows.
-- Writes remain service-role-only.

ALTER TABLE public.api_usage_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can export their own usage logs" ON public.api_usage_log;
CREATE POLICY "Users can export their own usage logs"
  ON public.api_usage_log
  FOR SELECT
  TO authenticated
  USING ((select auth.uid())::text = user_id);

GRANT SELECT (
  api_key_id,
  user_id,
  repo_url,
  used_at,
  status,
  latency_ms
) ON public.api_usage_log TO authenticated;
