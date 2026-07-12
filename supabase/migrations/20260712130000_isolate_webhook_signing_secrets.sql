-- Expand webhook signing-secret storage without breaking either deployment
-- order. The legacy column is retained temporarily for rollback and is hidden
-- from authenticated Data API reads with column-level privileges below.

CREATE TABLE IF NOT EXISTS public.profile_webhook_secrets (
  profile_id text PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  signing_secret text NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version = 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  rotated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_webhook_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.profile_webhook_secrets FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.profile_webhook_secrets TO service_role;

DROP POLICY IF EXISTS "Service role can manage webhook signing secrets"
  ON public.profile_webhook_secrets;
CREATE POLICY "Service role can manage webhook signing secrets"
  ON public.profile_webhook_secrets
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

INSERT INTO public.profile_webhook_secrets (profile_id, signing_secret)
SELECT id, webhook_secret
FROM public.profiles
WHERE NULLIF(trim(webhook_secret), '') IS NOT NULL
ON CONFLICT (profile_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.update_profile_webhook_configuration(
  p_profile_id text,
  p_webhook_url text,
  p_signing_secret text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.profiles
  SET webhook_url = NULLIF(trim(p_webhook_url), ''),
      webhook_secret = NULLIF(trim(p_signing_secret), ''),
      updated_at = now()
  WHERE id = p_profile_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found.';
  END IF;

  IF NULLIF(trim(p_signing_secret), '') IS NULL THEN
    DELETE FROM public.profile_webhook_secrets
    WHERE profile_id = p_profile_id;
  ELSE
    INSERT INTO public.profile_webhook_secrets (
      profile_id,
      signing_secret,
      rotated_at
    )
    VALUES (
      p_profile_id,
      trim(p_signing_secret),
      now()
    )
    ON CONFLICT (profile_id) DO UPDATE
      SET signing_secret = EXCLUDED.signing_secret,
          rotated_at = now();
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.update_profile_webhook_configuration(text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_profile_webhook_configuration(text, text, text)
  TO service_role;

-- Profile mutations are validated by authenticated server routes. Browser
-- clients retain owner-scoped SELECT only.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.profiles FROM authenticated;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Preserve owner-scoped RLS reads while preventing direct selection of the
-- rollback-only plaintext column.
REVOKE SELECT ON TABLE public.profiles FROM authenticated;
GRANT SELECT (
  id,
  email,
  full_name,
  avatar_url,
  org_slug,
  plan,
  webhook_url,
  github_connected,
  created_at,
  updated_at,
  billing_street,
  billing_city,
  billing_state,
  billing_zip,
  billing_country,
  stripe_customer_id,
  stripe_subscription_id,
  billing_interval,
  billing_next_date,
  payment_method_last4,
  payment_method_brand,
  payment_method_expiry,
  stripe_scheduled_plan,
  stripe_scheduled_plan_date
) ON public.profiles TO authenticated;
