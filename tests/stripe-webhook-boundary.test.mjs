import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

test("Stripe webhook profile mutations bind metadata identity to the event customer", () => {
  const route = read("app/api/webhooks/stripe/route.ts");

  assert.match(
    route,
    /resolveBoundProfileId[\s\S]*\.eq\("stripe_customer_id", customerId\)[\s\S]*if \(metadataUserId\) query = query\.eq\("id", metadataUserId\)/,
  );
  assert.match(
    route,
    /\.update\(updatePayload\)[\s\S]*\.eq\("id", profileId\)[\s\S]*\.eq\("stripe_customer_id", customerId\)/,
  );
  assert.match(
    route,
    /\.update\(replacementPayload\)[\s\S]*\.eq\("id", profileId\)[\s\S]*\.eq\("stripe_customer_id", customerId\)/,
  );
  assert.match(route, /resolveBoundProfileId\(customerId, metadata\.userId\)/);
  assert.doesNotMatch(route, /if \(metadata\.userId\)[\s\S]{0,120}query = query\.eq\("id", metadata\.userId\)/);
});

test("terminal Hobby downgrade and explicit API-key selection are one privileged transaction", () => {
  const route = read("app/api/webhooks/stripe/route.ts");
  const migration = read("supabase/migrations/20260712204401_atomic_stripe_webhook_downgrade.sql");

  assert.match(route, /const hasExplicitKeySelection = keysToKeep\.length > 0/);
  assert.match(route, /rpc\(\s*"apply_stripe_hobby_downgrade"/);
  assert.match(route, /p_profile_id: profileId/);
  assert.match(route, /p_customer_id: customerId/);
  assert.match(route, /p_has_explicit_key_selection: hasExplicitKeySelection/);

  assert.match(migration, /SECURITY DEFINER\s+SET search_path = ''/);
  assert.match(migration, /WHERE id = p_profile_id\s+AND stripe_customer_id = p_customer_id/);
  assert.match(migration, /Selected API key ownership mismatch/);
  assert.match(migration, /REVOKE ALL ON FUNCTION[\s\S]*FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION[\s\S]*TO service_role/);

  const profileUpdate = migration.indexOf("UPDATE public.profiles");
  const disableAll = migration.indexOf("SET is_active = false");
  const enableSelected = migration.indexOf("SET is_active = true");
  assert(profileUpdate >= 0 && profileUpdate < disableAll);
  assert(disableAll < enableSelected);
});
