-- Make Stripe webhook claims recoverable after crashes and inaccessible to client roles.
-- This uniquely timestamped migration is required by the deployed webhook handler.
ALTER TABLE public.stripe_webhook_events
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'processed',
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until timestamptz,
  ADD COLUMN IF NOT EXISTS lock_token uuid,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.stripe_webhook_events
SET status = 'processed',
    processed_at = COALESCE(processed_at, created_at),
    updated_at = COALESCE(updated_at, created_at)
WHERE status IS NULL OR status NOT IN ('processing', 'processed', 'failed');

ALTER TABLE public.stripe_webhook_events
  DROP CONSTRAINT IF EXISTS stripe_webhook_events_status_check;

ALTER TABLE public.stripe_webhook_events
  ADD CONSTRAINT stripe_webhook_events_status_check
  CHECK (status IN ('processing', 'processed', 'failed'));

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_status_lock
  ON public.stripe_webhook_events(status, locked_until);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.stripe_webhook_events FROM anon, authenticated;
GRANT ALL ON TABLE public.stripe_webhook_events TO service_role;

CREATE OR REPLACE FUNCTION public.claim_stripe_webhook_event(
  p_event_id text,
  p_lease_until timestamptz
)
RETURNS TABLE(claimed boolean, processed boolean, lock_token uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.stripe_webhook_events (id, status, attempts, locked_until, lock_token, updated_at)
  VALUES (p_event_id, 'processing', 1, p_lease_until, pg_catalog.gen_random_uuid(), pg_catalog.now())
  ON CONFLICT (id) DO UPDATE
    SET status = 'processing',
        attempts = public.stripe_webhook_events.attempts + 1,
        locked_until = EXCLUDED.locked_until,
        lock_token = EXCLUDED.lock_token,
        last_error = NULL,
        updated_at = pg_catalog.now()
    WHERE public.stripe_webhook_events.status <> 'processed'
      AND (public.stripe_webhook_events.locked_until IS NULL OR public.stripe_webhook_events.locked_until <= pg_catalog.now());

  IF FOUND THEN
    RETURN QUERY
    SELECT true, false, events.lock_token
    FROM public.stripe_webhook_events AS events
    WHERE events.id = p_event_id;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT false, EXISTS (
    SELECT 1
    FROM public.stripe_webhook_events
    WHERE id = p_event_id AND status = 'processed'
  ), NULL::uuid;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_stripe_webhook_event(text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_stripe_webhook_event(text, timestamptz) TO service_role;
