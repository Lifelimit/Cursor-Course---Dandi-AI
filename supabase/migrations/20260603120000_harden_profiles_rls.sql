-- Harden profile RLS and block direct client writes to billing-managed fields.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS prevent_profile_billing_managed_updates ON public.profiles;
DROP FUNCTION IF EXISTS public.prevent_profile_billing_managed_updates();

CREATE OR REPLACE FUNCTION public.prevent_profile_billing_managed_updates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  is_trusted_role boolean;
  old_plan_rank integer;
  new_plan_rank integer;
  new_plan_limit integer;
BEGIN
  is_trusted_role := current_setting('request.jwt.claim.role', true) = 'service_role'
    OR current_user IN ('postgres', 'service_role');

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

  IF OLD.id IS DISTINCT FROM NEW.id
     OR OLD.email IS DISTINCT FROM NEW.email THEN
    RAISE EXCEPTION 'Direct updates to profile identity fields are not allowed.';
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

    IF new_plan_rank < old_plan_rank AND new_plan_limit IS NOT NULL THEN
      UPDATE public.api_keys
      SET monthly_limit = LEAST(monthly_limit, new_plan_limit)
      WHERE user_id = NEW.id
        AND monthly_limit IS NOT NULL
        AND monthly_limit > new_plan_limit;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_profile_billing_managed_updates
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_billing_managed_updates();

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING ((select auth.uid())::text = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid())::text = id)
  WITH CHECK ((select auth.uid())::text = id);
