import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => readFileSync(resolve(repoRoot, relativePath), "utf8");

test("owner API-key deletion shares the account barrier and retries Redis cleanup", () => {
  const route = read("app/api/keys/[id]/route.ts");
  const cleanupService = read("lib/services/account-deletion.service.ts");
  const migration = read("supabase/migrations/20260712204728_harden_account_deletion_saga.sql");

  assert.match(route, /rpc\(\s*"begin_owned_api_key_deletion"/);
  assert.match(route, /deletionState !== "cleanup_pending"/);
  assert.match(route, /await deleteApiKeyRedisData\(id\)/);
  assert.match(route, /rpc\(\s*"acknowledge_api_key_redis_cleanup"/);
  assert.doesNotMatch(route, /\.from\(TABLE_NAME\)\s*\.delete\(\)/);

  assert.match(cleanupService, /usage:key:\$\{apiKeyId\}:\*/);
  assert.match(cleanupService, /alert:sent:\$\{apiKeyId\}:\*/);
  assert.match(cleanupService, /alert:retry:\$\{apiKeyId\}:\*/);
  assert.match(cleanupService, /iterations > 200 \|\| keys\.length > 20_000/);

  assert.match(migration, /api_key_cleanup_pending_ids uuid\[\]/);
  assert.match(
    migration,
    /begin_owned_api_key_deletion[\s\S]*FROM public\.profiles AS profile[\s\S]*FOR UPDATE/,
  );
  assert.match(migration, /IF deletion_requested_at IS NOT NULL[\s\S]*RETURN 'deletion_pending'/);
  assert.match(migration, /RETURN 'cleanup_pending'/);
  assert.match(migration, /pg_catalog\.array_append\(pending_cleanup_ids, deleted_key_id\)/);
  assert.match(migration, /pg_catalog\.array_remove\(api_key_cleanup_pending_ids, p_key_id\)/);
  assert.match(migration, /pg_catalog\.unnest\(COALESCE\(pending_cleanup_ids/);
  assert.match(migration, /REVOKE DELETE ON TABLE public\.api_keys FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.begin_owned_api_key_deletion[\s\S]*FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.begin_owned_api_key_deletion[\s\S]*TO service_role/);
});
