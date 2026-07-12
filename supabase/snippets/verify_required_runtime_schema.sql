-- Read-only production readiness check for schema required by deployed routes.
-- Run after migration reconciliation and before promoting application code.
SELECT
  to_regprocedure('public.claim_stripe_webhook_event(text,timestamp with time zone)') IS NOT NULL
    AS has_stripe_webhook_claim_rpc,
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ingestion_jobs'
      AND column_name = 'credential_type'
  ) AS has_ingestion_job_credential_type,
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'repository_chunks'
      AND column_name = 'credential_type'
  ) AS has_repository_chunk_credential_type,
  to_regprocedure('public.update_profile_webhook_configuration(text,text,text)') IS NOT NULL
    AS has_atomic_webhook_configuration_rpc,
  to_regclass('public.profile_webhook_secrets') IS NOT NULL
    AS has_isolated_webhook_secret_table,
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'account_deletion_requested_at'
  ) AS has_account_deletion_marker,
  to_regprocedure('public.begin_account_deletion(text)') IS NOT NULL
    AS has_account_deletion_rpc,
  to_regprocedure('public.acquire_account_billing_lease(text)') IS NOT NULL
    AS has_account_billing_lease_rpc,
  to_regprocedure('public.abort_account_deletion(text)') IS NOT NULL
    AS has_account_deletion_abort_rpc,
  to_regprocedure('public.begin_owned_api_key_deletion(text,uuid)') IS NOT NULL
    AS has_owned_api_key_deletion_rpc,
  to_regprocedure('public.acknowledge_api_key_redis_cleanup(text,uuid)') IS NOT NULL
    AS has_api_key_cleanup_ack_rpc,
  to_regprocedure('public.is_recent_account_session(uuid,uuid)') IS NOT NULL
    AS has_recent_account_session_rpc,
  to_regprocedure('public.apply_stripe_hobby_downgrade(text,text,uuid[],boolean)') IS NOT NULL
    AS has_atomic_stripe_hobby_downgrade_rpc,
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'account_deletion_active_key_ids'
  ) AS has_account_deletion_key_snapshot,
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'billing_mutation_lease_until'
  ) AS has_billing_mutation_lease,
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'api_key_cleanup_pending_ids'
  ) AS has_api_key_cleanup_tombstones,
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'api_usage_log'
      AND column_name = 'api_key_id'
      AND is_nullable = 'YES'
  ) AS preserves_usage_after_key_deletion,
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'api_usage_log'
      AND policyname = 'Users can export their own usage logs'
      AND roles @> ARRAY['authenticated']::name[]
  ) AS has_owner_usage_export_policy;
