-- Bound readable usage history to 90 days and provide transactional cleanup
-- when an Auth user is deleted. Physical pruning runs on every usage insert;
-- no external scheduler is required for this small personal deployment.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_deletion_requested_at timestamptz;

CREATE OR REPLACE FUNCTION public.prune_account_usage_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.api_usage_log
  WHERE used_at < now() - interval '90 days';
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prune_account_usage_history() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS prune_usage_history_after_insert ON public.api_usage_log;
CREATE TRIGGER prune_usage_history_after_insert
  AFTER INSERT ON public.api_usage_log
  FOR EACH ROW
  EXECUTE FUNCTION public.prune_account_usage_history();

CREATE OR REPLACE FUNCTION public.delete_auth_user_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.repository_chunks WHERE user_id = OLD.id::text;
  DELETE FROM public.ingestion_jobs WHERE user_id = OLD.id::text;
  DELETE FROM public.github_app_installations WHERE user_id = OLD.id::text;
  DELETE FROM public.profile_webhook_secrets WHERE profile_id = OLD.id::text;
  DELETE FROM public.api_usage_log WHERE user_id = OLD.id;
  DELETE FROM public.api_keys WHERE user_id = OLD.id::text;
  DELETE FROM public.profiles WHERE id = OLD.id::text;
  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_auth_user_data() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_auth_user_data();
