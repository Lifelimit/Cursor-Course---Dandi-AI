import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const migrationDirectory = resolve(process.cwd(), "supabase/migrations");
const files = (await readdir(migrationDirectory))
  .filter((file) => file.endsWith(".sql"))
  .sort();

const versions = new Map();

for (const file of files) {
  const match = /^(\d+)_/.exec(file);
  if (!match) {
    throw new Error(`Migration filename must start with a numeric version: ${file}`);
  }

  const version = match[1];
  const existing = versions.get(version) || [];
  existing.push(file);
  versions.set(version, existing);
}

const duplicates = [...versions.entries()].filter(([, names]) => names.length > 1);
if (duplicates.length > 0) {
  const details = duplicates
    .map(([version, names]) => `${version}: ${names.join(", ")}`)
    .join("\n");
  throw new Error(`Duplicate Supabase migration versions detected:\n${details}`);
}

const requiredRuntimeSchema = {
  "20260712090000_harden_stripe_webhook_idempotency.sql": [
    "claim_stripe_webhook_event",
    "GRANT EXECUTE",
    "TO service_role",
  ],
  "20260712100000_add_credential_discriminator.sql": [
    "ingestion_jobs",
    "repository_chunks",
    "credential_type",
  ],
  "20260712120000_sync_auth_profile_identity.sql": [
    "sync_auth_user_profile",
    "on_auth_user_updated",
    "dandi.auth_profile_sync",
  ],
  "20260712130000_isolate_webhook_signing_secrets.sql": [
    "profile_webhook_secrets",
    "update_profile_webhook_configuration",
    "TO service_role",
  ],
  "20260712140000_enforce_api_key_limits_for_trusted_writes.sql": [
    "operational_key_cap",
    "FOR UPDATE",
    "Stored API key safety cap reached",
  ],
  "20260712150000_account_deletion_and_usage_retention.sql": [
    "account_deletion_requested_at",
    "prune_account_usage_history",
    "delete_auth_user_data",
  ],
  "20260712160000_block_credentials_during_account_deletion.sql": [
    "begin_account_deletion",
    "Account deletion is pending",
    "TO service_role",
  ],
  "20260712170000_allow_owner_usage_exports.sql": [
    "Users can export their own usage logs",
    "TO authenticated",
    "auth.uid()",
  ],
  "20260712180000_preserve_usage_history_after_key_deletion.sql": [
    "ALTER COLUMN api_key_id DROP NOT NULL",
    "ON DELETE SET NULL",
    "idx_api_usage_log_used_at",
  ],
  "20260712204401_atomic_stripe_webhook_downgrade.sql": [
    "apply_stripe_hobby_downgrade",
    "Selected API key ownership mismatch",
    "TO service_role",
  ],
  "20260712204728_harden_account_deletion_saga.sql": [
    "account_deletion_active_key_ids",
    "api_key_cleanup_pending_ids",
    "begin_owned_api_key_deletion",
    "acknowledge_api_key_redis_cleanup",
    "acquire_account_billing_lease",
    "abort_account_deletion",
    "is_recent_account_session",
    "auth.sessions",
    "REVOKE DELETE ON TABLE public.api_keys FROM PUBLIC, anon, authenticated",
    "TO service_role",
  ],
};

for (const [file, requiredFragments] of Object.entries(requiredRuntimeSchema)) {
  if (!files.includes(file)) {
    throw new Error(`Required runtime migration is missing: ${file}`);
  }

  const source = await readFile(resolve(migrationDirectory, file), "utf8");
  for (const fragment of requiredFragments) {
    if (!source.includes(fragment)) {
      throw new Error(`Required fragment ${JSON.stringify(fragment)} is missing from ${file}`);
    }
  }
}

const credentialMigration = await readFile(
  resolve(migrationDirectory, "20260712100000_add_credential_discriminator.sql"),
  "utf8",
);
if (/\bDELETE\s+FROM\b/i.test(credentialMigration)) {
  throw new Error("The credential discriminator schema repair must remain additive.");
}

console.log(`Migration check passed for ${files.length} files with unique versions.`);
