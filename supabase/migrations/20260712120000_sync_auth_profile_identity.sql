-- Keep the public profile projection attached to the immutable Auth user ID.
-- Auth is the only authority allowed to synchronize email identity.

CREATE OR REPLACE FUNCTION public.prevent_profile_billing_managed_updates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  is_trusted_role boolean;
  is_auth_identity_sync boolean;
  old_plan_rank integer;
  new_plan_rank integer;
  new_plan_limit integer;
  new_active_key_limit integer;
BEGIN
  is_trusted_role := current_setting('request.jwt.claim.role', true) = 'service_role'
    OR current_user IN ('postgres', 'service_role');
  is_auth_identity_sync := current_setting('dandi.auth_profile_sync', true) = 'on';

  IF OLD.id IS DISTINCT FROM NEW.id THEN
    RAISE EXCEPTION 'Profile owner IDs are immutable.';
  END IF;

  IF OLD.email IS DISTINCT FROM NEW.email AND NOT is_auth_identity_sync THEN
    RAISE EXCEPTION 'Profile email is synchronized from Auth.';
  END IF;

  IF NOT is_trusted_role THEN
    IF OLD.plan IS DISTINCT FROM NEW.plan
       OR OLD.stripe_customer_id IS DISTINCT FROM NEW.stripe_customer_id
       OR OLD.stripe_subscription_id IS DISTINCT FROM NEW.stripe_subscription_id
       OR OLD.billing_interval IS DISTINCT FROM NEW.billing_interval
       OR OLD.billing_next_date IS DISTINCT FROM NEW.billing_next_date
       OR OLD.payment_method_brand IS DISTINCT FROM NEW.payment_method_brand
       OR OLD.payment_method_last4 IS DISTINCT FROM NEW.payment_method_last4
       OR OLD.payment_method_expiry IS DISTINCT FROM NEW.payment_method_expiry THEN
      RAISE EXCEPTION 'Direct updates to billing-managed profile fields are not allowed.';
    END IF;
  END IF;

  IF is_trusted_role AND OLD.plan IS DISTINCT FROM NEW.plan THEN
    old_plan_rank := CASE OLD.plan
      WHEN 'Researcher' THEN 2
      WHEN 'Premium' THEN 1
      ELSE 0
    END;
    new_plan_rank := CASE NEW.plan
      WHEN 'Researcher' THEN 2
      WHEN 'Premium' THEN 1
      ELSE 0
    END;
    new_plan_limit := CASE NEW.plan
      WHEN 'Researcher' THEN NULL
      WHEN 'Premium' THEN 5000
      ELSE 1000
    END;
    new_active_key_limit := CASE NEW.plan
      WHEN 'Researcher' THEN NULL
      WHEN 'Premium' THEN 10
      ELSE 3
    END;

    IF new_plan_rank < old_plan_rank AND new_plan_limit IS NOT NULL THEN
      UPDATE public.api_keys
      SET monthly_limit = LEAST(monthly_limit, new_plan_limit)
      WHERE user_id = NEW.id
        AND monthly_limit IS NOT NULL
        AND monthly_limit > new_plan_limit;

      UPDATE public.api_keys
      SET is_active = false
      WHERE id IN (
        SELECT id
        FROM public.api_keys
        WHERE user_id = NEW.id
          AND is_active = true
        ORDER BY created_at ASC, id ASC
        OFFSET new_active_key_limit
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_auth_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM set_config('dandi.auth_profile_sync', 'on', true);
  UPDATE public.profiles
  SET email = NEW.email,
      full_name = COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''), full_name),
      avatar_url = COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'avatar_url', ''), avatar_url),
      updated_at = now()
  WHERE id = NEW.id::text;
  PERFORM set_config('dandi.auth_profile_sync', 'off', true);

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_auth_user_profile() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email, raw_user_meta_data ON auth.users
  FOR EACH ROW
  WHEN (
    OLD.email IS DISTINCT FROM NEW.email
    OR OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data
  )
  EXECUTE FUNCTION public.sync_auth_user_profile();

-- Fail loudly on an unexpected duplicate instead of attaching a profile to the
-- wrong identity. Production reconciliation must resolve conflicts first.
SELECT set_config('dandi.auth_profile_sync', 'on', true);
UPDATE public.profiles AS profile
SET email = auth_user.email,
    full_name = COALESCE(NULLIF(auth_user.raw_user_meta_data ->> 'full_name', ''), profile.full_name),
    avatar_url = COALESCE(NULLIF(auth_user.raw_user_meta_data ->> 'avatar_url', ''), profile.avatar_url),
    updated_at = now()
FROM auth.users AS auth_user
WHERE profile.id = auth_user.id::text
  AND (
    profile.email IS DISTINCT FROM auth_user.email
    OR profile.full_name IS DISTINCT FROM COALESCE(NULLIF(auth_user.raw_user_meta_data ->> 'full_name', ''), profile.full_name)
    OR profile.avatar_url IS DISTINCT FROM COALESCE(NULLIF(auth_user.raw_user_meta_data ->> 'avatar_url', ''), profile.avatar_url)
  );
SELECT set_config('dandi.auth_profile_sync', 'off', true);
