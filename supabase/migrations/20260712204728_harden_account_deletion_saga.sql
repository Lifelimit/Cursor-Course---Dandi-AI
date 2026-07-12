-- Make account deletion a reversible, session-bound barrier before any
-- cross-provider cleanup begins. Client roles cannot inspect the key snapshot
-- or invoke these service-only functions.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_deletion_active_key_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS api_key_cleanup_pending_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS billing_mutation_lease_until timestamptz;

DROP FUNCTION IF EXISTS public.begin_account_deletion(text);

CREATE FUNCTION public.begin_account_deletion(p_profile_id text)
RETURNS TABLE(all_key_ids uuid[], previously_active_key_ids uuid[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  requested_at timestamptz;
  active_key_snapshot uuid[];
  pending_cleanup_ids uuid[];
  current_key_ids uuid[];
  billing_lease_until timestamptz;
BEGIN
  SELECT
    profile.account_deletion_requested_at,
    profile.account_deletion_active_key_ids,
    profile.api_key_cleanup_pending_ids,
    profile.billing_mutation_lease_until
  INTO requested_at, active_key_snapshot, pending_cleanup_ids, billing_lease_until
  FROM public.profiles AS profile
  WHERE profile.id = p_profile_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found.';
  END IF;

  IF billing_lease_until IS NOT NULL AND billing_lease_until > pg_catalog.now() THEN
    RAISE EXCEPTION USING
      ERRCODE = '55P03',
      MESSAGE = 'A billing mutation is still in progress.';
  END IF;

  IF requested_at IS NULL THEN
    SELECT COALESCE(
      array_agg(api_key.id ORDER BY api_key.created_at ASC, api_key.id ASC)
        FILTER (WHERE api_key.is_active = true),
      '{}'::uuid[]
    )
    INTO active_key_snapshot
    FROM public.api_keys AS api_key
    WHERE api_key.user_id = p_profile_id;
  END IF;

  UPDATE public.profiles
  SET account_deletion_requested_at = COALESCE(account_deletion_requested_at, pg_catalog.now()),
      account_deletion_active_key_ids = COALESCE(active_key_snapshot, '{}'::uuid[]),
      updated_at = pg_catalog.now()
  WHERE id = p_profile_id;

  UPDATE public.api_keys
  SET is_active = false
  WHERE user_id = p_profile_id
    AND is_active = true;

  SELECT COALESCE(
    pg_catalog.array_agg(cleanup_key.id ORDER BY cleanup_key.id),
    '{}'::uuid[]
  )
  INTO current_key_ids
  FROM (
    SELECT api_key.id
    FROM public.api_keys AS api_key
    WHERE api_key.user_id = p_profile_id
    UNION
    SELECT pending.key_id
    FROM pg_catalog.unnest(COALESCE(pending_cleanup_ids, '{}'::uuid[])) AS pending(key_id)
  ) AS cleanup_key;

  RETURN QUERY SELECT current_key_ids, COALESCE(active_key_snapshot, '{}'::uuid[]);
END;
$$;

CREATE OR REPLACE FUNCTION public.begin_owned_api_key_deletion(
  p_profile_id text,
  p_key_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  deletion_requested_at timestamptz;
  pending_cleanup_ids uuid[];
  deleted_key_id uuid;
BEGIN
  SELECT
    profile.account_deletion_requested_at,
    profile.api_key_cleanup_pending_ids
  INTO deletion_requested_at, pending_cleanup_ids
  FROM public.profiles AS profile
  WHERE profile.id = p_profile_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'profile_missing';
  END IF;

  IF deletion_requested_at IS NOT NULL THEN
    RETURN 'deletion_pending';
  END IF;

  pending_cleanup_ids := COALESCE(pending_cleanup_ids, '{}'::uuid[]);
  IF p_key_id = ANY(pending_cleanup_ids) THEN
    RETURN 'cleanup_pending';
  END IF;

  IF pg_catalog.cardinality(pending_cleanup_ids) >= 1000 THEN
    RAISE EXCEPTION USING
      ERRCODE = '54000',
      MESSAGE = 'Too many API-key cleanup operations are pending.';
  END IF;

  DELETE FROM public.api_keys
  WHERE id = p_key_id
    AND user_id = p_profile_id
  RETURNING id INTO deleted_key_id;

  IF deleted_key_id IS NULL THEN
    RETURN 'not_found';
  END IF;

  UPDATE public.profiles
  SET api_key_cleanup_pending_ids = pg_catalog.array_append(pending_cleanup_ids, deleted_key_id)
  WHERE id = p_profile_id;

  RETURN 'deleted';
END;
$$;

CREATE OR REPLACE FUNCTION public.acknowledge_api_key_redis_cleanup(
  p_profile_id text,
  p_key_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  acknowledged boolean;
BEGIN
  UPDATE public.profiles
  SET api_key_cleanup_pending_ids = pg_catalog.array_remove(api_key_cleanup_pending_ids, p_key_id)
  WHERE id = p_profile_id
    AND p_key_id = ANY(api_key_cleanup_pending_ids)
  RETURNING true INTO acknowledged;

  RETURN COALESCE(acknowledged, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.acquire_account_billing_lease(p_profile_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  deletion_requested_at timestamptz;
BEGIN
  SELECT profile.account_deletion_requested_at
  INTO deletion_requested_at
  FROM public.profiles AS profile
  WHERE profile.id = p_profile_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'profile_missing';
  END IF;

  IF deletion_requested_at IS NOT NULL THEN
    RETURN 'deletion_pending';
  END IF;

  UPDATE public.profiles
  SET billing_mutation_lease_until = pg_catalog.now() + interval '5 minutes'
  WHERE id = p_profile_id;

  RETURN 'acquired';
END;
$$;

CREATE OR REPLACE FUNCTION public.abort_account_deletion(p_profile_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  active_key_snapshot uuid[];
  owner_plan text;
  restore_limit integer;
BEGIN
  SELECT
    profile.account_deletion_active_key_ids,
    COALESCE(profile.plan, 'Hobby')
  INTO active_key_snapshot, owner_plan
  FROM public.profiles AS profile
  WHERE profile.id = p_profile_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found.';
  END IF;

  restore_limit := CASE owner_plan
    WHEN 'Researcher' THEN NULL
    WHEN 'Premium' THEN 10
    ELSE 3
  END;

  UPDATE public.profiles
  SET account_deletion_requested_at = NULL,
      account_deletion_active_key_ids = '{}'::uuid[],
      updated_at = pg_catalog.now()
  WHERE id = p_profile_id;

  WITH restore_candidates AS (
    SELECT snapshot.key_id
    FROM unnest(COALESCE(active_key_snapshot, '{}'::uuid[]))
      WITH ORDINALITY AS snapshot(key_id, position)
    JOIN public.api_keys AS api_key
      ON api_key.id = snapshot.key_id
     AND api_key.user_id = p_profile_id
    ORDER BY snapshot.position
    LIMIT COALESCE(restore_limit, 2147483647)
  )
  UPDATE public.api_keys AS api_key
  SET is_active = true
  WHERE api_key.user_id = p_profile_id
    AND api_key.id IN (SELECT key_id FROM restore_candidates)
    AND api_key.is_active = false;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_recent_account_session(
  p_user_id uuid,
  p_session_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.sessions AS session
    WHERE session.id = p_session_id
      AND session.user_id = p_user_id
      AND session.created_at >= pg_catalog.now() - interval '15 minutes'
  );
$$;

REVOKE ALL ON FUNCTION public.begin_account_deletion(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.begin_owned_api_key_deletion(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.acknowledge_api_key_redis_cleanup(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.acquire_account_billing_lease(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.abort_account_deletion(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_recent_account_session(uuid, uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.begin_account_deletion(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.begin_owned_api_key_deletion(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.acknowledge_api_key_redis_cleanup(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.acquire_account_billing_lease(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.abort_account_deletion(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_recent_account_session(uuid, uuid) TO service_role;

-- Owner key deletion now runs through the server RPC so every delete shares the
-- profile-row lock and durable Redis-cleanup tombstone with account deletion.
REVOKE DELETE ON TABLE public.api_keys FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "Users can delete own api keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can delete their own API keys" ON public.api_keys;
