-- Base table creation for api_keys
-- This migration establishes the initial table that subsequent migrations ALTER.
CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  key_value text NOT NULL UNIQUE,
  key_type text NOT NULL CHECK (key_type IN ('development', 'production')),
  usage_count integer NOT NULL DEFAULT 0,
  monthly_limit integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
