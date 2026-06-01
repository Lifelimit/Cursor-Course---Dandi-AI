-- Idempotency table for Stripe webhook delivery processing.
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
