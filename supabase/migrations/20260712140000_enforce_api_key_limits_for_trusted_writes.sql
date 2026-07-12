-- Enforce API-key plan and storage limits for every writer, including trusted
-- server routes. Trusted writers may update server-managed fields, but they do
-- not bypass business invariants.

CREATE OR REPLACE FUNCTION public.prevent_api_key_sensitive_updates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  is_trusted_role boolean;
  owner_plan text;
  plan_limit integer;
  key_limit integer;
  active_key_count integer;
  total_key_count integer;
  operational_key_cap constant integer := 1000;
BEGIN
  is_trusted_role := current_setting('request.jwt.claim.role', true) = 'service_role'
    OR current_user IN ('postgres', 'service_role');

  IF TG_OP = 'UPDATE' AND NOT is_trusted_role THEN
    IF OLD.user_id IS DISTINCT FROM NEW.user_id
       OR OLD.key_value IS DISTINCT FROM NEW.key_value
       OR OLD.hashed_key_value IS DISTINCT FROM NEW.hashed_key_value
       OR OLD.usage_count IS DISTINCT FROM NEW.usage_count
       OR OLD.created_at IS DISTINCT FROM NEW.created_at THEN
      RAISE EXCEPTION 'Direct updates to server-managed API key fields are not allowed.';
    END IF;
  END IF;

  PERFORM 1
  FROM public.profiles
  WHERE id = NEW.user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'API key owner profile does not exist.';
  END IF;

  SELECT p.plan
  INTO owner_plan
  FROM public.profiles p
  WHERE p.id = NEW.user_id;
  owner_plan := COALESCE(owner_plan, 'Hobby');

  IF TG_OP = 'INSERT' THEN
    SELECT count(*)
    INTO total_key_count
    FROM public.api_keys k
    WHERE k.user_id = NEW.user_id;

    IF total_key_count >= operational_key_cap THEN
      RAISE EXCEPTION 'Stored API key safety cap reached.';
    END IF;
  END IF;

  IF TG_OP = 'INSERT' OR OLD.monthly_limit IS DISTINCT FROM NEW.monthly_limit THEN
    IF NEW.monthly_limit IS NOT NULL AND NEW.monthly_limit < 1 THEN
      RAISE EXCEPTION 'Monthly limit must be NULL or a positive integer.';
    END IF;

    IF owner_plan <> 'Researcher' THEN
      plan_limit := CASE owner_plan
        WHEN 'Premium' THEN 5000
        ELSE 1000
      END;

      IF NEW.monthly_limit IS NOT NULL AND NEW.monthly_limit > plan_limit THEN
        RAISE EXCEPTION 'Monthly limit exceeds the user plan limit.';
      END IF;
    END IF;
  END IF;

  IF (TG_OP = 'INSERT' AND NEW.is_active = true)
     OR (TG_OP = 'UPDATE' AND OLD.is_active IS DISTINCT FROM NEW.is_active AND NEW.is_active = true) THEN
    IF owner_plan <> 'Researcher' THEN
      key_limit := CASE owner_plan
        WHEN 'Premium' THEN 10
        ELSE 3
      END;

      SELECT count(*)
      INTO active_key_count
      FROM public.api_keys k
      WHERE k.user_id = NEW.user_id
        AND k.is_active = true
        AND (TG_OP = 'INSERT' OR k.id <> NEW.id);

      IF active_key_count + 1 > key_limit THEN
        RAISE EXCEPTION 'Active API key limit exceeds the user plan limit.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
