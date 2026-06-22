CREATE TABLE IF NOT EXISTS public.github_app_installations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  installation_id bigint NOT NULL,
  github_account_id bigint,
  github_account_login text NOT NULL,
  github_account_name text,
  github_account_type text NOT NULL CHECK (github_account_type IN ('User', 'Organization')),
  repository_selection text NOT NULL DEFAULT 'unknown' CHECK (repository_selection IN ('all', 'selected', 'unknown')),
  repository_count integer CHECK (repository_count IS NULL OR repository_count >= 0),
  connected_at timestamptz NOT NULL DEFAULT now(),
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, installation_id)
);

CREATE INDEX IF NOT EXISTS idx_github_app_installations_user_id
  ON public.github_app_installations(user_id);

CREATE INDEX IF NOT EXISTS idx_github_app_installations_installation_id
  ON public.github_app_installations(installation_id);

ALTER TABLE public.github_app_installations ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.github_app_installations TO authenticated;

DROP POLICY IF EXISTS "Users can view their GitHub App installations"
  ON public.github_app_installations;
DROP POLICY IF EXISTS "Users can insert their GitHub App installations"
  ON public.github_app_installations;
DROP POLICY IF EXISTS "Users can update their GitHub App installations"
  ON public.github_app_installations;
DROP POLICY IF EXISTS "Users can delete their GitHub App installations"
  ON public.github_app_installations;

CREATE POLICY "Users can view their GitHub App installations"
  ON public.github_app_installations
  FOR SELECT
  TO authenticated
  USING ((select auth.uid())::text = user_id);

CREATE POLICY "Users can insert their GitHub App installations"
  ON public.github_app_installations
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid())::text = user_id);

CREATE POLICY "Users can update their GitHub App installations"
  ON public.github_app_installations
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid())::text = user_id)
  WITH CHECK ((select auth.uid())::text = user_id);

CREATE POLICY "Users can delete their GitHub App installations"
  ON public.github_app_installations
  FOR DELETE
  TO authenticated
  USING ((select auth.uid())::text = user_id);
