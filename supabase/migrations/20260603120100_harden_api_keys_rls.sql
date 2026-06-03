-- Harden API key RLS and block direct client writes to sensitive/server-managed fields.
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);

DROP TRIGGER IF EXISTS prevent_api_key_sensitive_updates ON public.api_keys;
DROP FUNCTION IF EXISTS public.prevent_api_key_sensitive_updates();

CREATE OR REPLACE FUNCTION public.prevent_api_key_sensitive_updates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  owner_plan text;
  plan_limit integer;
  key_limit integer;
  active_key_count integer;
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR current_user IN ('postgres', 'service_role') THEN
    RETURN NEW;
  END IF;

  -- On UPDATE, check immutable/server-managed fields
  IF TG_OP = 'UPDATE' THEN
    IF OLD.user_id IS DISTINCT FROM NEW.user_id
       OR OLD.key_value IS DISTINCT FROM NEW.key_value
       OR OLD.hashed_key_value IS DISTINCT FROM NEW.hashed_key_value
       OR OLD.usage_count IS DISTINCT FROM NEW.usage_count
       OR OLD.created_at IS DISTINCT FROM NEW.created_at THEN
      RAISE EXCEPTION 'Direct updates to server-managed API key fields are not allowed.';
    END IF;
  END IF;

  -- Validate monthly_limit for INSERT or UPDATE (when changed or on insert)
  IF TG_OP = 'INSERT' OR OLD.monthly_limit IS DISTINCT FROM NEW.monthly_limit THEN
    IF NEW.monthly_limit IS NOT NULL AND NEW.monthly_limit < 1 THEN
      RAISE EXCEPTION 'Monthly limit must be NULL or a positive integer.';
    END IF;

    SELECT COALESCE(p.plan, 'Hobby')
      INTO owner_plan
      FROM public.profiles p
      WHERE p.id = NEW.user_id;

    owner_plan := COALESCE(owner_plan, 'Hobby');

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

  -- Validate active key limits for INSERT or UPDATE (when changed to true, or on insert when true)
  IF TG_OP = 'INSERT' OR (OLD.is_active IS DISTINCT FROM NEW.is_active) THEN
    IF NEW.is_active = true THEN
      SELECT COALESCE(p.plan, 'Hobby')
        INTO owner_plan
        FROM public.profiles p
        WHERE p.id = NEW.user_id;

      owner_plan := COALESCE(owner_plan, 'Hobby');

      IF owner_plan <> 'Researcher' THEN
        key_limit := CASE owner_plan
          WHEN 'Premium' THEN 10
          ELSE 3
        END;

        -- Concurrency protection: serialize key activations/inserts for the same user
        PERFORM 1 FROM public.profiles WHERE id = NEW.user_id FOR UPDATE;

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
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_api_key_sensitive_updates
  BEFORE INSERT OR UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_api_key_sensitive_updates();

DROP POLICY IF EXISTS "Users can view own api keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can view their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can insert own api keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can insert their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can update own api keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can update their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can delete own api keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can delete their own API keys" ON public.api_keys;

CREATE POLICY "Users can view their own API keys"
  ON public.api_keys
  FOR SELECT
  TO authenticated
  USING ((select auth.uid())::text = user_id);

CREATE POLICY "Users can update their own API keys"
  ON public.api_keys
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid())::text = user_id)
  WITH CHECK ((select auth.uid())::text = user_id);

CREATE POLICY "Users can delete their own API keys"
  ON public.api_keys
  FOR DELETE
  TO authenticated
  USING ((select auth.uid())::text = user_id);
