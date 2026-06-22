import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";
import crypto from "node:crypto";

const require = createRequire(import.meta.url);
const moduleCache = new Map();
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadTsModule(relativePath) {
  const filename = resolve(repoRoot, relativePath);
  if (moduleCache.has(filename)) return moduleCache.get(filename).exports;

  const source = readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: filename,
  }).outputText;

  const loadedModule = { exports: {} };
  moduleCache.set(filename, loadedModule);

  const localRequire = (specifier) => {
    if (specifier === "server-only") {
      return {};
    }
    if (specifier.startsWith("@/")) {
      return loadTsModule(`${specifier.slice(2)}.ts`);
    }
    if (specifier.startsWith(".")) {
      return loadTsModule(resolve(dirname(filename), specifier).replace(`${repoRoot}/`, ""));
    }
    return require(specifier);
  };

  const fn = new Function("exports", "require", "module", "__filename", "__dirname", compiled);
  fn(loadedModule.exports, localRequire, loadedModule, filename, dirname(filename));
  return loadedModule.exports;
}

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_mock";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID = "price_premium_month";
process.env.NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID = "price_premium_year";
process.env.NEXT_PUBLIC_STRIPE_RESEARCHER_MONTHLY_PRICE_ID = "price_researcher_month";
process.env.NEXT_PUBLIC_STRIPE_RESEARCHER_YEARLY_PRICE_ID = "price_researcher_year";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
process.env.STRIPE_SECRET_KEY = "sk_test_mock";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_mock";
process.env.UPSTASH_REDIS_REST_URL = "https://mock.upstash.io";
process.env.UPSTASH_REDIS_REST_TOKEN = "mock-token";
process.env.GOOGLE_API_KEY = "google-key";
process.env.API_KEY_HMAC_SECRET = "mock-hmac-secret-key-32-chars-for-tests";
process.env.GITHUB_APP_ID = "12345";
process.env.GITHUB_APP_PRIVATE_KEY = "dummy-private-key";

const googleEnvNames = [
  "GOOGLE_API_KEYS",
  "GOOGLE_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GOOGLE_EMBEDDING_PRIMARY",
  "GOOGLE_EMBEDDING_FALLBACK",
];

function snapshotGoogleEnv() {
  return Object.fromEntries(googleEnvNames.map((name) => [name, process.env[name]]));
}

function restoreGoogleEnv(snapshot) {
  for (const name of googleEnvNames) {
    if (snapshot[name] === undefined) delete process.env[name];
    else process.env[name] = snapshot[name];
  }
}

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

test("normalizes only canonical GitHub repository URLs", () => {
  const { normalizeGitHubRepoUrl } = loadTsModule("lib/security-core.ts");

  assert.equal(
    normalizeGitHubRepoUrl("https://github.com/OpenAI/codex/tree/main?tab=readme"),
    "https://github.com/OpenAI/codex"
  );
  assert.equal(
    normalizeGitHubRepoUrl("https://github.com/OpenAI/codex/blob/main/src/index.ts"),
    "https://github.com/OpenAI/codex"
  );
  assert.equal(
    normalizeGitHubRepoUrl("https://github.com/OpenAI/codex/issues/1"),
    "https://github.com/OpenAI/codex"
  );
  assert.equal(
    normalizeGitHubRepoUrl("https://github.com/OpenAI/codex.git"),
    "https://github.com/OpenAI/codex"
  );
  assert.equal(normalizeGitHubRepoUrl("http://github.com/OpenAI/codex"), null);
  assert.equal(normalizeGitHubRepoUrl("https://example.com/OpenAI/codex"), null);
  assert.equal(normalizeGitHubRepoUrl("https://github.com/-bad/codex"), null);
  assert.equal(normalizeGitHubRepoUrl("https://github.com/OpenAI/.codex"), null);
});

test("formats GitHub repository labels without changing legacy fallbacks", () => {
  const { getGitHubRepoPath, formatGitHubRepoLabel, getGitHubRepositoryParts } = loadTsModule("lib/github-url.ts");

  assert.equal(getGitHubRepoPath("https://github.com/openai/codex/tree/main"), "openai/codex");
  assert.equal(getGitHubRepoPath("not a repo"), "unknown/repository");
  assert.equal(getGitHubRepoPath("not a repo", "repository"), "repository");
  assert.equal(formatGitHubRepoLabel("https://github.com/openai/codex/"), "openai/codex/");
  assert.equal(formatGitHubRepoLabel("https://github.com/openai/codex/", { trimTrailingSlash: true }), "openai/codex");
  assert.deepEqual(getGitHubRepositoryParts("https://github.com/openai/codex/tree/main"), {
    owner: "openai",
    repo: "codex",
  });
  assert.throws(() => getGitHubRepositoryParts("https://github.com/openai"), /Invalid GitHub URL/);
});

test("formats shared presentation values without changing legacy display strings", () => {
  const {
    formatCurrency,
    formatCurrencyFromCents,
    formatDuration,
    formatGitHubRepo,
    formatIsoDate,
    formatIsoDatePart,
    formatPercentage,
    formatRelativeTime,
    formatRepositoryLabel,
    formatRequestCount,
    formatRequestLimit,
  } = loadTsModule("lib/format.ts");

  assert.equal(formatIsoDate(new Date("2026-06-20T23:59:00.000Z")), "2026-06-20");
  assert.equal(formatIsoDatePart("2026-06-20T23:59:00.000Z"), "2026-06-20");
  assert.equal(formatRequestCount(1234567), "1,234,567");
  assert.equal(formatRequestLimit(null), "∞");
  assert.equal(formatRequestLimit(5000), "5,000");
  assert.equal(formatCurrency(12.5), "$12.50");
  assert.equal(formatCurrencyFromCents(-1234), "-$12.34");
  assert.equal(formatPercentage(99.95, 1), "100.0%");
  assert.equal(formatPercentage(100), "100%");
  assert.equal(formatDuration(999), "999ms");
  assert.equal(formatDuration(1500), "1.5s");

  const now = "2026-06-20T12:00:00.000Z";
  assert.equal(formatRelativeTime(null), "No activity");
  assert.equal(formatRelativeTime(now, { current: true }), "Active now");
  assert.equal(formatRelativeTime("2026-06-20T12:00:00.000Z", { now }), "Just now");
  assert.equal(formatRelativeTime("2026-06-20T11:55:00.000Z", { now }), "5m ago");
  assert.equal(formatRelativeTime("2026-06-20T10:00:00.000Z", { now }), "2h ago");
  assert.equal(formatRelativeTime("2026-06-17T12:00:00.000Z", { now }), "3d ago");
  assert.equal(formatRelativeTime("2026-06-20T12:01:00.000Z", { now }), "Recently");
  assert.equal(formatRepositoryLabel("https://github.com/openai/codex/", { trimTrailingSlash: true }), "openai/codex");
  assert.equal(formatGitHubRepo("not a repo", "repository"), "repository");
});

test("shared API request helpers preserve route parsing behavior", async () => {
  const {
    getApiKeyFromRequest,
    invalidJsonResponse,
    missingApiKeyResponse,
    readGitHubRepoUrl,
    readJsonBody,
  } = loadTsModule("lib/api-request.ts");

  const headerRequest = new Request("https://dandi.test/api", {
    method: "POST",
    headers: { "x-api-key": "header-key" },
    body: JSON.stringify({
      apiKey: "body-key",
      githubUrl: "https://github.com/OpenAI/codex/tree/main",
    }),
  });
  const headerBody = await readJsonBody(headerRequest);

  assert.equal(getApiKeyFromRequest(headerRequest, headerBody), "header-key");
  assert.equal(readGitHubRepoUrl(headerBody), "https://github.com/OpenAI/codex");

  const bodyRequest = new Request("https://dandi.test/api", {
    method: "POST",
    body: JSON.stringify({ apiKey: "body-key" }),
  });
  const body = await readJsonBody(bodyRequest);

  assert.equal(getApiKeyFromRequest(bodyRequest, body), "body-key");
  assert.equal(getApiKeyFromRequest(new Request("https://dandi.test/api")), "");

  const invalidJson = invalidJsonResponse({});
  assert.equal(invalidJson.status, 400);
  assert.deepEqual(await invalidJson.json(), { error: "Invalid JSON payload" });

  const missingKey = missingApiKeyResponse({}, "API key is required");
  assert.equal(missingKey.status, 401);
  assert.deepEqual(await missingKey.json(), { error: "API key is required" });
});

test("validates chat messages strictly", () => {
  const { validateChatMessages } = loadTsModule("lib/request-validation.ts");

  assert.deepEqual(
    validateChatMessages([
      { role: "system", content: "Be concise." },
      { role: "user", content: "What does this repo do?" },
    ]),
    [
      { role: "system", content: "Be concise." },
      { role: "user", content: "What does this repo do?" },
    ]
  );

  assert.throws(() => validateChatMessages("nope"), /messages must be an array/);
  assert.throws(() => validateChatMessages([]), /between 1 and 20/);
  assert.throws(() => validateChatMessages([{ role: "tool", content: "x" }]), /role must be/);
  assert.throws(() => validateChatMessages([{ role: "assistant", content: "x" }]), /Last message/);
  assert.throws(
    () => validateChatMessages([{ role: "user", content: "x".repeat(8001) }]),
    /8000 characters/
  );
  assert.throws(
    () => validateChatMessages(Array.from({ length: 20 }, () => ({ role: "user", content: "x".repeat(1600) }))),
    /30000 characters/
  );
});

test("maps domain statuses to stable UI tones", () => {
  const {
    getApiKeyStatusTone,
    getApiKeyTypeTone,
    getBrowserSessionStatusTone,
    getHttpStatusTone,
    getIngestionStatusTone,
    getInvoiceStatusTone,
    getNetworkLogStatusTone,
    getWebhookDeliveryStatusTone,
  } = loadTsModule("lib/status-tones.ts");

  assert.equal(getInvoiceStatusTone("paid"), "success");
  assert.equal(getInvoiceStatusTone("failed"), "danger");
  assert.equal(getInvoiceStatusTone("pending"), "warning");
  assert.equal(getInvoiceStatusTone("mystery"), "neutral");

  assert.equal(getHttpStatusTone(204), "success");
  assert.equal(getHttpStatusTone(404), "danger");
  assert.equal(getWebhookDeliveryStatusTone(299), "success");
  assert.equal(getWebhookDeliveryStatusTone(300), "danger");

  assert.equal(getIngestionStatusTone("completed"), "success");
  assert.equal(getIngestionStatusTone("running"), "warning");
  assert.equal(getIngestionStatusTone("queued"), "info");
  assert.equal(getIngestionStatusTone("failed"), "danger");

  assert.equal(getApiKeyStatusTone(true), "success");
  assert.equal(getApiKeyStatusTone(false), "warning");
  assert.equal(getApiKeyTypeTone("production"), "info");
  assert.equal(getApiKeyTypeTone("development"), "warning");

  assert.equal(getBrowserSessionStatusTone(true), "success");
  assert.equal(getBrowserSessionStatusTone(false), "neutral");
  assert.equal(getNetworkLogStatusTone("running"), "warning");
  assert.equal(getNetworkLogStatusTone("error"), "danger");
});

test("computes configurable CORS headers", () => {
  const { getCorsHeaders, isCorsOriginAllowed } = loadTsModule("lib/cors.ts");
  const originalNodeEnv = process.env.NODE_ENV;
  const originalAllowed = process.env.ALLOWED_API_ORIGINS;

  process.env.NODE_ENV = "production";
  process.env.ALLOWED_API_ORIGINS = "https://app.dandi.ai,https://docs.dandi.ai";

  const allowedRequest = new Request("https://api.dandi.ai/api/rag/chat", {
    headers: { origin: "https://app.dandi.ai" },
  });
  assert.equal(isCorsOriginAllowed(allowedRequest), true);
  assert.equal(getCorsHeaders(allowedRequest)["Access-Control-Allow-Origin"], "https://app.dandi.ai");

  const sameOriginRequest = new Request("https://preview-dandi.vercel.app/api/github-summarizer", {
    headers: { origin: "https://preview-dandi.vercel.app" },
  });
  assert.equal(isCorsOriginAllowed(sameOriginRequest), true);
  assert.equal(
    getCorsHeaders(sameOriginRequest)["Access-Control-Allow-Origin"],
    "https://preview-dandi.vercel.app"
  );

  const deniedRequest = new Request("https://api.dandi.ai/api/rag/chat", {
    headers: { origin: "https://evil.example" },
  });
  assert.equal(isCorsOriginAllowed(deniedRequest), false);
  assert.equal(getCorsHeaders(deniedRequest)["Access-Control-Allow-Origin"], undefined);

  const serverRequest = new Request("https://api.dandi.ai/api/rag/chat");
  assert.equal(isCorsOriginAllowed(serverRequest), true);
  assert.equal(getCorsHeaders(serverRequest)["Access-Control-Allow-Origin"], undefined);

  process.env.NODE_ENV = "development";
  delete process.env.ALLOWED_API_ORIGINS;
  assert.equal(getCorsHeaders(allowedRequest)["Access-Control-Allow-Origin"], "*");

  process.env.NODE_ENV = originalNodeEnv;
  if (originalAllowed === undefined) delete process.env.ALLOWED_API_ORIGINS;
  else process.env.ALLOWED_API_ORIGINS = originalAllowed;
});

test("GitHub App installation migration keeps direct clients read-only", () => {
  const baseMigration = readFileSync(resolve(repoRoot, "supabase/migrations/20260622_create_github_app_installations.sql"), "utf8");
  const hardeningMigration = readFileSync(resolve(repoRoot, "supabase/migrations/20260622120000_harden_github_app_installations.sql"), "utf8");
  const combinedSql = `${baseMigration}\n${hardeningMigration}`;

  assert.match(combinedSql, /ALTER TABLE public\.github_app_installations ENABLE ROW LEVEL SECURITY;/);
  assert.match(combinedSql, /REVOKE ALL ON public\.github_app_installations FROM anon;/);
  assert.match(combinedSql, /REVOKE ALL ON public\.github_app_installations FROM authenticated;/);
  assert.match(combinedSql, /GRANT SELECT ON public\.github_app_installations TO authenticated;/);
  assert.doesNotMatch(combinedSql, /GRANT\s+SELECT\s*,\s*INSERT\s*,\s*UPDATE\s*,\s*DELETE\s+ON public\.github_app_installations TO authenticated;/i);
  assert.doesNotMatch(combinedSql, /CREATE POLICY "Users can insert their GitHub App installations"/);
  assert.doesNotMatch(combinedSql, /CREATE POLICY "Users can update their GitHub App installations"/);
  assert.doesNotMatch(combinedSql, /CREATE POLICY "Users can delete their GitHub App installations"/);
  assert.match(combinedSql, /verified_repositories jsonb NOT NULL DEFAULT '\[\]'::jsonb/);
});

test("GitHub App callback persists only verified user-accessible repositories", () => {
  const callbackSource = readFileSync(resolve(repoRoot, "app/api/integrations/github/callback/route.ts"), "utf8");
  const serviceSource = readFileSync(resolve(repoRoot, "lib/services/github-app.service.ts"), "utf8");

  assert.match(callbackSource, /listGitHubUserAccessibleInstallationRepositories/);
  assert.match(callbackSource, /verifiedRepositories: verifiedRepoList\.repositories/);
  assert.match(callbackSource, /verifiedRepositoryCount: verifiedRepoList\.totalCount/);
  assert.doesNotMatch(callbackSource, /persistGitHubAppInstallation\(\{\s*db:/);
  assert.match(serviceSource, /from\("github_app_installations"\)\s*\.upsert/);
  assert.match(serviceSource, /verified_repositories: input\.verifiedRepositories/);
  assert.match(serviceSource, /verified_repository_count: input\.verifiedRepositoryCount/);
  const persistFunction = serviceSource.slice(
    serviceSource.indexOf("export async function persistGitHubAppInstallation"),
    serviceSource.indexOf("export async function getPrimaryGitHubInstallationForUserWithClient")
  );
  assert.doesNotMatch(persistFunction, /userAccessToken|access_token/);
});

test("GitHub App status displays verified snapshot instead of installation-wide token data", () => {
  const statusSource = readFileSync(resolve(repoRoot, "app/api/integrations/github/installation/route.ts"), "utf8");

  assert.match(statusSource, /installation\.verified_repositories/);
  assert.match(statusSource, /repositoryAccessBoundary: "github-user"/);
  assert.doesNotMatch(statusSource, /listGitHubInstallationRepositories/);
  assert.doesNotMatch(statusSource, /updateGitHubInstallationSyncMetadata/);
});

test("GitHub App callback clears state cookies for invalid state and setup config failures", () => {
  const callbackSource = readFileSync(resolve(repoRoot, "app/api/integrations/github/callback/route.ts"), "utf8");

  assert.match(callbackSource, /clearGitHubCookies\(accountRedirect\(\{ github_error: "GitHub installation state did not match/);
  assert.match(callbackSource, /catch \(err\) \{\s*return clearGitHubCookies\(accountRedirect\(\{ github_error: getSafeGitHubAppErrorMessage\(err\) \},\s*origin\)\);/);
  assert.match(callbackSource, /clearGitHubCookies\(accountRedirect\(\{ github_error: "GitHub authorization state did not match/);
});

test("prioritizes RAG files deterministically with folder diversity", () => {
  const { selectRagFiles } = loadTsModule("lib/services/rag-file-selection.service.ts");
  const tree = [
    { path: "src/generated/client.generated.ts", size: 1000 },
    { path: "public/logo.png", size: 1000 },
    { path: "yarn.lock", size: 1000 },
    { path: "README.md", size: 1000 },
    { path: "package.json", size: 1000 },
    { path: "docs/setup.md", size: 1000 },
    { path: "app/api/rag/chat/route.ts", size: 1000 },
    { path: "lib/security-core.ts", size: 1000 },
    { path: "components/Button.tsx", size: 1000 },
    { path: "tests/security.test.ts", size: 1000 },
    ...Array.from({ length: 10 }, (_, index) => ({ path: `src/feature-${index}.ts`, size: 1000 })),
  ];

  const selected = selectRagFiles(tree, { maxFileCount: 8 });
  const paths = selected.map((file) => file.path);

  assert.equal(paths[0], "README.md");
  assert(paths.includes("app/api/rag/chat/route.ts"));
  assert(paths.includes("docs/setup.md"));
  assert(paths.includes("package.json"));
  assert(!paths.includes("src/generated/client.generated.ts"));
  assert(!paths.includes("public/logo.png"));
  assert(!paths.includes("yarn.lock"));
  assert(paths.filter((path) => path.startsWith("src/")).length < 8);
});

test("validates API key settings against plan limits", () => {
  const { parseApiKeySettings } = loadTsModule("lib/request-validation.ts");

  assert.deepEqual(
    parseApiKeySettings(
      {
        name: "Prod",
        keyType: "production",
        monthlyLimit: 1000,
        alertThreshold: 90,
        alertChannels: ["email", "email", "invalid"],
      },
      { plan: "Hobby", requireName: true }
    ),
    {
      name: "Prod",
      keyType: "production",
      monthlyLimit: 1000,
      alertThreshold: 90,
      alertChannels: ["email"],
    }
  );

  assert.throws(
    () => parseApiKeySettings({ name: "Too high", monthlyLimit: 1001 }, { plan: "Hobby", requireName: true }),
    /Monthly limit must be between 1 and 1000/
  );
});

test("preserves unlimited Researcher key limits", () => {
  const { getPlanLimits, PLAN_DETAILS } = loadTsModule("lib/constants.ts");

  assert.equal(PLAN_DETAILS.Researcher.keyLimit, null);
  assert.equal(getPlanLimits("Researcher").keyLimit, null);
  assert.equal(getPlanLimits("Hobby").keyLimit, 3);
});

test("resolves paid plans only when plan and price match the server catalog", () => {
  const { resolvePaidPlanRequest, getPlanForPriceId } = loadTsModule("lib/billing-catalog.ts");

  assert.deepEqual(resolvePaidPlanRequest({ planId: "Premium", priceId: "price_premium_year" }), {
    planId: "Premium",
    interval: "year",
    priceId: "price_premium_year",
  });
  assert.equal(resolvePaidPlanRequest({ planId: "Researcher", priceId: "price_premium_year" }), null);
  assert.deepEqual(getPlanForPriceId("price_researcher_month"), {
    planId: "Researcher",
    interval: "month",
    priceId: "price_researcher_month",
  });
});

test("validates Stripe payment method identifiers", () => {
  const { validatePaymentMethodId } = loadTsModule("lib/request-validation.ts");

  assert.equal(validatePaymentMethodId("pm_123_test"), "pm_123_test");
  assert.throws(() => validatePaymentMethodId("cus_123"), /Invalid payment method ID/);
});

test("formats Stripe route billing profile payloads and errors", async () => {
  const {
    buildClearPaymentMethodProfilePayload,
    buildPaymentMethodProfilePayload,
    mapStripeErrorResponse,
  } = loadTsModule("lib/services/stripe-route.service.ts");

  const paymentMethod = {
    card: {
      brand: "visa",
      last4: "4242",
      exp_month: 12,
      exp_year: 2030,
    },
  };

  assert.deepEqual(buildPaymentMethodProfilePayload(paymentMethod, { nullFallback: true }), {
    payment_method_brand: "visa",
    payment_method_last4: "4242",
    payment_method_expiry: "12/2030",
  });

  const clearPayload = buildClearPaymentMethodProfilePayload();
  assert.equal(clearPayload.payment_method_brand, null);
  assert.equal(clearPayload.payment_method_last4, null);
  assert.equal(clearPayload.payment_method_expiry, null);
  assert.match(clearPayload.updated_at, /^\d{4}-\d{2}-\d{2}T/);

  const invalidResponse = mapStripeErrorResponse(new Error("Invalid payment method ID"), "Fallback");
  assert.equal(invalidResponse.status, 400);
  assert.deepEqual(await invalidResponse.json(), { error: "Invalid payment method ID" });

  const maskedResponse = mapStripeErrorResponse(new Error("Stripe exploded"), "Fallback");
  assert.equal(maskedResponse.status, 500);
  assert.deepEqual(await maskedResponse.json(), { error: "Fallback" });

  const unmaskedResponse = mapStripeErrorResponse(new Error("Stripe exploded"), "Fallback", {
    maskServerError: false,
  });
  assert.equal(unmaskedResponse.status, 500);
  assert.deepEqual(await unmaskedResponse.json(), { error: "Stripe exploded" });
});

test("resolves subscription SCA and billing payload helpers", () => {
  const {
    buildSubscriptionDeletedProfilePayload,
    buildSubscriptionProfilePayload,
    buildWebhookSubscriptionUpdatePayload,
    isDuplicateWebhookEventError,
    parseKeysToKeep,
    resolveSubscriptionPaymentState,
  } = loadTsModule("lib/services/stripe-billing-flow.service.ts");

  const subscription = {
    id: "sub_123",
    latest_invoice: { payment_intent: { status: "requires_action", client_secret: "pi_secret" } },
    items: { data: [{ price: { recurring: { interval: "year" } } }] },
    current_period_end: 1780000000,
  };

  assert.deepEqual(resolveSubscriptionPaymentState(subscription), {
    type: "requires_action",
    clientSecret: "pi_secret",
    subscriptionId: "sub_123",
  });
  assert.deepEqual(
    resolveSubscriptionPaymentState({
      ...subscription,
      latest_invoice: { payment_intent: { status: "requires_payment_method" } },
    }),
    { type: "requires_payment_method", error: "Your card was declined. Please try another card." }
  );

  const profilePayload = buildSubscriptionProfilePayload({
    planRequest: { planId: "Premium", interval: "year", priceId: "price_premium_year" },
    subscription,
    paymentMethodDetails: {
      payment_method_last4: "4242",
      payment_method_brand: "visa",
      payment_method_expiry: "12/2030",
    },
    billingDetails: { city: "Paris", country: "FR" },
    now: new Date("2026-06-03T10:00:00.000Z"),
  });
  assert.equal(profilePayload.plan, "Premium");
  assert.equal(profilePayload.billing_interval, "year");
  assert.equal(profilePayload.payment_method_last4, "4242");
  assert.equal(profilePayload.billing_city, "Paris");

  const webhookPayload = buildWebhookSubscriptionUpdatePayload({
    customerId: "cus_123",
    subscriptionId: "sub_123",
    subscription,
    verifiedPlan: null,
    paymentMethodDetails: { brand: "visa", last4: "4242", expiry: "12/2030" },
    now: new Date("2026-06-03T10:00:00.000Z"),
  });
  assert.equal(webhookPayload.plan, undefined);
  assert.equal(webhookPayload.stripe_customer_id, "cus_123");
  assert.equal(webhookPayload.billing_interval, "year");

  assert.deepEqual(parseKeysToKeep('["key-1","key-2"]'), ["key-1", "key-2"]);
  assert.deepEqual(parseKeysToKeep('{"bad":true}'), []);
  assert.deepEqual(buildSubscriptionDeletedProfilePayload(new Date("2026-06-03T10:00:00.000Z")), {
    plan: "Hobby",
    updated_at: "2026-06-03T10:00:00.000Z",
  });
  assert.equal(isDuplicateWebhookEventError({ code: "23505" }), true);
  assert.equal(isDuplicateWebhookEventError({ code: "42P01" }), false);
});

test("builds account environments from browser, active keys, and request telemetry", () => {
  const { buildAccountEnvironments, splitAccountEnvironments } = loadTsModule("lib/account-environments.ts");

  const environments = buildAccountEnvironments({
    now: new Date("2026-06-02T12:00:00.000Z"),
    currentRequest: {
      ip: "203.0.113.1",
      userAgent: "Mozilla/5.0 Chrome/125.0",
      city: "Dublin",
      country: "IE",
    },
    apiKeys: [
      {
        id: "key-active",
        name: "Production Key",
        key_type: "production",
        created_at: "2026-06-01T10:00:00.000Z",
        is_active: true,
      },
      {
        id: "key-disabled",
        name: "Disabled Key",
        key_type: "development",
        created_at: "2026-05-01T10:00:00.000Z",
        is_active: false,
      },
    ],
    usageLogs: [
      {
        keyId: "key-active",
        repoUrl: "https://github.com/openai/codex",
        usedAt: "2026-06-02T11:00:00.000Z",
        ip: "198.51.100.7",
        userAgent: "curl/8.7.1",
        country: "GB",
      },
    ],
  });

  assert.equal(environments[0].id, "browser-current");
  assert.equal(environments[0].current, true);
  assert.equal(environments[0].revocable, false);
  assert.equal(environments[0].location, "Dublin, IE");

  const apiKeyEnvironment = environments.find((env) => env.id === "api-key-key-active");
  assert.equal(apiKeyEnvironment?.label, "Production Key");
  assert.equal(apiKeyEnvironment?.revocable, true);
  assert.equal(apiKeyEnvironment?.apiKeyId, "key-active");

  const requestEnvironment = environments.find((env) => env.kind === "api_request");
  assert.equal(requestEnvironment?.label, "Terminal curl command");
  assert.equal(requestEnvironment?.ip, "198.51.100.7");
  assert.equal(requestEnvironment?.revocable, true);

  assert.equal(environments.some((env) => env.id === "api-key-key-disabled"), false);

  const { apiAccessEnvironments, browserEnvironments } = splitAccountEnvironments(environments);
  assert.deepEqual(
    apiAccessEnvironments.map((env) => env.kind).sort(),
    ["api_key", "api_request"]
  );
  assert.deepEqual(browserEnvironments.map((env) => env.kind), ["browser"]);
  assert.equal(apiAccessEnvironments.every((env) => env.revocable), true);
  assert.equal(browserEnvironments[0].revocable, false);
});

test("uses friendlier fallback labels for missing or custom clients", () => {
  const { describeUserAgent } = loadTsModule("lib/account-environments.ts");

  assert.equal(describeUserAgent(null), "Anonymous browser");
  assert.equal(describeUserAgent("Some-Unusual-Client/1.0"), "Custom client");
});

test("resolves Gemini keys from GOOGLE_API_KEYS before legacy keys", () => {
  const snapshot = snapshotGoogleEnv();
  const { getGoogleApiKeys } = loadTsModule("lib/services/google-gemini.service.ts");

  try {
    process.env.GOOGLE_API_KEYS = " key-1, key-2, key-1, , key-3 ";
    process.env.GOOGLE_API_KEY = "legacy-key";
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "legacy-genai-key";
    assert.deepEqual(getGoogleApiKeys(), ["key-1", "key-2", "key-3"]);

    delete process.env.GOOGLE_API_KEYS;
    assert.deepEqual(getGoogleApiKeys(), ["legacy-key", "legacy-genai-key"]);
  } finally {
    restoreGoogleEnv(snapshot);
  }
});

test("resolves Gemini embedding model defaults and overrides", () => {
  const snapshot = snapshotGoogleEnv();
  const { getEmbeddingModel } = loadTsModule("lib/services/google-gemini.service.ts");

  try {
    delete process.env.GOOGLE_EMBEDDING_MODEL;
    assert.equal(getEmbeddingModel(), "gemini-embedding-001");

    process.env.GOOGLE_EMBEDDING_MODEL = "models/custom-model";
    assert.equal(getEmbeddingModel(), "custom-model");
  } finally {
    restoreGoogleEnv(snapshot);
  }
});

test("supports explicit model list options", async () => {
  const snapshot = snapshotGoogleEnv();
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  const calls = [];
  const { googleEmbed } = loadTsModule("lib/services/google-gemini.service.ts");

  try {
    process.env.GOOGLE_API_KEYS = "key-1";
    console.warn = () => {};
    globalThis.fetch = async (url) => {
      const model = String(url).match(/models\/([^:]+):/)?.[1];
      calls.push(model);

      if (model === "gemini-embedding-001") {
        return jsonResponse(
          { error: { status: "RESOURCE_EXHAUSTED", message: "quota exceeded" } },
          { status: 429, statusText: "Too Many Requests" }
        );
      }

      return jsonResponse({ embedding: { values: [0.3, 0.4] } });
    };

    assert.deepEqual(await googleEmbed("query", { models: ["gemini-embedding-001", "gemini-embedding-002"] }), [0.3, 0.4]);
    assert.deepEqual(calls, ["gemini-embedding-001", "gemini-embedding-002"]);
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
    restoreGoogleEnv(snapshot);
  }
});

test("tries Gemini embedding keys in the failover order for the configured model", async () => {
  const snapshot = snapshotGoogleEnv();
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  const calls = [];
  const warnings = [];
  const { googleEmbed } = loadTsModule("lib/services/google-gemini.service.ts");

  try {
    process.env.GOOGLE_API_KEYS = "key-1,key-2,key-3";
    process.env.GOOGLE_EMBEDDING_MODEL = "configured-model";
    console.warn = (...args) => warnings.push(args);
    globalThis.fetch = async (url, options) => {
      const model = String(url).match(/models\/([^:]+):/)?.[1];
      calls.push({
        key: options.headers["x-goog-api-key"],
        model,
      });

      if (calls.length < 3) {
        return jsonResponse(
          { error: { status: "RESOURCE_EXHAUSTED", message: "quota exceeded" } },
          { status: 429, statusText: "Too Many Requests" }
        );
      }

      return jsonResponse({ embedding: { values: [0.1, 0.2] } });
    };

    assert.deepEqual(await googleEmbed("query"), [0.1, 0.2]);
    assert.deepEqual(calls, [
      { key: "key-1", model: "configured-model" },
      { key: "key-2", model: "configured-model" },
      { key: "key-3", model: "configured-model" },
    ]);
    assert(warnings.some((warning) => warning[0].includes("Moving from API key #1 to API key #2")));
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
    restoreGoogleEnv(snapshot);
  }
});

test("dedupes identical Gemini embedding model option attempts", async () => {
  const snapshot = snapshotGoogleEnv();
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  const calls = [];
  const { googleEmbed } = loadTsModule("lib/services/google-gemini.service.ts");

  try {
    process.env.GOOGLE_API_KEYS = "key-1,key-2";
    console.warn = () => {};
    globalThis.fetch = async (url, options) => {
      const model = String(url).match(/models\/([^:]+):/)?.[1];
      calls.push({
        key: options.headers["x-goog-api-key"],
        model,
      });

      if (calls.length === 1) {
        return jsonResponse(
          { error: { status: "RESOURCE_EXHAUSTED", message: "quota exceeded" } },
          { status: 429, statusText: "Too Many Requests" }
        );
      }

      return jsonResponse({ embedding: { values: [0.5, 0.6] } });
    };

    assert.deepEqual(await googleEmbed("query", { models: ["gemini-embedding-001", "models/gemini-embedding-001"] }), [0.5, 0.6]);
    assert.deepEqual(calls, [
      { key: "key-1", model: "gemini-embedding-001" },
      { key: "key-2", model: "gemini-embedding-001" },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
    restoreGoogleEnv(snapshot);
  }
});

test("does not rotate Gemini embedding keys for invalid or unauthorized responses", async () => {
  const snapshot = snapshotGoogleEnv();
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  const { googleEmbed } = loadTsModule("lib/services/google-gemini.service.ts");

  try {
    process.env.GOOGLE_API_KEYS = "key-1,key-2,key-3";
    process.env.GOOGLE_EMBEDDING_MODEL = "configured-model";
    console.warn = () => {};

    for (const [status, upstreamStatus] of [
      [400, "INVALID_ARGUMENT"],
      [401, "UNAUTHENTICATED"],
      [403, "PERMISSION_DENIED"],
    ]) {
      let callCount = 0;
      globalThis.fetch = async () => {
        callCount += 1;
        return jsonResponse({ error: { status: upstreamStatus } }, { status });
      };

      await assert.rejects(() => googleEmbed("query"), new RegExp(String(status)));
      assert.equal(callCount, 1);
    }
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
    restoreGoogleEnv(snapshot);
  }
});

test("classifies exhausted Gemini embedding attempts as rate limit errors", async () => {
  const snapshot = snapshotGoogleEnv();
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  const { googleEmbed, isGeminiEmbeddingRateLimitError } = loadTsModule("lib/services/google-gemini.service.ts");

  try {
    process.env.GOOGLE_API_KEYS = "key-1";
    process.env.GOOGLE_EMBEDDING_MODEL = "primary-model";
    console.warn = () => {};
    globalThis.fetch = async () =>
      jsonResponse(
         { error: { status: "RESOURCE_EXHAUSTED", message: "quota exceeded" } },
         { status: 429, statusText: "Too Many Requests" }
      );

    await assert.rejects(
      () => googleEmbed("query"),
      (error) => {
        assert.equal(isGeminiEmbeddingRateLimitError(error), true);
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
    restoreGoogleEnv(snapshot);
  }
});

test("reports sanitized Gemini embedding exhaustion details", async () => {
  const snapshot = snapshotGoogleEnv();
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  const { googleEmbed } = loadTsModule("lib/services/google-gemini.service.ts");

  try {
    process.env.GOOGLE_API_KEYS = "secret-key";
    process.env.GOOGLE_EMBEDDING_MODEL = "primary-model";
    console.warn = () => {};
    globalThis.fetch = async () =>
      jsonResponse(
        {
          error: {
            status: "RESOURCE_EXHAUSTED",
            message: "quota exceeded for secret-key and super-sensitive-chunk",
          },
        },
        { status: 429, statusText: "Too Many Requests" }
      );

    await assert.rejects(
      () => googleEmbed("super-sensitive-chunk"),
      (error) => {
        assert.match(error.message, /exhausting all models and API keys/);
        assert.match(error.message, /Last status: 429/);
        assert.match(error.message, /Last error: RESOURCE_EXHAUSTED/);
        assert(!error.message.includes("secret-key"));
        assert(!error.message.includes("super-sensitive-chunk"));
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
    restoreGoogleEnv(snapshot);
  }
});

test("uses the matching Gemini model resource for batch embedding requests", async () => {
  const snapshot = snapshotGoogleEnv();
  const originalFetch = globalThis.fetch;
  const { googleBatchEmbed } = loadTsModule("lib/services/google-gemini.service.ts");

  try {
    process.env.GOOGLE_API_KEYS = "key-1";
    process.env.GOOGLE_EMBEDDING_MODEL = "primary-model";
    globalThis.fetch = async (url, options) => {
      const model = String(url).match(/models\/([^:]+):/)?.[1];
      const body = JSON.parse(options.body);
      assert.equal(model, "primary-model");
      assert.equal(body.requests.length, 2);
      assert(body.requests.every((request) => request.model === "models/primary-model"));
      assert(body.requests.every((request) => request.embedContentConfig?.outputDimensionality === 768));
      assert(body.requests.every((request) => request.outputDimensionality === 768));
      return jsonResponse({ embeddings: [{ values: [1, 2] }, { values: [3, 4] }] });
    };

    assert.deepEqual(await googleBatchEmbed(["first", "second"]), [[1, 2], [3, 4]]);
  } finally {
    globalThis.fetch = originalFetch;
    restoreGoogleEnv(snapshot);
  }
});

test("uses EmbedContentConfig dimensionality for single Gemini embedding requests", async () => {
  const snapshot = snapshotGoogleEnv();
  const originalFetch = globalThis.fetch;
  const { googleEmbed } = loadTsModule("lib/services/google-gemini.service.ts");

  try {
    process.env.GOOGLE_API_KEYS = "key-1";
    process.env.GOOGLE_EMBEDDING_MODEL = "gemini-embedding-001";
    globalThis.fetch = async (url, options) => {
      const model = String(url).match(/models\/([^:]+):/)?.[1];
      const body = JSON.parse(options.body);
      assert.equal(model, "gemini-embedding-001");
      assert.equal(body.model, "models/gemini-embedding-001");
      assert.equal(body.embedContentConfig.outputDimensionality, 768);
      assert.equal(body.outputDimensionality, 768);
      return jsonResponse({ embedding: { values: [0.7, 0.8] } });
    };

    assert.deepEqual(await googleEmbed("query"), [0.7, 0.8]);
  } finally {
    globalThis.fetch = originalFetch;
    restoreGoogleEnv(snapshot);
  }
});

test("keeps all batch embedding chunks on the first selected model", async () => {
  const snapshot = snapshotGoogleEnv();
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  const calls = [];
  const { googleBatchEmbedWithModel } = loadTsModule("lib/services/google-gemini.service.ts");

  try {
    process.env.GOOGLE_API_KEYS = "key-1";
    process.env.GOOGLE_EMBEDDING_MODEL = "primary-model";
    console.warn = () => {};
    globalThis.fetch = async (url, options) => {
      const model = String(url).match(/models\/([^:]+):/)?.[1];
      const body = JSON.parse(options.body);
      calls.push({ model, count: body.requests.length });

      if (calls.length === 2) {
        return jsonResponse(
          { error: { status: "RESOURCE_EXHAUSTED", message: "quota exceeded" } },
          { status: 429, statusText: "Too Many Requests" }
        );
      }

      return jsonResponse({
        embeddings: body.requests.map((_, index) => ({ values: [index, index + 1] })),
      });
    };

    await assert.rejects(() => googleBatchEmbedWithModel(Array.from({ length: 21 }, (_, index) => `chunk ${index}`)));
    assert.deepEqual(calls, [
      { model: "primary-model", count: 20 },
      { model: "primary-model", count: 1 },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
    restoreGoogleEnv(snapshot);
  }
});

test("builds usage display trends from parsed Redis logs", () => {
  const {
    buildCountOnlyDailyTrend,
    buildDailyUsageTrend,
    getTopReposFromLogs,
    parseUsageLogs,
    summarizeDailyLogs,
  } = loadTsModule("lib/services/usage-billing.service.ts");

  const logs = parseUsageLogs([
    JSON.stringify({
      keyId: "key-1",
      usedAt: "2026-06-01T10:00:00.000Z",
      status: "success",
      latencyMs: 120,
      repoUrl: "https://github.com/openai/codex",
    }),
    JSON.stringify({
      keyId: "key-1",
      usedAt: "2026-06-01T11:00:00.000Z",
      status: "error",
      latencyMs: 80,
      repoUrl: "https://github.com/openai/codex",
    }),
    JSON.stringify({
      keyId: "key-1",
      usedAt: "2026-06-02T09:00:00.000Z",
      status: "success",
      latencyMs: 100,
      repoUrl: "https://github.com/vercel/next.js",
    }),
  ], { requireKeyId: true });

  assert.equal(logs.length, 3);
  assert.deepEqual(summarizeDailyLogs("2026-06-01", logs), {
    date: "2026-06-01",
    count: 1,
    success: 1,
    error: 1,
    avgLatency: 100,
  });
  assert.deepEqual(buildDailyUsageTrend(["2026-06-01", "2026-06-02"], logs, 2), [
    { date: "2026-06-01", count: 1, success: 1, error: 1, avgLatency: 100 },
    { date: "2026-06-02", count: 1, success: 1, error: 0, avgLatency: 100 },
  ]);
  assert.deepEqual(buildCountOnlyDailyTrend(["2026-06-01", "2026-06-02"], logs), [
    { date: "2026-06-01", count: 2 },
    { date: "2026-06-02", count: 1 },
  ]);
  assert.deepEqual(getTopReposFromLogs(logs, 1), [
    { repo_url: "https://github.com/openai/codex", count: 2 },
  ]);
});

test("calculates quota reset dates correctly for Hobby and paid subscription tiers", () => {
  const { calculateResetDate } = loadTsModule("lib/services/server-data.service.ts");

  const now = new Date("2026-06-05T12:00:00.000Z");

  // 1. Hobby Plan (null nextInvoiceDate) -> resets on 1st of next month
  const hobbyReset = calculateResetDate(null, now);
  const hobbyResDate = new Date(hobbyReset);
  assert.equal(hobbyResDate.getDate(), 1);
  assert.equal(hobbyResDate.getMonth(), (now.getMonth() + 1) % 12);
  // Let's assert on the exact UTC components or just construct a new Date to match
  const expectedHobby = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  assert.equal(hobbyReset, expectedHobby.toISOString());

  // 2. Paid monthly plan, future date -> resets on the invoice date
  const futureMonthlyReset = calculateResetDate("2026-06-24T00:00:00.000Z", now);
  assert.equal(futureMonthlyReset, "2026-06-24T00:00:00.000Z");

  // 3. Paid plan with stale/past billing date (e.g. May 24, 2026) -> resets on next monthly anniversary (June 24, 2026)
  const staleMonthlyReset = calculateResetDate("2026-05-24T00:00:00.000Z", now);
  const resDate = new Date(staleMonthlyReset);
  assert.equal(resDate.getDate(), 24);
  assert.equal(resDate.getMonth(), 5); // June is 5 (0-indexed)
  assert.equal(resDate.getFullYear(), 2026);

  // 4. Yearly plan, future date (e.g. June 24, 2027) -> resets on next monthly anniversary (June 24, 2026)
  const yearlyReset = calculateResetDate("2027-06-24T00:00:00.000Z", now);
  const yearlyResDate = new Date(yearlyReset);
  assert.equal(yearlyResDate.getDate(), 24);
  assert.equal(yearlyResDate.getMonth(), 5); // June is 5
  assert.equal(yearlyResDate.getFullYear(), 2026);
});

test("calculates next invoice dates correctly for different subscription plans", () => {
  const { calculateNextInvoiceDate } = loadTsModule("lib/services/server-data.service.ts");

  const now = new Date("2026-06-05T12:00:00.000Z");

  // 1. Hobby Plan (null) -> null
  assert.equal(calculateNextInvoiceDate(null, null, now), null);

  // 2. Future invoice date -> unchanged
  assert.equal(calculateNextInvoiceDate("2026-06-24T00:00:00.000Z", "month", now), "2026-06-24T00:00:00.000Z");

  // 3. Stale monthly invoice date (e.g. May 24, 2026) -> rolls over to June 24, 2026
  const staleMonthly = calculateNextInvoiceDate("2026-05-24T00:00:00.000Z", "month", now);
  const monthlyResDate = new Date(staleMonthly);
  assert.equal(monthlyResDate.getDate(), 24);
  assert.equal(monthlyResDate.getMonth(), 5); // June
  assert.equal(monthlyResDate.getFullYear(), 2026);

  // 4. Stale yearly invoice date (e.g. May 24, 2026) -> rolls over to May 24, 2027
  const staleYearly = calculateNextInvoiceDate("2026-05-24T00:00:00.000Z", "year", now);
  const yearlyResDate = new Date(staleYearly);
  assert.equal(yearlyResDate.getDate(), 24);
  assert.equal(yearlyResDate.getMonth(), 4); // May
  assert.equal(yearlyResDate.getFullYear(), 2027);
});

test("validateApiKey maps users and sessions correctly", async () => {
  const serverFilename = resolve(repoRoot, "lib/supabase/server.ts");
  const originalMock = moduleCache.get(serverFilename);
  
  let mockSupabaseUser = null;
  moduleCache.set(serverFilename, {
    exports: {
      createClient: async () => ({
        auth: {
          getUser: async () => ({ data: { user: mockSupabaseUser } }),
        },
      }),
    },
  });

  const { validateApiKey } = loadTsModule("lib/services/api-key.service.ts");
  
  try {
    // 1. Demo key without session should throw
    mockSupabaseUser = null;
    await assert.rejects(
      async () => await validateApiKey("__demo__"),
      /Active browser session required/
    );

    // 2. Demo key with session should return real user ID in browserUserId
    mockSupabaseUser = { id: "real-browser-user-uuid", email: "user@example.com" };
    const demoKeyResult = await validateApiKey("__demo__");
    assert.equal(demoKeyResult.user_id, "demo-user-id");
    assert.equal(demoKeyResult.browserUserId, "real-browser-user-uuid");

    // 3. Custom key resolves to owner user ID and does not have browserUserId
    const { supabaseAdmin } = loadTsModule("lib/supabase-admin.ts");
    const originalFrom = supabaseAdmin.from;
    supabaseAdmin.from = (table) => {
      assert.equal(table, "api_keys");
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  id: "key-123",
                  name: "Prod Key",
                  user_id: "key-owner-uuid",
                  usage_count: 5,
                  monthly_limit: 1000,
                  is_active: true,
                  profiles: { plan: "Hobby", email: "owner@example.com" },
                },
                error: null,
              }),
            }),
          }),
        }),
      };
    };

    const customKeyResult = await validateApiKey("my-custom-api-key");
    assert.equal(customKeyResult.user_id, "key-owner-uuid");
    assert.equal(customKeyResult.browserUserId, undefined);

    supabaseAdmin.from = originalFrom;
  } finally {
    if (originalMock) {
      moduleCache.set(serverFilename, originalMock);
    } else {
      moduleCache.delete(serverFilename);
    }
  }
});

test("resolveGitHubRepoAccessForSummary resolves access securely", async () => {
  const { supabaseAdmin } = loadTsModule("lib/supabase-admin.ts");
  const githubAppService = loadTsModule("lib/services/github-app.service.ts");
  const { resolveGitHubRepoAccessForSummary } = githubAppService;
  
  const originalFrom = supabaseAdmin.from;
  let mockInstallationResult = null;
  
  try {
    supabaseAdmin.from = (table) => {
      assert.equal(table, "github_app_installations");
      return {
        select: () => ({
          eq: (col) => {
            assert.equal(col, "user_id");
            return {
              order: () => ({
                limit: () => ({
                  maybeSingle: async () => ({ data: mockInstallationResult, error: null }),
                }),
              }),
            };
          },
        }),
      };
    };
    
    // 1. If userId is null, access is denied (not connected)
    const res1 = await resolveGitHubRepoAccessForSummary({ userId: null, repoFullName: "owner/repo" });
    assert.equal(res1.authorized, false);
    assert.equal(res1.errorCode, "GITHUB_PRIVATE_REPO_NOT_CONNECTED");
    
    // 2. If no installation found in DB, access is denied (not connected)
    mockInstallationResult = null;
    const res2 = await resolveGitHubRepoAccessForSummary({ userId: "user-123", repoFullName: "owner/repo" });
    assert.equal(res2.authorized, false);
    assert.equal(res2.errorCode, "GITHUB_PRIVATE_REPO_NOT_CONNECTED");
    
    // 3. If installation exists but repository is not in snapshot, access is denied (not granted)
    mockInstallationResult = {
      installation_id: 12345,
      verified_repositories: [
        { fullName: "owner/other-repo", private: true },
      ],
    };
    const res3 = await resolveGitHubRepoAccessForSummary({ userId: "user-123", repoFullName: "owner/repo" });
    assert.equal(res3.authorized, false);
    assert.equal(res3.errorCode, "GITHUB_PRIVATE_REPO_NOT_GRANTED");

    // 4. If repository is in snapshot (even with case difference), it attempts to authorize
    const originalCreateSign = crypto.createSign;
    crypto.createSign = () => ({
      update: () => ({
        sign: () => Buffer.from("mock-signature"),
      }),
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      if (String(url).includes("/access_tokens")) {
        return {
          ok: true,
          json: async () => ({ token: "mock-install-token", expires_at: null }),
        };
      }
      return { ok: false };
    };

    mockInstallationResult = {
      installation_id: 12345,
      verified_repositories: [
        { fullName: "OWNER/repo", private: true },
      ],
    };
    
    try {
      const res4 = await resolveGitHubRepoAccessForSummary({ userId: "user-123", repoFullName: "owner/repo" });
      assert.equal(res4.authorized, true);
      assert.equal(res4.token, "mock-install-token");
    } finally {
      crypto.createSign = originalCreateSign;
      globalThis.fetch = originalFetch;
    }
  } finally {
    supabaseAdmin.from = originalFrom;
  }
});

test("GitHub service supports optional installation token for private repositories", async () => {
  const originalFetch = globalThis.fetch;
  const { fetchGitHubReadme, fetchGitHubMetadata } = loadTsModule("lib/services/github.service.ts");
  const calls = [];

  try {
    globalThis.fetch = async (url, options) => {
      calls.push({
        url: String(url),
        authHeader: options?.headers?.["Authorization"] || null,
      });

      if (String(url).endsWith("/readme")) {
        return {
          ok: true,
          text: async () => "# Private Repo Readme",
        };
      }

      return {
        ok: true,
        json: async () => ({
          stargazers_count: 42,
          license: { spdx_id: "MIT" },
          forks_count: 5,
          description: "A private repo",
          default_branch: "main",
        }),
      };
    };

    const originalToken = process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_TOKEN;

    const readmeNoToken = await fetchGitHubReadme("https://github.com/owner/repo");
    const metaNoToken = await fetchGitHubMetadata("https://github.com/owner/repo");

    assert.equal(readmeNoToken, "# Private Repo Readme");
    assert.equal(metaNoToken.stars, 42);
    assert.equal(calls[0].authHeader, null);

    calls.length = 0;
    const readmeWithToken = await fetchGitHubReadme("https://github.com/owner/repo", "my-installation-token");
    const metaWithToken = await fetchGitHubMetadata("https://github.com/owner/repo", "my-installation-token");

    assert.equal(readmeWithToken, "# Private Repo Readme");
    assert.equal(metaWithToken.stars, 42);
    assert.equal(calls[0].authHeader, "Bearer my-installation-token");
    assert.equal(calls[1].authHeader, "Bearer my-installation-token");

    if (originalToken) {
      process.env.GITHUB_TOKEN = originalToken;
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
