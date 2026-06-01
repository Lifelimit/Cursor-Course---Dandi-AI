-- Baseline profiles table required by later profile, billing, and auth-trigger migrations.
CREATE TABLE IF NOT EXISTS public.profiles (
  id text PRIMARY KEY,
  email text UNIQUE,
  full_name text,
  avatar_url text,
  org_slug text,
  plan text NOT NULL DEFAULT 'Hobby' CHECK (plan IN ('Hobby', 'Premium', 'Researcher')),
  webhook_url text,
  webhook_secret text,
  github_connected boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
