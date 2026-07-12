-- Apply a terminal Stripe downgrade and the user's explicit Hobby key selection
-- in one transaction. The webhook resolves the profile first, while this RPC
-- repeats both identity predicates so stale or mismatched metadata fails closed.
CREATE OR REPLACE FUNCTION public.apply_stripe_hobby_downgrade(
  p_profile_id text,
  p_customer_id text,
  p_keys_to_keep uuid[],
  p_has_explicit_key_selection boolean
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_keys uuid[];
  updated_profile_id text;
BEGIN
  SELECT COALESCE(pg_catalog.array_agg(DISTINCT selected_key), '{}'::uuid[])
  INTO selected_keys
  FROM pg_catalog.unnest(COALESCE(p_keys_to_keep, '{}'::uuid[])) AS selected(selected_key)
  WHERE selected_key IS NOT NULL;

  IF NULLIF(pg_catalog.btrim(p_profile_id), '') IS NULL
     OR NULLIF(pg_catalog.btrim(p_customer_id), '') IS NULL THEN
    RAISE EXCEPTION 'Stripe profile binding is required.';
  END IF;

  IF pg_catalog.cardinality(selected_keys) > 3 THEN
    RAISE EXCEPTION 'At most three API keys may remain active on Hobby.';
  END IF;

  UPDATE public.profiles
  SET plan = 'Hobby',
      stripe_subscription_id = NULL,
      billing_interval = NULL,
      billing_next_date = NULL,
      stripe_scheduled_plan = NULL,
      stripe_scheduled_plan_date = NULL,
      updated_at = pg_catalog.now()
  WHERE id = p_profile_id
    AND stripe_customer_id = p_customer_id
  RETURNING id INTO updated_profile_id;

  IF updated_profile_id IS NULL THEN
    RAISE EXCEPTION 'Stripe profile binding mismatch.';
  END IF;

  IF COALESCE(p_has_explicit_key_selection, false) THEN
    -- The profile downgrade trigger may have disabled a different set based on
    -- age. Reset first, then enable exactly the surviving selected owner keys.
    -- An empty selection is intentionally handled by the trigger's normal
    -- oldest-three fallback and must not enter this branch.
    UPDATE public.api_keys
    SET is_active = false
    WHERE user_id = updated_profile_id
      AND is_active = true;

    IF pg_catalog.cardinality(selected_keys) <> (
      SELECT count(*)
      FROM public.api_keys
      WHERE id = ANY(selected_keys)
        AND user_id = updated_profile_id
    ) THEN
      RAISE EXCEPTION 'Selected API key ownership mismatch.';
    END IF;

    UPDATE public.api_keys
    SET is_active = true
    WHERE user_id = updated_profile_id
      AND id = ANY(selected_keys)
      AND is_active = false;
  END IF;

  RETURN updated_profile_id;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_stripe_hobby_downgrade(text, text, uuid[], boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_stripe_hobby_downgrade(text, text, uuid[], boolean)
  TO service_role;
