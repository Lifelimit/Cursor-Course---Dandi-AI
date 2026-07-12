import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const moduleCache = new Map();
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

function loadTsModule(relativePath) {
  const filename = resolve(repoRoot, relativePath);
  if (moduleCache.has(filename)) return moduleCache.get(filename).exports;

  const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;

  const loadedModule = { exports: {} };
  moduleCache.set(filename, loadedModule);
  const localRequire = (specifier) => {
    if (specifier.startsWith("@/")) return loadTsModule(`${specifier.slice(2)}.ts`);
    if (specifier.startsWith(".")) {
      return loadTsModule(resolve(dirname(filename), specifier).replace(`${repoRoot}/`, ""));
    }
    return require(specifier);
  };

  const fn = new Function("exports", "require", "module", "__filename", "__dirname", compiled);
  fn(loadedModule.exports, localRequire, loadedModule, filename, dirname(filename));
  return loadedModule.exports;
}

test("calendar-month quota periods are UTC-only and roll over safely", () => {
  const {
    getRecentUsagePeriodKeys,
    getUsageCounterTtlSeconds,
    getUsagePeriod,
  } = loadTsModule("lib/utils/usage-period.ts");

  assert.deepEqual(getUsagePeriod(new Date("2026-12-31T23:59:59.500-08:00")), {
    key: "2027-01",
    startsAt: "2027-01-01T00:00:00.000Z",
    resetsAt: "2027-02-01T00:00:00.000Z",
  });
  assert.deepEqual(getUsagePeriod(new Date("2026-12-31T23:59:59.500Z")), {
    key: "2026-12",
    startsAt: "2026-12-01T00:00:00.000Z",
    resetsAt: "2027-01-01T00:00:00.000Z",
  });
  assert.deepEqual(
    getRecentUsagePeriodKeys(new Date("2027-01-15T12:00:00.000Z"), 4),
    ["2027-01", "2026-12", "2026-11", "2026-10"],
  );
  assert.equal(
    getUsageCounterTtlSeconds(new Date("2027-01-31T23:59:59.500Z")),
    7 * 24 * 60 * 60 + 1,
  );
});

test("usage CSV exports are bounded, formula-safe, quoted, and contain no account UUID", () => {
  const {
    buildUsageCsv,
    escapeCsvCell,
    parseUsageExportDays,
    UsageExportValidationError,
  } = loadTsModule("lib/usage-export.ts");

  assert.equal(parseUsageExportDays(null), 30);
  assert.equal(parseUsageExportDays("7"), 7);
  assert.throws(() => parseUsageExportDays("31"), UsageExportValidationError);
  assert.equal(escapeCsvCell(" =HYPERLINK(\"https://evil.example\")"), '"\' =HYPERLINK(""https://evil.example"")"');

  const { content, filename } = buildUsageCsv({
    generatedAt: new Date("2026-07-12T10:20:30.000Z"),
    plan: "Hobby",
    planMonthlyLimit: 100,
    rows: [
      {
        used_at: "2026-07-12T09:00:00.000Z",
        repo_url: "https://github.com/example/résumé",
        status: "success",
        latency_ms: 42,
        api_keys: {
          id: "00000000-0000-0000-0000-123456789abc",
          name: '+SUM(1,2) "quoted"',
          key_type: "Development",
          monthly_limit: null,
        },
      },
    ],
  });

  assert.equal(filename, "dandi-usage-2026-07-12.csv");
  assert.match(content, /2026-07-12T09:00:00\.000Z/);
  assert.match(content, /résumé/);
  assert.match(content, /"'\+SUM\(1,2\) ""quoted"""/);
  assert.match(content, /key_…56789abc/);
  assert.doesNotMatch(content, /00000000-0000-0000-0000-123456789abc/);
  assert.doesNotMatch(content, /User ID/i);
});

test("usage export authenticates with RLS and fails visibly instead of truncating", () => {
  const source = read("app/api/usage/export/route.ts");
  const historyMigration = read("supabase/migrations/20260712180000_preserve_usage_history_after_key_deletion.sql");

  assert.match(source, /createClient\(\)/);
  assert.match(source, /auth\.getUser\(\)/);
  assert.doesNotMatch(source, /supabaseAdmin/);
  assert.match(source, /\.range\(0, USAGE_EXPORT_MAX_ROWS\)/);
  assert.match(source, /logs\?\.length \|\| 0\) > USAGE_EXPORT_MAX_ROWS/);
  assert.match(source, /status: 422/);
  assert.match(source, /Cache-Control": "private, no-store/);
  assert.match(historyMigration, /ALTER COLUMN api_key_id DROP NOT NULL/i);
  assert.match(historyMigration, /ON DELETE SET NULL/i);
  assert.match(historyMigration, /idx_api_usage_log_used_at/i);
});

test("account deletion disables credentials before bounded external cleanup and identity deletion", () => {
  const route = read("app/api/account/route.ts");
  const service = read("lib/services/account-deletion.service.ts");
  const migration = read("supabase/migrations/20260712204728_harden_account_deletion_saga.sql");
  const billingService = read("lib/services/stripe-route.service.ts");
  const cancellationRoute = read("app/api/stripe/cancel-subscription/route.ts");

  const beginIndex = route.indexOf('rpc("begin_account_deletion"');
  const billingProfileIndex = route.indexOf("await loadBillingProfile", beginIndex);
  const redisIndex = route.indexOf("deleteAccountRedisData(");
  const signOutIndex = route.indexOf("auth.admin.signOut(");
  const deleteIndex = route.indexOf("auth.admin.deleteUser(");
  assert.ok(beginIndex > 0 && beginIndex < redisIndex);
  assert.ok(billingProfileIndex > beginIndex && billingProfileIndex < redisIndex);
  assert.ok(redisIndex < signOutIndex && signOutIndex < deleteIndex);
  assert.match(route, /getClaims\(session\.access_token\)/);
  assert.match(route, /rpc\(\s*"is_recent_account_session"/);
  assert.match(route, /getDeletionKeyIds\(deletionSnapshot\)/);
  assert.match(route, /deleteAccountRedisData\(user\.id, keyIds\)/);
  assert.match(route, /body\.confirm !== "DELETE"/);
  assert.match(route, /assertNoLiveStripeBilling/);
  assert.match(route, /beginError\.code === "55P03"/);

  assert.match(service, /redis\.scan\(/);
  assert.match(service, /iterations > 200 \|\| keys\.length > 20_000/);
  assert.match(service, /usage:user:\$\{userId\}:\*/);
  assert.match(service, /usage:key:\$\{apiKeyId\}:\*/);
  assert.match(service, /alert:retry:\$\{apiKeyId\}:\*/);
  assert.match(service, /retrieveSubscriptionIfPresent/);
  assert.match(migration, /FROM auth\.sessions AS session/);
  assert.match(migration, /billing_mutation_lease_until/);
  assert.match(migration, /ERRCODE = '55P03'/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.acquire_account_billing_lease/);
  assert.match(billingService, /rpc\(\s*"acquire_account_billing_lease"/);
  assert.match(cancellationRoute, /getAuthenticatedBillingUser\(\)/);
});

test("Playground traces disclose only browser-observed and response-derived facts", () => {
  const traceFiles = [
    "components/playground/NetworkLog.tsx",
    "hooks/useRepositorySummary.ts",
    "hooks/useRepositoryIngestion.ts",
    "hooks/useRepositoryChat.ts",
  ];
  const sources = traceFiles.map(read);
  const combined = sources.join("\n");

  assert.match(sources[0], /Dandi workflow trace/);
  assert.match(sources[0], /client-observed/);
  assert.match(sources[0], /response-derived/);
  assert.doesNotMatch(combined, /\/api\/keys\/validate/);
  assert.doesNotMatch(combined, /match_repository_chunks/);
  assert.doesNotMatch(combined, /summarize:write|rag:write/);
  assert.doesNotMatch(combined, /HNSW|pgvector tables initialized|dimension.?768/i);
  assert.doesNotMatch(combined, /X-Dandi-Engine|HTTPS\/1\.1|Server: Dandi API/);
});

test("streaming API routes expose only their documented metadata and finalize telemetry", () => {
  const summary = read("app/api/github-summarizer/route.ts");
  const chat = read("app/api/rag/chat/route.ts");
  const finalizer = read("lib/services/api-key.service.ts");

  assert.match(summary, /exposedHeaders: "x-github-metadata"/);
  assert.match(chat, /exposedHeaders: "x-rag-sources"/);
  assert.match(summary, /abortSignal: request\.signal/);
  assert.match(chat, /abortSignal: request\.signal/);
  assert.match(summary, /onFinish:/);
  assert.match(summary, /onError:/);
  assert.match(chat, /onFinish:/);
  assert.match(chat, /onError:/);
  assert.match(chat, /onAbort:/);
  assert.match(finalizer, /if \(finalization\) return finalization/);
  assert.match(finalizer, /Usage telemetry finalization failed/);
});
