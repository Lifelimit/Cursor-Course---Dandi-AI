-- Durable production webhook outbox and delivery history.
-- Secrets remain in profiles and are read only by the service role at claim time;
-- queued rows never duplicate or expose signing secrets.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS webhook_failure_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS webhook_disabled_until timestamptz,
  ADD COLUMN IF NOT EXISTS webhook_signing_version integer NOT NULL DEFAULT 1;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_webhook_signing_version_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_webhook_signing_version_check
  CHECK (webhook_signing_version = 1);

CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint_url text NOT NULL,
  event text NOT NULL,
  event_version integer NOT NULL DEFAULT 1,
  payload jsonb NOT NULL,
  dedupe_key text,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz,
  lock_token uuid,
  last_error text,
  response_status integer,
  latency_ms integer NOT NULL DEFAULT 0,
  response_headers jsonb,
  response_body text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  CONSTRAINT webhook_deliveries_status_check
    CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled')),
  CONSTRAINT webhook_deliveries_attempts_check CHECK (attempts >= 0),
  CONSTRAINT webhook_deliveries_event_version_check CHECK (event_version = 1)
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_claim
  ON public.webhook_deliveries(status, next_attempt_at, locked_until, created_at);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_user_history
  ON public.webhook_deliveries(user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_deliveries_dedupe
  ON public.webhook_deliveries(user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.webhook_deliveries FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.webhook_deliveries TO service_role;

CREATE OR REPLACE FUNCTION public.claim_webhook_deliveries(
  p_limit integer,
  p_lease_until timestamptz
)
RETURNS SETOF public.webhook_deliveries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT d.id
    FROM public.webhook_deliveries d
    JOIN public.profiles p ON p.id = d.user_id
    WHERE (
        d.status = 'pending'
        OR (d.status = 'processing' AND (d.locked_until IS NULL OR d.locked_until <= now()))
      )
      AND d.next_attempt_at <= now()
      AND (d.locked_until IS NULL OR d.locked_until <= now())
      AND NULLIF(trim(p.webhook_url), '') IS NOT NULL
      AND NULLIF(trim(p.webhook_secret), '') IS NOT NULL
      AND (p.webhook_disabled_until IS NULL OR p.webhook_disabled_until <= now())
    ORDER BY d.next_attempt_at ASC, d.created_at ASC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 1), 1), 100)
    FOR UPDATE OF d SKIP LOCKED
  )
  UPDATE public.webhook_deliveries d
  SET status = 'processing',
      attempts = d.attempts + 1,
      locked_until = p_lease_until,
      lock_token = gen_random_uuid(),
      updated_at = now()
  FROM candidates
  WHERE d.id = candidates.id
  RETURNING d.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_webhook_delivery_outcome(
  p_delivery_id uuid,
  p_lock_token uuid,
  p_success boolean,
  p_retry boolean,
  p_next_attempt_at timestamptz,
  p_response_status integer,
  p_latency_ms integer,
  p_response_headers jsonb,
  p_response_body text,
  p_error text,
  p_max_attempts integer,
  p_failure_threshold integer,
  p_circuit_seconds integer
)
RETURNS TABLE(updated boolean, delivery_status text, disabled_until timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id text;
  v_status text;
  v_disabled_until timestamptz;
BEGIN
  SELECT d.user_id
  INTO v_user_id
  FROM public.webhook_deliveries d
  WHERE d.id = p_delivery_id
    AND d.lock_token = p_lock_token
    AND d.status = 'processing';

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::text, NULL::timestamptz;
    RETURN;
  END IF;

  UPDATE public.webhook_deliveries d
  SET status = CASE
        WHEN p_success THEN 'succeeded'
        WHEN p_retry AND d.attempts < GREATEST(COALESCE(p_max_attempts, 8), 1) THEN 'pending'
        ELSE 'failed'
      END,
      next_attempt_at = CASE
        WHEN p_retry AND d.attempts < GREATEST(COALESCE(p_max_attempts, 8), 1)
          THEN COALESCE(p_next_attempt_at, now())
        ELSE d.next_attempt_at
      END,
      locked_until = NULL,
      lock_token = NULL,
      last_error = CASE WHEN p_success THEN NULL ELSE left(p_error, 500) END,
      response_status = p_response_status,
      latency_ms = GREATEST(COALESCE(p_latency_ms, 0), 0),
      response_headers = p_response_headers,
      response_body = left(p_response_body, 4000),
      delivered_at = CASE WHEN p_success THEN now() ELSE d.delivered_at END,
      updated_at = now()
  WHERE d.id = p_delivery_id
    AND d.lock_token = p_lock_token
    AND d.status = 'processing'
  RETURNING d.status INTO v_status;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::text, NULL::timestamptz;
    RETURN;
  END IF;

  IF p_success THEN
    UPDATE public.profiles
    SET webhook_failure_count = 0,
        webhook_disabled_until = NULL,
        updated_at = now()
    WHERE id = v_user_id
    RETURNING public.profiles.webhook_disabled_until INTO v_disabled_until;
  ELSIF p_retry THEN
    UPDATE public.profiles
    SET webhook_failure_count = webhook_failure_count + 1,
        webhook_disabled_until = CASE
          WHEN webhook_failure_count + 1 >= GREATEST(COALESCE(p_failure_threshold, 5), 1)
            THEN now() + make_interval(secs => GREATEST(COALESCE(p_circuit_seconds, 3600), 60))
          ELSE webhook_disabled_until
        END,
        updated_at = now()
    WHERE id = v_user_id
    RETURNING public.profiles.webhook_disabled_until INTO v_disabled_until;
  END IF;

  RETURN QUERY SELECT true, v_status, v_disabled_until;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_webhook_deliveries(integer, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_webhook_delivery_outcome(uuid, uuid, boolean, boolean, timestamptz, integer, integer, jsonb, text, text, integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_webhook_deliveries(integer, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_webhook_delivery_outcome(uuid, uuid, boolean, boolean, timestamptz, integer, integer, jsonb, text, text, integer, integer, integer) TO service_role;
