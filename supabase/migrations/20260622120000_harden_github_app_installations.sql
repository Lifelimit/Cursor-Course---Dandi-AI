ALTER TABLE public.github_app_installations
  ADD COLUMN IF NOT EXISTS verified_repositories jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS verified_repository_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

ALTER TABLE public.github_app_installations
  DROP CONSTRAINT IF EXISTS github_app_installations_verified_repositories_check,
  ADD CONSTRAINT github_app_installations_verified_repositories_check
    CHECK (jsonb_typeof(verified_repositories) = 'array'),
  DROP CONSTRAINT IF EXISTS github_app_installations_verified_repository_count_check,
  ADD CONSTRAINT github_app_installations_verified_repository_count_check
    CHECK (verified_repository_count >= 0);

REVOKE ALL ON public.github_app_installations FROM anon;
REVOKE ALL ON public.github_app_installations FROM authenticated;
GRANT SELECT ON public.github_app_installations TO authenticated;

DROP POLICY IF EXISTS "Users can insert their GitHub App installations" ON public.github_app_installations;
DROP POLICY IF EXISTS "Users can update their GitHub App installations" ON public.github_app_installations;
DROP POLICY IF EXISTS "Users can delete their GitHub App installations" ON public.github_app_installations;

DROP POLICY IF EXISTS "Users can view their GitHub App installations" ON public.github_app_installations;
CREATE POLICY "Users can view their GitHub App installations"
  ON public.github_app_installations
  FOR SELECT
  TO authenticated
  USING ((select auth.uid())::text = user_id);
