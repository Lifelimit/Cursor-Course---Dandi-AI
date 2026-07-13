import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { EventEmitter } from "node:events";
import { existsSync, readFileSync } from "node:fs";
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
  "RAG_EMBED_MAX_ATTEMPTS",
  "RAG_EMBED_RETRY_BASE_MS",
  "RAG_EMBED_RETRY_MAX_MS",
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

function embeddingVector(first, second) {
  const values = Array(768).fill(0);
  values[0] = first;
  values[1] = second;
  return values;
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
    null
  );
  assert.equal(
    normalizeGitHubRepoUrl("https://github.com/OpenAI/codex/blob/main/src/index.ts"),
    null
  );
  assert.equal(normalizeGitHubRepoUrl("https://github.com/OpenAI/codex/issues/1"), null);
  assert.equal(
    normalizeGitHubRepoUrl("https://github.com/OpenAI/codex.git"),
    "https://github.com/OpenAI/codex"
  );
  assert.equal(normalizeGitHubRepoUrl("http://github.com/OpenAI/codex"), null);
  assert.equal(normalizeGitHubRepoUrl("https://example.com/OpenAI/codex"), null);
  assert.equal(normalizeGitHubRepoUrl("https://github.com/-bad/codex"), null);
  assert.equal(normalizeGitHubRepoUrl("https://github.com/OpenAI/.codex"), null);
});

test("auth redirects stay same-origin and avoid auth loops", () => {
  const { getSafeAuthRedirect } = loadTsModule("lib/auth-utils.ts");

  assert.equal(getSafeAuthRedirect("/playground?mode=ask"), "/playground?mode=ask");
  assert.equal(getSafeAuthRedirect("https://evil.example/steal"), "/dashboards");
  assert.equal(getSafeAuthRedirect("//evil.example/steal"), "/dashboards");
  assert.equal(getSafeAuthRedirect("/login"), "/dashboards");
  assert.equal(getSafeAuthRedirect("/auth/success"), "/auth/success");
  assert.equal(getSafeAuthRedirect("/reset-password"), "/reset-password");
});

test("auth lifecycle keeps callback errors safe and recovery flows dedicated", () => {
  const callbackSource = readFileSync(resolve(repoRoot, "app/auth/callback/route.ts"), "utf8");
  const authFormSource = readFileSync(resolve(repoRoot, "components/auth/AuthForm.tsx"), "utf8");
  const successSource = readFileSync(resolve(repoRoot, "app/auth/success/page.tsx"), "utf8");
  const loginSource = readFileSync(resolve(repoRoot, "app/login/page.tsx"), "utf8");
  const resetSource = readFileSync(resolve(repoRoot, "components/auth/ResetPasswordForm.tsx"), "utf8");

  assert.match(callbackSource, /getSafeAuthRedirect/);
  assert.match(callbackSource, /exchangeCodeForSession/);
  assert.match(callbackSource, /recoveryDestination/);
  assert.match(callbackSource, /returnTo !== DEFAULT_AUTH_REDIRECT/);
  assert.doesNotMatch(callbackSource, /error_description/);
  assert.match(authFormSource, /getAuthCallbackUrl\("\/auth\/success", \{ flow: "signup", returnTo: safeNext \}\)/);
  assert.match(successSource, /getSafeAuthRedirect\(params\.next\)/);
  assert.match(successSource, /primaryHref=\{nextPath\}/);
  assert.match(successSource, /primaryHref=\{`\/login\$\{nextQuery\}`\}/);
  assert.match(loginSource, /getAuthErrorGuidance/);
  assert.match(resetSource, /PASSWORD_RECOVERY/);
  assert.match(resetSource, /updateUser\(\{ password \}\)/);
});

test("formats GitHub repository labels without changing legacy fallbacks", () => {
  const { GITHUB_REPOSITORY_URL_VALIDATION_MESSAGE, getGitHubRepoPath, formatGitHubRepoLabel, getGitHubRepositoryParts } = loadTsModule("lib/github-url.ts");

  assert.equal(getGitHubRepoPath("https://github.com/openai/codex/tree/main"), "openai/codex");
  assert.equal(getGitHubRepoPath("not a repo"), "unknown/repository");
  assert.equal(getGitHubRepoPath("not a repo", "repository"), "repository");
  assert.equal(formatGitHubRepoLabel("https://github.com/openai/codex/"), "openai/codex/");
  assert.equal(formatGitHubRepoLabel("https://github.com/openai/codex/", { trimTrailingSlash: true }), "openai/codex");
  assert.deepEqual(getGitHubRepositoryParts("https://github.com/openai/codex"), {
    owner: "openai",
    repo: "codex",
  });
  assert.throws(() => getGitHubRepositoryParts("not-a-github-url"), /Invalid GitHub URL/);
  assert.throws(() => getGitHubRepositoryParts("https://example.com/openai/codex"), /Invalid GitHub URL/);
  assert.throws(() => getGitHubRepositoryParts("https://github.com/openai/codex/tree/main"), /Invalid GitHub URL/);
  assert.throws(() => getGitHubRepositoryParts("https://github.com/openai"), /Invalid GitHub URL/);
  assert.equal(GITHUB_REPOSITORY_URL_VALIDATION_MESSAGE, "Enter a valid GitHub repository URL, for example https://github.com/owner/repository.");
});

test("Playground repository URL validation is visible and accessible without starting a request", () => {
  const builderSource = readFileSync(resolve(repoRoot, "components/playground/RepositoryRequestBuilder.tsx"), "utf8");
  const clientSource = readFileSync(resolve(repoRoot, "app/playground/PlaygroundClient.tsx"), "utf8");

  assert.match(builderSource, /role="alert"/);
  assert.match(builderSource, /aria-invalid=\{repositoryUrlError \? "true" : undefined\}/);
  assert.match(builderSource, /aria-describedby=\{repositoryUrlError \? "github-url-error" : undefined\}/);
  assert.match(clientSource, /setRepositoryUrlError\(GITHUB_REPOSITORY_URL_VALIDATION_MESSAGE\)/);
  assert.match(clientSource, /setRepositoryUrlError\(""\)/);
});

test("native disclosure controls use intentional keyboard focus styling", () => {
  const summaryFiles = [
    "app/usage/UsageClient.tsx",
    "components/playground/RepositoryChatPanel.tsx",
    "components/playground/PlaygroundSidebar.tsx",
    "components/ui/GuidedError.tsx",
  ];

  for (const relativePath of summaryFiles) {
    const source = readFileSync(resolve(repoRoot, relativePath), "utf8");
    const summaries = source.match(/<summary[^>]*className="[^"]*"/g) || [];
    assert.ok(summaries.length > 0, `${relativePath} should contain a summary control`);
    assert.ok(summaries.every((summary) => summary.includes("focus:outline-none") && summary.includes("focus-visible:ring-")), `${relativePath} should style every summary focus state`);
  }
});

test("Playground keeps lifecycle primary and diagnostics secondary", () => {
  const progressSource = readFileSync(resolve(repoRoot, "components/playground/PlaygroundRequestProgress.tsx"), "utf8");
  const modeTabsSource = readFileSync(resolve(repoRoot, "components/playground/PlaygroundModeTabs.tsx"), "utf8");

  assert.match(progressSource, /Execution plane/);
  assert.match(progressSource, /Developer diagnostics/);
  assert.match(progressSource, /<details className="group rounded-2xl/);
  assert.match(modeTabsSource, /label: "Summarize"/);
  assert.match(modeTabsSource, /label: "Prepare & Ask"/);
});

test("keyboard-focusable scroll regions suppress browser-default mouse focus outlines", () => {
  const source = readFileSync(resolve(repoRoot, "components/command/ScrollFrame.tsx"), "utf8");

  assert.match(source, /outline-none/);
  assert.match(source, /focus-visible:ring-2/);
  assert.match(source, /focus-visible:ring-inset/);
});

test("global keyboard focus feedback does not appear on mouse clicks", () => {
  const source = readFileSync(resolve(repoRoot, "app/globals.css"), "utf8");

  assert.match(source, /\[tabindex\]:not\(\[tabindex="-1"\]\)\)\:focus-visible/);
  assert.doesNotMatch(source, /\[tabindex\]:not\(\[tabindex="-1"\]\)\)\:focus\s*\{/);
});

test("restores the latest durable ingestion job without selecting another repository", () => {
  const { selectRestorableIngestionJob, toLocalIngestStatus } = loadTsModule("hooks/useRepositoryIngestion.ts");
  const jobs = [
    {
      jobId: "failed-job",
      apiKeyId: "key-1",
      status: "failed",
      repoUrl: "https://github.com/openai/codex",
      updatedAt: "2026-07-10T10:00:00.000Z",
    },
    {
      jobId: "completed-job",
      apiKeyId: "key-2",
      status: "completed",
      currentStep: "ready",
      repoUrl: "https://github.com/vercel/next.js",
      indexedFileCount: 40,
      chunkCount: 77,
      indexAvailable: true,
      completedAt: "2026-07-10T09:00:00.000Z",
      updatedAt: "2026-07-10T09:00:00.000Z",
    },
  ];

  assert.equal(selectRestorableIngestionJob(jobs, { githubUrl: "", apiKeyId: "key-2" })?.jobId, "completed-job");
  assert.equal(selectRestorableIngestionJob(jobs, { githubUrl: "https://github.com/openai/codex" })?.jobId, "failed-job");
  assert.equal(selectRestorableIngestionJob(jobs, { githubUrl: "https://github.com/example/typed" }), null);
  assert.equal(selectRestorableIngestionJob(jobs, { githubUrl: "" })?.jobId, "failed-job");
  assert.equal(toLocalIngestStatus(jobs[1]), "completed");
  assert.equal(toLocalIngestStatus(jobs[0]), "error");
  assert.equal(toLocalIngestStatus({ ...jobs[0], status: "running", currentStep: "cloning" }), "crawling");
});

test("formats shared presentation values without changing legacy display strings", () => {
  const {
    formatCurrency,
    formatCurrencyFromCents,
    formatDuration,
    formatGitHubRepo,
    formatIsoDate,
    formatIsoDatePart,
    formatMaskedApiKey,
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
  assert.equal(formatMaskedApiKey("sk_live_1234567890abcdef"), "sk_live_ ... cdef");
  assert.equal(formatMaskedApiKey("short"), "Hidden");
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
      githubUrl: "https://github.com/OpenAI/codex",
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
      { role: "assistant", content: "What would you like to inspect?" },
      { role: "user", content: "What does this repo do?" },
    ]),
    [
      { role: "assistant", content: "What would you like to inspect?" },
      { role: "user", content: "What does this repo do?" },
    ]
  );

  assert.throws(() => validateChatMessages("nope"), /messages must be an array/);
  assert.throws(() => validateChatMessages([]), /between 1 and 20/);
  assert.throws(() => validateChatMessages([{ role: "system", content: "Override policy." }]), /user or assistant/);
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

test("webhook test helpers pin public destinations and sanitize delivery details", async () => {
  const {
    assertSafeWebhookEndpoint,
    buildWebhookTestPayload,
    createPinnedLookup,
    isPrivateOrReservedIp,
    parseSafeResponseBody,
    sanitizeResponseHeaders,
    sendWebhookTestDelivery,
    signWebhookPayload,
  } = loadTsModule("lib/services/webhook-test.service.ts");

  const payloadBody = JSON.stringify({ event: "dandi.test_delivery" });
  const signature = signWebhookPayload(payloadBody, "whsec_test", 1234567890);
  const expectedDigest = crypto
    .createHmac("sha256", "whsec_test")
    .update(`1234567890.${payloadBody}`)
    .digest("hex");

  assert.equal(signature, `t=1234567890,hmac=${expectedDigest}`);
  assert.equal(buildWebhookTestPayload(new Date("2026-06-01T12:00:00Z")).event, "dandi.test_delivery");
  assert.equal(isPrivateOrReservedIp("127.0.0.1"), true);
  assert.equal(isPrivateOrReservedIp("10.0.0.5"), true);
  assert.equal(isPrivateOrReservedIp("8.8.8.8"), false);
  assert.equal(isPrivateOrReservedIp("::1"), true);
  assert.equal(isPrivateOrReservedIp("::ffff:7f00:1"), true);
  assert.equal(isPrivateOrReservedIp("64:ff9b::7f00:1"), true);
  assert.equal(isPrivateOrReservedIp("100:0:0:1::1"), true);
  assert.equal(isPrivateOrReservedIp("2002:7f00:1::"), true);
  assert.equal(isPrivateOrReservedIp("3fff::1"), true);
  assert.equal(isPrivateOrReservedIp("5f00::1"), true);

  await assert.rejects(
    () => assertSafeWebhookEndpoint("http://127.0.0.1/webhook"),
    /private or reserved network address/i,
  );
  await assert.rejects(
    () => assertSafeWebhookEndpoint("http://[::ffff:7f00:1]/webhook"),
    /private or reserved network address/i,
  );
  await assert.rejects(
    () => assertSafeWebhookEndpoint("https://user:password@8.8.8.8/webhook"),
    /embedded credentials/i,
  );
  const publicTarget = await assertSafeWebhookEndpoint("https://8.8.8.8/webhook");
  assert.equal(publicTarget.address, "8.8.8.8");
  assert.equal(publicTarget.family, 4);

  const pinnedLookup = createPinnedLookup("8.8.8.8", 4);
  const pinnedResult = await new Promise((resolve, reject) => {
    pinnedLookup("rebind.example", { all: false }, (error, address, family) => {
      if (error) reject(error);
      else resolve({ address, family });
    });
  });
  assert.deepEqual(pinnedResult, { address: "8.8.8.8", family: 4 });

  const headers = new Headers({
    "content-type": "application/json",
    "set-cookie": "session=secret",
    "x-api-key": "secret",
    "x-request-id": "req_123",
  });
  assert.deepEqual(sanitizeResponseHeaders(headers), {
    "content-type": "application/json",
    "x-request-id": "req_123",
  });
  assert.deepEqual(parseSafeResponseBody("{\"ok\":true}", "application/json"), { ok: true });

  const webhookSource = readFileSync(resolve(repoRoot, "lib/services/webhook-test.service.ts"), "utf8");
  const profileSource = readFileSync(resolve(repoRoot, "app/api/profile/route.ts"), "utf8");
  assert.match(webhookSource, /lookup: createPinnedLookup\(endpoint\.address, endpoint\.family\)/);
  assert.match(webhookSource, /transport\.request\(endpoint\.url/);
  assert.doesNotMatch(webhookSource, /fetch\(input\.webhookUrl/);
  assert.match(profileSource, /await assertSafeWebhookEndpoint\(sanitizedWebhookUrl\)/);

  const httpModule = require("node:http");
  const originalRequest = httpModule.request;
  const requestOptions = [];
  try {
    httpModule.request = (url, options, onResponse) => {
      requestOptions.push({ url: String(url), options });
      const request = new EventEmitter();
      request.end = () => {
        const response = new EventEmitter();
        response.statusCode = 302;
        response.headers = { location: "http://127.0.0.1/internal" };
        response.destroy = () => {};
        onResponse(response);
        queueMicrotask(() => response.emit("end"));
      };
      return request;
    };

    const redirectResult = await sendWebhookTestDelivery({
      webhookUrl: "http://8.8.8.8/webhook",
      signingSecret: "whsec_test",
      now: new Date("2026-06-01T12:00:00Z"),
    });
    assert.equal(redirectResult.success, false);
    assert.equal(redirectResult.delivery.status, 302);
    assert.equal(requestOptions.length, 1, "redirect destinations must never be followed");
    assert.equal(requestOptions[0].options.headers["X-Dandi-Signature-Version"], "1");

    const connectedAddress = await new Promise((resolve, reject) => {
      requestOptions[0].options.lookup("rebind.example", { all: false }, (error, address, family) => {
        if (error) reject(error);
        else resolve({ address, family });
      });
    });
    assert.deepEqual(connectedAddress, { address: "8.8.8.8", family: 4 });
  } finally {
    httpModule.request = originalRequest;
  }
});

test("scheduled customer webhooks are deferred while on-demand tests remain supported", () => {
  const removedQueueMigration = resolve(repoRoot, "supabase/migrations/20260712_create_webhook_delivery_queue.sql");
  const profileRoute = readFileSync(resolve(repoRoot, "app/api/profile/route.ts"), "utf8");
  const accountSource = readFileSync(resolve(repoRoot, "app/account/AccountClient.tsx"), "utf8");
  const webhookPanelSource = readFileSync(resolve(repoRoot, "components/account/AccountDeliveryLogsPanel.tsx"), "utf8");
  const webhookSettingsSource = readFileSync(resolve(repoRoot, "components/account/AccountWebhooksPanel.tsx"), "utf8");
  const webhookTestRoute = readFileSync(resolve(repoRoot, "app/api/profile/webhook-test/route.ts"), "utf8");
  const stripeWebhookRoute = readFileSync(resolve(repoRoot, "app/api/webhooks/stripe/route.ts"), "utf8");
  const envSource = readFileSync(resolve(repoRoot, "lib/env.ts"), "utf8");
  const envExample = readFileSync(resolve(repoRoot, ".env.example"), "utf8");
  const validationScript = readFileSync(resolve(repoRoot, "scripts/external-validation.mjs"), "utf8");
  const vercelConfig = readFileSync(resolve(repoRoot, "vercel.json"), "utf8");
  const apiKeySource = readFileSync(resolve(repoRoot, "lib/services/api-key.service.ts"), "utf8");

  assert.deepEqual(JSON.parse(vercelConfig).crons, [{ path: "/api/internal/rag/worker", schedule: "0 3 * * *" }]);
  assert.equal(existsSync(removedQueueMigration), false);
  assert.doesNotMatch(profileRoute, /webhook_deliveries|webhook_failure_count|webhook_disabled_until/);
  assert.doesNotMatch(accountSource, /webhook-deliveries|production alert deliveries|retry outcomes/i);
  assert.match(webhookPanelSource, /not persisted as delivery history/i);
  assert.match(webhookSettingsSource, /Automatic customer-event webhooks.*deferred/i);
  assert.match(webhookTestRoute, /sendWebhookTestDelivery/);
  assert.match(webhookTestRoute, /getWebhookSigningSecret\(userId\)/);
  assert.match(accountSource, /fetch\("\/api\/profile\/webhook-test"/);
  assert.match(stripeWebhookRoute, /stripe\.webhooks\.constructEvent/);
  assert.doesNotMatch(stripeWebhookRoute, /enqueueProductionWebhookEvent|sendWebhookTestDelivery|webhook-delivery\.service/);
  assert.doesNotMatch(apiKeySource, /enqueueProductionWebhookEvent|webhook-delivery\.service/);
  assert.doesNotMatch(envSource, /CRON_[A-Z_]+/);
  assert.match(envExample, /CRON_SECRET/);
  assert.doesNotMatch(validationScript, /CRON_[A-Z_]+|webhook-delivery|worker auth/i);
});

test("webhook signing secrets are strong, one-time disclosures with metadata-only routine reads", () => {
  const { generateWebhookSigningSecret, getWebhookSecretMetadata } = loadTsModule("lib/services/webhook-secret.service.ts");
  const first = generateWebhookSigningSecret();
  const second = generateWebhookSigningSecret();

  assert.match(first, /^whsec_dandi_[a-f0-9]{64}$/);
  assert.notEqual(first, second);
  assert.deepEqual(getWebhookSecretMetadata(first), {
    webhookSecretConfigured: true,
    webhookSecretLastFour: first.slice(-4),
  });
  assert.deepEqual(getWebhookSecretMetadata(""), {
    webhookSecretConfigured: false,
    webhookSecretLastFour: null,
  });

  const profileSource = readFileSync(resolve(repoRoot, "app/api/profile/route.ts"), "utf8");
  const rotationSource = readFileSync(resolve(repoRoot, "app/api/profile/webhook-secret/route.ts"), "utf8");
  const webhookTestSource = readFileSync(resolve(repoRoot, "app/api/profile/webhook-test/route.ts"), "utf8");
  const secretServiceSource = readFileSync(resolve(repoRoot, "lib/services/webhook-secret.service.ts"), "utf8");
  const isolationMigration = readFileSync(
    resolve(repoRoot, "supabase/migrations/20260712130000_isolate_webhook_signing_secrets.sql"),
    "utf8",
  );
  const accountSource = readFileSync(resolve(repoRoot, "app/account/AccountClient.tsx"), "utf8");
  const panelSource = readFileSync(resolve(repoRoot, "components/account/AccountWebhooksPanel.tsx"), "utf8");

  assert.match(profileSource, /getWebhookSigningSecret\(user\.id\)/);
  assert.match(profileSource, /getWebhookSecretMetadata\(webhookSecret\)/);
  assert.match(profileSource, /updateWebhookConfiguration\(user\.id, sanitizedWebhookUrl, webhookSecret\)/);
  assert.match(profileSource, /\.\.\.\(newWebhookSecret \? \{ newWebhookSecret \} : \{\}\)/);
  assert.doesNotMatch(profileSource, /\.select\([^\n]*webhook_secret/);
  assert.doesNotMatch(profileSource, /updateData\.github_connected/);
  assert.doesNotMatch(profileSource, /const \{ fullName, orgSlug, webhookUrl, githubConnected \}/);
  assert.match(profileSource, /"Cache-Control": "no-store, no-cache, must-revalidate"/);

  assert.match(rotationSource, /body\.confirm !== true/);
  assert.match(rotationSource, /\.eq\("id", user\.id\)/);
  assert.match(rotationSource, /saveWebhookSigningSecret\(user\.id, newWebhookSecret\)/);
  assert.doesNotMatch(rotationSource, /webhook_secret/);
  assert.match(rotationSource, /"Content-Type must be application\/json\."/);
  assert.match(rotationSource, /"Cache-Control": "no-store, no-cache, must-revalidate"/);

  assert.match(webhookTestSource, /getWebhookSigningSecret\(userId\)/);
  assert.doesNotMatch(webhookTestSource, /\.select\([^\n]*webhook_secret/);
  assert.match(secretServiceSource, /\.from\("profile_webhook_secrets"\)/);
  assert.match(secretServiceSource, /isMissingRelationError\(error\?\.code\)/);
  assert.match(secretServiceSource, /update_profile_webhook_configuration/);
  assert.match(secretServiceSource, /Only use the legacy[\s\S]*when the new table is also genuinely absent/);

  assert.match(isolationMigration, /CREATE TABLE IF NOT EXISTS public\.profile_webhook_secrets/);
  assert.match(isolationMigration, /ALTER TABLE public\.profile_webhook_secrets ENABLE ROW LEVEL SECURITY/);
  assert.match(isolationMigration, /REVOKE ALL ON TABLE public\.profile_webhook_secrets FROM PUBLIC, anon, authenticated/);
  assert.match(isolationMigration, /SECURITY DEFINER\s+SET search_path = ''/);
  assert.match(isolationMigration, /REVOKE ALL ON FUNCTION public\.update_profile_webhook_configuration[\s\S]*FROM PUBLIC, anon, authenticated/);
  const authenticatedProfileGrantIndex = isolationMigration.indexOf("GRANT SELECT (");
  assert(authenticatedProfileGrantIndex >= 0);
  const authenticatedProfileGrant = isolationMigration.slice(authenticatedProfileGrantIndex);
  assert.doesNotMatch(authenticatedProfileGrant, /\bwebhook_secret\b/);

  assert.match(accountSource, /useState<string \| null>\(null\)/);
  assert.match(accountSource, /setNewWebhookSecret\(data\?\.newWebhookSecret \|\| null\)/);
  assert.match(panelSource, /navigator\.clipboard\.writeText\(newWebhookSecret\)/);
  assert.doesNotMatch(panelSource, /navigator\.clipboard\.writeText\(webhookSecret\)/);
  assert.match(panelSource, /Rotate the signing secret\?/);
  assert.match(panelSource, /shown once/i);
});

test("webhook test delivery is scoped by authenticated user and fails closed on limiter outages", async () => {
  const { checkRateLimit } = loadTsModule("lib/rate-limit.ts");
  const request = new Request("https://dandi.example/api/profile/webhook-test", {
    headers: {
      "x-forwarded-for": "203.0.113.44",
    },
  });

  let receivedKey = null;
  const allowed = await checkRateLimit(request, {
    limit: async (key) => {
      receivedKey = key;
      return { success: true, limit: 5, remaining: 4, reset: 123 };
    },
  }, {}, { key: "user:user-123", failClosed: true });
  assert.equal(allowed, null);
  assert.equal(receivedKey, "user:user-123");

  const blocked = await checkRateLimit(request, {
    limit: async () => {
      throw new Error("Redis unavailable");
    },
  }, {}, { failClosed: true });
  assert.equal(blocked.status, 503);
  assert.equal(blocked.headers.get("Retry-After"), "60");
  assert.deepEqual(await blocked.json(), {
    error: "This operation is temporarily unavailable. Please try again shortly.",
  });

  const routeSource = readFileSync(resolve(repoRoot, "app/api/profile/webhook-test/route.ts"), "utf8");
  assert.match(routeSource, /createIpRateLimit\("@upstash\/ratelimit:webhook-test", 5, "60 s"\)/);
  assert.match(routeSource, /key: `user:\$\{userId\}`/);
  assert.match(routeSource, /failClosed: true/);
  assert.match(routeSource, /origin !== new URL\(request\.url\)\.origin/);
  assert.match(routeSource, /Content-Type must be application\/json/);
  assert.match(routeSource, /body\.confirm !== true/);
  assert.match(routeSource, /if \(rateLimited\) return rateLimited/);

  const accountSource = readFileSync(resolve(repoRoot, "app/account/AccountClient.tsx"), "utf8");
  assert.match(accountSource, /fetch\("\/api\/profile\/webhook-test", \{[\s\S]*Content-Type.*application\/json[\s\S]*confirm: true/);
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
  const baseMigration = readFileSync(resolve(repoRoot, "supabase/migrations/20260622115959_create_github_app_installations.sql"), "utf8");
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
    serviceSource.indexOf("export async function relinkGitHubAppInstallationForUser")
  );
  assert.doesNotMatch(persistFunction, /userAccessToken|access_token/);
});

test("GitHub App reconnect keeps connect and manage flows separate", () => {
  const startSource = readFileSync(resolve(repoRoot, "app/api/integrations/github/start/route.ts"), "utf8");
  const callbackSource = readFileSync(resolve(repoRoot, "app/api/integrations/github/callback/route.ts"), "utf8");
  const accountSource = readFileSync(resolve(repoRoot, "components/account/AccountEnvironmentPanel.tsx"), "utf8");
  const serviceSource = readFileSync(resolve(repoRoot, "lib/services/github-app.service.ts"), "utf8");

  assert.match(startSource, /getGitHubOAuthUrl/);
  assert.match(startSource, /\$\{state\}\.relink/);
  assert.doesNotMatch(startSource, /getGitHubAppManagementUrl/);
  assert.match(callbackSource, /relinkGitHubAppInstallationForUser/);
  assert.match(callbackSource, /getGitHubInstallUrl\(installState\)/);
  assert.match(callbackSource, /setupAction && setupAction !== "install" && setupAction !== "update"/);
  assert.match(callbackSource, /oauthCookieValue = installationId \? `\$\{oauthState\}\.\$\{installationId\}` : `\$\{oauthState\}\.relink`/);
  assert.match(serviceSource, /listGitHubUserAccessibleAppInstallations/);
  assert.match(serviceSource, /listGitHubUserAccessibleInstallationRepositories\(\{\s*userAccessToken: input\.userAccessToken,\s*installationId: installation\.id/s);
  assert.match(serviceSource, /persistGitHubAppInstallation\(\{\s*userId: input\.userId,\s*installationId: installation\.id/s);
  assert.match(accountSource, /href="\/api\/integrations\/github\/start"/);
  assert.match(accountSource, /Manage on GitHub/);
  assert.match(accountSource, /Already installed on GitHub\?/);
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
    { path: ".env.production", size: 1000 },
    { path: "config/secrets.json", size: 1000 },
    { path: "infra/service-account.yaml", size: 1000 },
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
  assert(!paths.includes(".env.production"));
  assert(!paths.includes("config/secrets.json"));
  assert(!paths.includes("infra/service-account.yaml"));
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

test("sensitive API routes do not expose database or rate-limit error details", () => {
  assert.equal(existsSync(resolve(repoRoot, "app/api/usage/alert/route.ts")), false);

  const keyRoutes = [
    "app/api/keys/route.ts",
    "app/api/keys/[id]/route.ts",
    "app/api/keys/bulk-delete/route.ts",
    "app/api/account/environments/route.ts",
    "app/api/account/route.ts",
    "app/api/usage/route.ts",
    "app/api/profile/webhook-test/route.ts",
    "app/api/stripe/subscribe/route.ts",
    "app/api/stripe/subscribe/finalize/route.ts",
  ].map((relativePath) => readFileSync(resolve(repoRoot, relativePath), "utf8"));

  for (const source of keyRoutes) {
    assert.doesNotMatch(source, /NextResponse\.json\(\{ error: error\.message \}/);
    assert.doesNotMatch(source, /NextResponse\.json\(\{ error: \(err as Error\)\.message \}/);
    assert.doesNotMatch(source, /details:\s*(?:error|err)(?:\.message|Msg)/);
  }
});

test("reserves API usage atomically and fails closed when Redis is unavailable", async () => {
  const apiKeyFilename = resolve(repoRoot, "lib/services/api-key.service.ts");
  const redisFilename = resolve(repoRoot, "lib/redis.ts");
  const originalApiKeyModule = moduleCache.get(apiKeyFilename);
  const originalRedisModule = moduleCache.get(redisFilename);
  let evalImplementation = async () => [1, 0, 8, 3];
  const fakeRedis = {
    eval: async (script, keys, args) => evalImplementation(script, keys, args),
  };
  moduleCache.delete(apiKeyFilename);
  moduleCache.set(redisFilename, { exports: { redis: fakeRedis } });
  const { reserveApiKeyUsage, ApiKeyQuotaError } = loadTsModule("lib/services/api-key.service.ts");
  const keyData = {
    id: "key-123",
    name: "Production",
    usage_count: 2,
    monthly_limit: 1000,
    user_id: "user-123",
    key_type: "production",
    plan: "Hobby",
  };

  try {
    let scriptArgs = null;
    evalImplementation = async (script, keys, args) => {
      scriptArgs = { script, keys, args };
      return [1, 0, 8, 3];
    };

    const reservation = await reserveApiKeyUsage(keyData);
    assert.deepEqual(reservation, { userUsage: 8, keyUsage: 3 });
    assert.equal(keyData.usage_count, 3);
    assert.deepEqual(scriptArgs.keys, [
      `usage:user:user-123:${new Date().toISOString().slice(0, 7)}`,
      `usage:key:key-123:${new Date().toISOString().slice(0, 7)}`,
    ]);
    assert.equal(scriptArgs.args[0], "1000");
    assert.equal(scriptArgs.args[1], "1000");

    evalImplementation = async () => [0, 2, 1000, 1000];
    await assert.rejects(
      () => reserveApiKeyUsage({ ...keyData }),
      (error) => error instanceof ApiKeyQuotaError && error.code === "key_limit",
    );

    evalImplementation = async () => {
      throw new Error("Redis unavailable");
    };
    await assert.rejects(
      () => reserveApiKeyUsage({ ...keyData }),
      (error) => error instanceof ApiKeyQuotaError && error.code === "unavailable",
    );

    evalImplementation = async () => [1, 0];
    await assert.rejects(
      () => reserveApiKeyUsage({ ...keyData }),
      (error) => error instanceof ApiKeyQuotaError && error.code === "unavailable",
    );
  } finally {
    if (originalApiKeyModule) moduleCache.set(apiKeyFilename, originalApiKeyModule);
    else moduleCache.delete(apiKeyFilename);
    if (originalRedisModule) moduleCache.set(redisFilename, originalRedisModule);
    else moduleCache.delete(redisFilename);
  }
});

test("preserves unlimited Researcher key limits", () => {
  const { getPlanLimits, PLAN_DETAILS } = loadTsModule("lib/constants.ts");

  assert.equal(PLAN_DETAILS.Researcher.keyLimit, null);
  assert.equal(getPlanLimits("Researcher").keyLimit, null);
  assert.equal(getPlanLimits("Hobby").keyLimit, 3);
});

test("resolves paid plans only when plan, price, and subscription status match the server catalog", () => {
  const { resolvePaidPlanRequest, getEntitledPlanForSubscription, getPlanForPriceId, getPlanForSubscription } = loadTsModule("lib/billing-catalog.ts");

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
  assert.equal(getEntitledPlanForSubscription({ status: "past_due", items: { data: [{ price: { id: "price_researcher_month" } }] } }), null);
  assert.deepEqual(getEntitledPlanForSubscription({ status: "active", items: { data: [{ price: { id: "price_researcher_month" } }] } }), {
    planId: "Researcher",
    interval: "month",
    priceId: "price_researcher_month",
  });
  assert.deepEqual(getPlanForSubscription({ items: { data: [{ price: "price_researcher_month" }] } }), {
    planId: "Researcher",
    interval: "month",
    priceId: "price_researcher_month",
  });
  assert.deepEqual(getEntitledPlanForSubscription({ status: "active", items: { data: [{ price: "price_premium_year" }] } }), {
    planId: "Premium",
    interval: "year",
    priceId: "price_premium_year",
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
  const { BillingRequestValidationError } = loadTsModule("lib/request-validation.ts");

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

  const invalidResponse = mapStripeErrorResponse(
    new BillingRequestValidationError("Invalid payment method ID"),
    "Fallback",
  );
  assert.equal(invalidResponse.status, 400);
  assert.deepEqual(await invalidResponse.json(), { error: "Invalid payment method ID" });

  const maskedResponse = mapStripeErrorResponse(new Error("Stripe exploded"), "Fallback");
  assert.equal(maskedResponse.status, 500);
  assert.deepEqual(await maskedResponse.json(), { error: "Fallback" });

  const stillMaskedResponse = mapStripeErrorResponse(new Error("Stripe exploded"), "Fallback", {
    maskServerError: false,
  });
  assert.equal(stillMaskedResponse.status, 500);
  assert.deepEqual(await stillMaskedResponse.json(), { error: "Fallback" });
});

test("Stripe webhook claims are lease-based and server-role-only", () => {
  const webhookRoute = readFileSync(resolve(repoRoot, "app/api/webhooks/stripe/route.ts"), "utf8");
  const idempotencyMigration = readFileSync(resolve(repoRoot, "supabase/migrations/20260712090000_harden_stripe_webhook_idempotency.sql"), "utf8");
  const subscribeRoute = readFileSync(resolve(repoRoot, "app/api/stripe/subscribe/route.ts"), "utf8");
  const deletePaymentRoute = readFileSync(resolve(repoRoot, "app/api/stripe/delete-payment/route.ts"), "utf8");

  assert.match(webhookRoute, /rpc\("claim_stripe_webhook_event"/);
  assert.match(webhookRoute, /p_lease_until: new Date\(Date\.now\(\) \+ WEBHOOK_PROCESSING_LEASE_MS\)/);
  assert.match(webhookRoute, /lockToken/);
  assert.match(webhookRoute, /eq\("lock_token", lockToken\)/);
  assert.match(webhookRoute, /status: "processed"/);
  assert.match(webhookRoute, /status: "failed"/);
  assert.match(webhookRoute, /stripe\.subscriptions\.list\(\{[\s\S]*status: "all"/);
  assert.match(webhookRoute, /replacementSubscription/);
  assert.match(webhookRoute, /rpc\(\s*"apply_stripe_hobby_downgrade"/);
  assert.match(webhookRoute, /p_has_explicit_key_selection: hasExplicitKeySelection/);
  assert.doesNotMatch(webhookRoute, /\.from\("stripe_webhook_events"\)\s*\.delete/);
  assert.match(idempotencyMigration, /ENABLE ROW LEVEL SECURITY/);
  assert.match(idempotencyMigration, /REVOKE ALL ON TABLE public\.stripe_webhook_events FROM anon, authenticated/);
  assert.match(idempotencyMigration, /SECURITY DEFINER/);
  assert.match(idempotencyMigration, /SET search_path = ''/);
  assert.match(idempotencyMigration, /pg_catalog\.gen_random_uuid\(\)/);
  assert.match(idempotencyMigration, /pg_catalog\.now\(\)/);
  assert.match(idempotencyMigration, /ADD COLUMN IF NOT EXISTS lock_token uuid/);
  assert.match(idempotencyMigration, /RETURNS TABLE\(claimed boolean, processed boolean, lock_token uuid\)/);
  assert.match(idempotencyMigration, /REVOKE ALL ON FUNCTION public\.claim_stripe_webhook_event[\s\S]*FROM PUBLIC, anon, authenticated/);
  assert.match(idempotencyMigration, /GRANT EXECUTE ON FUNCTION public\.claim_stripe_webhook_event[\s\S]*TO service_role/);
  assert.match(subscribeRoute, /getEntitledPlanForSubscription\(subscription\)/);
  assert.match(subscribeRoute, /const result: SubscriptionActionResult/);
  assert.doesNotMatch(deletePaymentRoute, /maskServerError:\s*false/);
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
  assert.deepEqual(
    resolveSubscriptionPaymentState({
      ...subscription,
      latest_invoice: { payment_intent: { status: "requires_action", client_secret: null } },
    }),
    { type: "requires_payment_method", error: "Payment authentication could not start. Please try again." },
  );
  assert.deepEqual(
    resolveSubscriptionPaymentState({ ...subscription, latest_invoice: null }),
    { type: "ready" },
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
  assert.equal(Object.hasOwn(webhookPayload, "plan"), false);
  assert.equal(Object.hasOwn(webhookPayload, "billing_interval"), false);
  assert.equal(webhookPayload.stripe_customer_id, "cus_123");
  assert.equal(webhookPayload.stripe_scheduled_plan, null);
  assert.equal(webhookPayload.stripe_scheduled_plan_date, null);

  const entitledWebhookPayload = buildWebhookSubscriptionUpdatePayload({
    customerId: "cus_123",
    subscriptionId: "sub_123",
    subscription,
    verifiedPlan: { planId: "Premium", interval: "year", priceId: "price_premium_year" },
    now: new Date("2026-06-03T10:00:00.000Z"),
  });
  assert.equal(entitledWebhookPayload.plan, "Premium");
  assert.equal(entitledWebhookPayload.billing_interval, "year");

  const keptKeyIds = [
    "00000000-0000-4000-8000-000000000001",
    "00000000-0000-4000-8000-000000000002",
  ];
  assert.deepEqual(parseKeysToKeep(JSON.stringify(keptKeyIds)), keptKeyIds);
  assert.deepEqual(parseKeysToKeep('["key-1","key-2"]'), []);
  assert.deepEqual(parseKeysToKeep('["00000000-0000-4000-8000-000000000001),id.not.is.null"]'), []);
  assert.deepEqual(parseKeysToKeep('{"bad":true}'), []);
  assert.deepEqual(buildSubscriptionDeletedProfilePayload(new Date("2026-06-03T10:00:00.000Z")), {
    plan: "Hobby",
    stripe_subscription_id: null,
    billing_interval: null,
    billing_next_date: null,
    stripe_scheduled_plan: null,
    stripe_scheduled_plan_date: null,
    updated_at: "2026-06-03T10:00:00.000Z",
  });
  assert.equal(isDuplicateWebhookEventError({ code: "23505" }), true);
  assert.equal(isDuplicateWebhookEventError({ code: "42P01" }), false);

  const billingTypes = readFileSync(resolve(repoRoot, "types/billing.ts"), "utf8");
  const subscribeRoute = readFileSync(resolve(repoRoot, "app/api/stripe/subscribe/route.ts"), "utf8");
  const finalizeRoute = readFileSync(resolve(repoRoot, "app/api/stripe/subscribe/finalize/route.ts"), "utf8");
  for (const status of ["requires_action", "requires_payment_method", "processing", "active", "scheduled"]) {
    assert.match(billingTypes, new RegExp(`status: "${status}"`));
  }
  assert.match(subscribeRoute, /status: "requires_action"[\s\S]*clientSecret: paymentState\.clientSecret[\s\S]*subscriptionId: paymentState\.subscriptionId/);
  assert.match(subscribeRoute, /status: "processing"[\s\S]*subscriptionId: subscription\.id/);
  assert.match(finalizeRoute, /subscriptionCustomerId !== profile\.stripe_customer_id/);
  assert.match(finalizeRoute, /subscription\.metadata\?\.operationId && subscription\.metadata\.operationId !== operationId/);
  assert.match(finalizeRoute, /status: "processing", subscriptionId/);
  assert.match(subscribeRoute, /supersedePendingCancellation/);
  assert.match(subscribeRoute, /buildPlanChangeScheduleUpdate/);
  assert.doesNotMatch(subscribeRoute, /prepareActiveSubscriptionForScheduledPlanChange/);
});

test("builds subscription schedule phases from the attached schedule current phase", () => {
  const { buildPlanChangeScheduleUpdate } = loadTsModule("lib/services/stripe-billing-flow.service.ts");

  const phaseStart = Math.floor(new Date("2026-06-01T00:00:00.000Z").getTime() / 1000);
  const phaseEnd = Math.floor(new Date("2026-06-29T00:00:00.000Z").getTime() / 1000);
  const subscriptionPeriodEnd = Math.floor(new Date("2026-07-15T00:00:00.000Z").getTime() / 1000);
  const currentPrice = "price_researcher_month";
  const targetPrice = "price_premium_month";

  const schedule = {
    phases: [
      {
        start_date: phaseStart,
        end_date: phaseEnd,
        items: [{ price: currentPrice, quantity: 1 }],
      },
    ],
  };

  const update = buildPlanChangeScheduleUpdate(schedule, targetPrice);
  assert.equal(update.phases[0].start_date, phaseStart);
  assert.equal(update.phases[0].end_date, phaseEnd);
  assert.deepEqual(update.phases[0].items, [{ price: currentPrice, quantity: 1 }]);
  assert.equal(update.phases[1].start_date, phaseEnd);
  assert.deepEqual(update.phases[1].items, [{ price: targetPrice }]);
  assert.equal(update.end_behavior, "release");
  assert.equal(update.proration_behavior, "none");
  assert.equal(update.effectiveAt, new Date(phaseEnd * 1000).toISOString());

  const scheduleWithoutEndDate = {
    phases: [
      {
        start_date: phaseStart,
        items: [{ price: currentPrice, quantity: 2 }],
      },
    ],
  };
  const subscription = {
    items: {
      data: [{ current_period_end: subscriptionPeriodEnd }],
    },
  };

  const fallbackUpdate = buildPlanChangeScheduleUpdate(
    scheduleWithoutEndDate,
    targetPrice,
    subscription,
  );
  assert.equal(fallbackUpdate.phases[0].end_date, subscriptionPeriodEnd);
  assert.equal(fallbackUpdate.phases[1].start_date, subscriptionPeriodEnd);
  assert.deepEqual(fallbackUpdate.phases[0].items, [{ price: currentPrice, quantity: 2 }]);
});

test("reconciles scheduled plan state from Stripe subscription schedules", () => {
  const {
    buildProfileBillingReconciliationPayload,
    resolveEffectiveBillingState,
    resolveScheduledPlanFromSchedule,
    buildWebhookSubscriptionUpdatePayload,
  } = loadTsModule("lib/services/stripe-billing-flow.service.ts");
  const { isActiveScheduledPlanChange } = loadTsModule("lib/billing-schedule.ts");

  const researcherYear = "price_researcher_year";
  const premiumYear = "price_premium_year";
  const phaseOneEnd = Math.floor(new Date("2026-06-29T00:00:00.000Z").getTime() / 1000);
  const beforeEffectiveDate = new Date("2026-06-15T00:00:00.000Z");
  const afterEffectiveDate = new Date("2026-07-13T00:00:00.000Z");

  const futureSchedule = {
    status: "active",
    phases: [
      {
        start_date: phaseOneEnd - 86400 * 30,
        end_date: phaseOneEnd,
        items: [{ price: researcherYear }],
      },
      {
        start_date: phaseOneEnd,
        items: [{ price: premiumYear }],
      },
    ],
  };

  assert.deepEqual(resolveScheduledPlanFromSchedule(futureSchedule, beforeEffectiveDate), {
    scheduledPlan: "Premium",
    scheduledPlanDate: new Date(phaseOneEnd * 1000).toISOString(),
  });
  assert.deepEqual(resolveScheduledPlanFromSchedule(futureSchedule, afterEffectiveDate), {
    scheduledPlan: null,
    scheduledPlanDate: null,
  });

  const transitionedSubscription = {
    id: "sub_123",
    status: "active",
    items: {
      data: [{
        price: { id: premiumYear, recurring: { interval: "year" } },
        current_period_end: phaseOneEnd + 86400 * 365,
      }],
    },
  };

  const staleProfile = {
    plan: "Researcher",
    billing_interval: "year",
    stripe_subscription_id: "sub_123",
    stripe_scheduled_plan: "Premium",
    stripe_scheduled_plan_date: new Date(phaseOneEnd * 1000).toISOString(),
  };

  const reconciliationPayload = buildProfileBillingReconciliationPayload({
    profile: staleProfile,
    subscription: transitionedSubscription,
    schedule: null,
    verifiedPlan: { planId: "Premium", interval: "year", priceId: premiumYear },
    now: afterEffectiveDate,
  });

  assert.equal(reconciliationPayload?.plan, "Premium");
  assert.equal(reconciliationPayload?.stripe_scheduled_plan, null);
  assert.equal(reconciliationPayload?.stripe_scheduled_plan_date, null);

  const webhookPayload = buildWebhookSubscriptionUpdatePayload({
    customerId: "cus_123",
    subscriptionId: "sub_123",
    subscription: { ...transitionedSubscription, schedule: "sub_sched_123" },
    verifiedPlan: { planId: "Premium", interval: "year", priceId: premiumYear },
    scheduledPlan: null,
    scheduledPlanDate: null,
    now: afterEffectiveDate,
  });
  assert.equal(webhookPayload.plan, "Premium");
  assert.equal(webhookPayload.stripe_scheduled_plan, null);
  assert.equal(webhookPayload.stripe_scheduled_plan_date, null);

  const overdueProfile = {
    plan: "Researcher",
    billing_interval: "year",
    stripe_subscription_id: "sub_123",
    stripe_scheduled_plan: "Premium",
    stripe_scheduled_plan_date: new Date(phaseOneEnd * 1000).toISOString(),
  };
  const overdueState = resolveEffectiveBillingState({
    profile: overdueProfile,
    subscription: {
      id: "sub_123",
      items: { data: [{ price: { id: researcherYear, recurring: { interval: "year" } } }] },
    },
    schedule: futureSchedule,
    verifiedPlan: { planId: "Researcher", interval: "year", priceId: researcherYear },
    now: afterEffectiveDate,
  });
  assert.equal(overdueState.overdueScheduledPlan?.planId, "Premium");
  assert.equal(overdueState.scheduledPlan, null);
  assert.equal(overdueState.scheduledPlanDate, null);

  const overduePayload = buildProfileBillingReconciliationPayload({
    profile: overdueProfile,
    subscription: {
      id: "sub_123",
      status: "active",
      items: {
        data: [{
          price: { id: researcherYear, recurring: { interval: "year" } },
          current_period_end: phaseOneEnd + 86400 * 365,
        }],
      },
    },
    schedule: futureSchedule,
    verifiedPlan: { planId: "Researcher", interval: "year", priceId: researcherYear },
    now: afterEffectiveDate,
  });
  assert.equal(overduePayload?.stripe_scheduled_plan, null);
  assert.equal(overduePayload?.stripe_scheduled_plan_date, null);

  assert.equal(isActiveScheduledPlanChange("Premium", new Date(phaseOneEnd * 1000).toISOString(), "Researcher", beforeEffectiveDate), true);
  assert.equal(isActiveScheduledPlanChange("Premium", new Date(phaseOneEnd * 1000).toISOString(), "Researcher", afterEffectiveDate), false);
});

test("builds structured account access from browser, active and inactive keys, and request telemetry", () => {
  const { buildAccountAccess } = loadTsModule("lib/account-environments.ts");

  const accountAccess = buildAccountAccess({
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
      {
        keyId: "key-active",
        repoUrl: "https://github.com/vercel/next.js",
        usedAt: "2026-06-02T11:30:00.000Z",
        ip: "198.51.100.8",
        userAgent: "node-fetch",
        city: "London",
        country: "GB",
        status: "success",
      },
    ],
  });

  assert.equal(accountAccess.currentBrowser.id, "browser-current");
  assert.equal(accountAccess.currentBrowser.current, true);
  assert.equal(accountAccess.currentBrowser.revocable, false);
  assert.equal(accountAccess.currentBrowser.location, "Dublin, IE");

  assert.equal(accountAccess.apiKeys.length, 2);
  assert.equal(accountAccess.apiKeys[0]?.id, "api-key-key-active");
  assert.equal(accountAccess.apiKeys[0]?.label, "Production Key");
  assert.equal(accountAccess.apiKeys[0]?.keyType, "production");
  assert.equal(accountAccess.apiKeys[0]?.revocable, true);
  assert.equal(accountAccess.apiKeys[0]?.apiKeyId, "key-active");
  assert.equal(accountAccess.apiKeys[0]?.requestsThisMonth, 2);
  assert.equal(accountAccess.apiKeys[0]?.lastUsedAt, "2026-06-02T11:30:00.000Z");
  assert.equal(accountAccess.apiKeys[0]?.lastUsedClient, "Node.js client");
  assert.equal(accountAccess.apiKeys[0]?.lastUsedIp, "198.51.100.8");
  assert.equal(accountAccess.apiKeys[0]?.lastUsedLocation, "London, GB");
  assert.equal(accountAccess.apiKeys[0]?.latestRepoUrl, "https://github.com/vercel/next.js");
  assert.equal(accountAccess.apiKeys[0]?.latestStatus, "success");
  assert.equal(accountAccess.apiKeys[0]?.isActive, true);
  assert.equal(accountAccess.apiKeys[1]?.label, "Disabled Key");
  assert.equal(accountAccess.apiKeys[1]?.isActive, false);
  assert.equal(accountAccess.apiKeys[1]?.revocable, false);
  assert.equal(accountAccess.apiKeys[1]?.deletable, true);

  assert.equal(accountAccess.recentRequests.length, 2);
  assert.equal(accountAccess.recentRequests[0]?.label, "Node.js client");
  assert.equal(accountAccess.recentRequests[0]?.ip, "198.51.100.8");
  assert.equal(accountAccess.recentRequests[0]?.revocable, false);
  assert.equal(accountAccess.recentRequests[0]?.apiKeyId, "key-active");
  assert.equal(accountAccess.recentRequests[0]?.repoUrl, "https://github.com/vercel/next.js");
  assert.equal(accountAccess.recentRequests[0]?.status, "success");
  assert.equal(accountAccess.recentRequests[0]?.usedAt, "2026-06-02T11:30:00.000Z");
  assert.equal(accountAccess.recentRequests[0]?.client, "Node.js client");
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

      return jsonResponse({ embedding: { values: embeddingVector(0.3, 0.4) } });
    };

    assert.deepEqual(await googleEmbed("query", { models: ["gemini-embedding-001", "gemini-embedding-002"] }), embeddingVector(0.3, 0.4));
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

      return jsonResponse({ embedding: { values: embeddingVector(0.1, 0.2) } });
    };

    assert.deepEqual(await googleEmbed("query"), embeddingVector(0.1, 0.2));
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

      return jsonResponse({ embedding: { values: embeddingVector(0.5, 0.6) } });
    };

    assert.deepEqual(await googleEmbed("query", { models: ["gemini-embedding-001", "models/gemini-embedding-001"] }), embeddingVector(0.5, 0.6));
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
    process.env.RAG_EMBED_RETRY_BASE_MS = "1";
    process.env.RAG_EMBED_RETRY_MAX_MS = "1";
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
      return jsonResponse({ embeddings: [{ values: embeddingVector(1, 2) }, { values: embeddingVector(3, 4) }] });
    };

    assert.deepEqual(await googleBatchEmbed(["first", "second"]), [embeddingVector(1, 2), embeddingVector(3, 4)]);
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
      return jsonResponse({ embedding: { values: embeddingVector(0.7, 0.8) } });
    };

    assert.deepEqual(await googleEmbed("query"), embeddingVector(0.7, 0.8));
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
    process.env.RAG_EMBED_RETRY_BASE_MS = "1";
    process.env.RAG_EMBED_RETRY_MAX_MS = "1";
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
        embeddings: body.requests.map((_, index) => ({ values: embeddingVector(index, index + 1) })),
      });
    };

    const result = await googleBatchEmbedWithModel(Array.from({ length: 21 }, (_, index) => `chunk ${index}`));
    assert.equal(result.embeddings.length, 21);
    assert.deepEqual(calls, [
      { model: "primary-model", count: 20 },
      { model: "primary-model", count: 1 },
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
    count: 2,
    success: 1,
    error: 1,
    avgLatency: 100,
  });
  assert.deepEqual(["2026-06-01", "2026-06-02"].map((date) => summarizeDailyLogs(date, logs)), [
    { date: "2026-06-01", count: 2, success: 1, error: 1, avgLatency: 100 },
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

test("calculates one UTC calendar-month quota reset independently of Stripe billing dates", () => {
  const { calculateResetDate } = loadTsModule("lib/services/server-data.service.ts");
  const { getUsagePeriod } = loadTsModule("lib/utils/usage-period.ts");

  const now = new Date("2026-06-05T12:00:00.000Z");
  const expectedReset = "2026-07-01T00:00:00.000Z";

  for (const nextInvoiceDate of [
    null,
    "2026-06-24T00:00:00.000Z",
    "2026-05-24T00:00:00.000Z",
    "2027-06-24T00:00:00.000Z",
  ]) {
    assert.equal(calculateResetDate(nextInvoiceDate, now), expectedReset);
  }

  assert.deepEqual(getUsagePeriod(now), {
    key: "2026-06",
    startsAt: "2026-06-01T00:00:00.000Z",
    resetsAt: expectedReset,
  });
  assert.equal(
    calculateResetDate("2035-09-17T00:00:00.000Z", new Date("2026-12-31T23:59:59.999Z")),
    "2027-01-01T00:00:00.000Z",
  );
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

test("request-created data ownership never uses the shared demo metering identity", () => {
  const { getApiKeyDataOwnerId } = loadTsModule("lib/services/api-key.service.ts");

  assert.equal(
    getApiKeyDataOwnerId({ user_id: "demo-user-id", browserUserId: "browser-user-a" }),
    "browser-user-a"
  );
  assert.equal(getApiKeyDataOwnerId({ user_id: "api-key-owner" }), "api-key-owner");
  assert.throws(
    () => getApiKeyDataOwnerId({ user_id: "demo-user-id" }),
    /Authenticated data owner is required/
  );

  const jobsRoute = readFileSync(resolve(repoRoot, "app/api/rag/jobs/route.ts"), "utf8");
  const chatRoute = readFileSync(resolve(repoRoot, "app/api/rag/chat/route.ts"), "utf8");
  const ingestionService = readFileSync(resolve(repoRoot, "lib/services/ingestion-job.service.ts"), "utf8");

  assert.match(jobsRoute, /getApiKeyDataOwnerId\(keyData\)/);
  assert.match(chatRoute, /const dataOwnerId = getApiKeyDataOwnerId\(keyData\)/);
  assert.match(chatRoute, /p_user_id: dataOwnerId/);
  assert.match(ingestionService, /user_id: ownerId/);
  assert.match(ingestionService, /credential_type === "demo"/);
  assert.match(ingestionService, /if \(!job\.api_key_id\) return null/);
  assert.match(ingestionService, /getApiKeyDataOwnerId\(input\.keyData\)/);
  assert.match(ingestionService, /job\.credential_type === "demo"/);
  assert.doesNotMatch(ingestionService, /activeJobQuery\(input\.keyData\.user_id/);
  assert.match(
    readFileSync(resolve(repoRoot, "app/api/rag/ingest/route.ts"), "utf8"),
    /durable worker is advanced by the authenticated polling route/
  );
});

test("ingestion jobs carry a durable credential discriminator with an additive legacy-demo backfill", () => {
  const ingestionService = readFileSync(resolve(repoRoot, "lib/services/ingestion-job.service.ts"), "utf8");
  const migration = readFileSync(resolve(repoRoot, "supabase/migrations/20260712100000_add_credential_discriminator.sql"), "utf8");

  assert.match(ingestionService, /credential_type: input\.keyData\.id === "demo-id" \? "demo" : "api_key"/);
  assert.match(ingestionService, /job\.credential_type === "demo"/);
  assert.match(ingestionService, /credential_type: job\.credential_type/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS credential_type text NOT NULL DEFAULT 'api_key'/);
  assert.match(migration, /UPDATE public\.ingestion_jobs[\s\S]*WHERE user_id = 'demo-user-id'[\s\S]*AND api_key_id IS NULL/);
  assert.match(migration, /UPDATE public\.repository_chunks[\s\S]*WHERE user_id = 'demo-user-id'[\s\S]*AND api_key_id IS NULL/);
  assert.match(migration, /CHECK \(credential_type IN \('api_key', 'demo'\)\)/);
  assert.doesNotMatch(migration, /DELETE FROM public\.(repository_chunks|ingestion_jobs)/);
});

test("repository summary resolution stays public-only and gates server-token fallback on visibility", async () => {
  const {
    fetchRepositoryDataWithAuth,
    GitHubAuthError,
  } = loadTsModule("lib/services/github.service.ts");
  const serverEnv = loadTsModule("lib/env.ts").getServerEnv();
  const originalFetch = globalThis.fetch;
  const originalToken = serverEnv.GITHUB_TOKEN;
  const calls = [];

  try {
    serverEnv.GITHUB_TOKEN = "server-public-fallback-token";
    globalThis.fetch = async (url, options) => {
      const requestUrl = String(url);
      const authorization = options?.headers?.Authorization;
      calls.push({ url: requestUrl, authorization });

      if (requestUrl === "https://api.github.com/repos/owner/repo") {
        if (!authorization) return jsonResponse({ message: "rate limited" }, { status: 403 });
        return jsonResponse({
          private: false,
          stargazers_count: 42,
          license: { spdx_id: "MIT" },
          forks_count: 7,
          description: "Verified public repository",
        });
      }
      if (requestUrl.endsWith("/readme")) {
        return jsonResponse({ message: "rate limited" }, { status: 403 });
      }
      if (requestUrl.startsWith("https://raw.githubusercontent.com/owner/repo/")) {
        return new Response("# Public README", { status: 200 });
      }
      return jsonResponse({ message: "not found" }, { status: 404 });
    };

    const repository = await fetchRepositoryDataWithAuth({
      githubUrl: "https://github.com/owner/repo",
      userId: "user-123",
      includeVersionMetadata: false,
    });
    assert.equal(repository.readmeContent, "# Public README");
    assert.equal(repository.metadata.stars, 42);

    const visibilityProofIndex = calls.findIndex((call) =>
      call.url === "https://api.github.com/repos/owner/repo"
      && call.authorization === "Bearer server-public-fallback-token"
    );
    const authorizedContentIndex = calls.findIndex((call) =>
      call.url.endsWith("/readme")
      && call.authorization === "Bearer server-public-fallback-token"
    );
    assert(visibilityProofIndex >= 0);
    assert.equal(authorizedContentIndex, -1);

    calls.length = 0;
    globalThis.fetch = async (url, options) => {
      const requestUrl = String(url);
      const authorization = options?.headers?.Authorization;
      calls.push({ url: requestUrl, authorization });
      if (requestUrl === "https://api.github.com/repos/owner/private-repo") {
        return authorization
          ? jsonResponse({ private: true })
          : jsonResponse({ message: "rate limited" }, { status: 403 });
      }
      return jsonResponse({ message: "not found" }, { status: 404 });
    };

    await assert.rejects(
      () => fetchRepositoryDataWithAuth({
        githubUrl: "https://github.com/owner/private-repo",
        userId: "user-with-installation-snapshot",
        includeVersionMetadata: false,
      }),
      (error) => error instanceof GitHubAuthError && error.code === "GITHUB_PRIVATE_REPO_UNSUPPORTED",
    );
    assert.equal(
      calls.some((call) => call.url.endsWith("/readme") && Boolean(call.authorization)),
      false,
      "the server token must never fetch private repository content",
    );
    assert.equal(calls.some((call) => call.url.includes("/access_tokens")), false);
  } finally {
    globalThis.fetch = originalFetch;
    serverEnv.GITHUB_TOKEN = originalToken;
  }
});

test("RAG repository identity always follows the canonical GitHub URL", () => {
  const { buildRagRepositoryMetadataContext } = loadTsModule("lib/services/github.service.ts");
  const context = buildRagRepositoryMetadataContext("https://github.com/facebook/react", {
    owner: { login: "react" },
    full_name: "react/react",
    html_url: "https://github.com/react/react",
    description: "React",
  });

  assert.deepEqual(context, {
    owner: "facebook",
    repo: "react",
    fullName: "facebook/react",
    description: "React",
    htmlUrl: "https://github.com/facebook/react",
  });
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
    process.env.GITHUB_TOKEN = "server-wide-secret-token";

    const readmeNoToken = await fetchGitHubReadme("https://github.com/owner/repo");
    const metaNoToken = await fetchGitHubMetadata("https://github.com/owner/repo");

    assert.equal(readmeNoToken, "# Private Repo Readme");
    assert.equal(metaNoToken.stars, 42);
    assert.equal(calls[0].authHeader, null);
    assert.equal(calls[1].authHeader, null);

    calls.length = 0;
    const readmeWithToken = await fetchGitHubReadme("https://github.com/owner/repo", "my-installation-token");
    const metaWithToken = await fetchGitHubMetadata("https://github.com/owner/repo", "my-installation-token");

    assert.equal(readmeWithToken, "# Private Repo Readme");
    assert.equal(metaWithToken.stars, 42);
    assert.equal(calls[0].authHeader, "Bearer my-installation-token");
    assert.equal(calls[1].authHeader, "Bearer my-installation-token");

    if (originalToken === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = originalToken;
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Prepare and Ask prove public repository access before fetching content", async () => {
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.GITHUB_TOKEN;
  const calls = [];
  const {
    assertPublicRepositoryForRag,
    GitHubPublicRepositoryCheckError,
    GitHubPublicRepositoryRequiredError,
  } = loadTsModule("lib/services/github.service.ts");

  try {
    process.env.GITHUB_TOKEN = "server-wide-secret-token";
    globalThis.fetch = async (url, options) => {
      calls.push({ url: String(url), authorization: options?.headers?.Authorization });
      return jsonResponse({ private: false });
    };

    await assertPublicRepositoryForRag("https://github.com/openai/codex");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].authorization, undefined);

    calls.length = 0;
    globalThis.fetch = async (url, options) => {
      calls.push({ url: String(url), authorization: options?.headers?.Authorization });
      if (!options?.headers?.Authorization) {
        return jsonResponse({ message: "rate limited" }, { status: 403 });
      }
      return jsonResponse({ private: false });
    };
    await assertPublicRepositoryForRag("https://github.com/openai/codex", "visibility-probe-token");
    assert.deepEqual(calls.map((call) => call.authorization), [undefined, "Bearer visibility-probe-token"]);

    globalThis.fetch = async () => jsonResponse({ private: true });
    await assert.rejects(
      () => assertPublicRepositoryForRag("https://github.com/private/repository"),
      (error) => error instanceof GitHubPublicRepositoryRequiredError
    );

    globalThis.fetch = async () => jsonResponse({ message: "Not Found" }, { status: 404 });
    await assert.rejects(
      () => assertPublicRepositoryForRag("https://github.com/missing/repository"),
      /public repositories only/i
    );

    globalThis.fetch = async () => jsonResponse({ message: "rate limited" }, { status: 403 });
    await assert.rejects(
      () => assertPublicRepositoryForRag("https://github.com/openai/codex"),
      (error) => error instanceof GitHubPublicRepositoryCheckError
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = originalToken;
  }
});

test("AI and repository routes retain grounded, opaque security boundaries", () => {
  const chatSource = readFileSync(resolve(repoRoot, "app/api/rag/chat/route.ts"), "utf8");
  const ingestSource = readFileSync(resolve(repoRoot, "app/api/rag/ingest/route.ts"), "utf8");
  const ingestionSource = readFileSync(resolve(repoRoot, "lib/services/ingestion-job.service.ts"), "utf8");
  const aiSource = readFileSync(resolve(repoRoot, "lib/services/ai.service.ts"), "utf8");
  const summarySource = readFileSync(resolve(repoRoot, "app/api/github-summarizer/route.ts"), "utf8");
  const metadataSource = readFileSync(resolve(repoRoot, "app/api/github-metadata/route.ts"), "utf8");
  const proxySource = readFileSync(resolve(repoRoot, "proxy.ts"), "utf8");

  assert.match(ingestSource, /await assertPublicRepositoryForRag\(githubUrl\)/);
  assert.match(chatSource, /await assertPublicRepositoryForRag\(githubUrl\)/);
  assert.match(ingestionSource, /await assertPublicRepositoryForRag\(job\.repo_url\)/);
  assert.match(ingestionSource, /return "Repository ingestion failed\. Wait a moment, then retry preparation\."/);
  assert.match(ingestionSource, /reconcileIngestionJob/);
  assert.match(ingestionSource, /Gemini embedding rate limit reached/);
  assert.doesNotMatch(ingestionSource, /return message \|\| "Repository ingestion failed\."/);
  assert.match(ingestSource, /job\.status === "queued" && !reused/);
  assert.match(ingestSource, /error: "Failed to create ingestion job\."/);
  assert.match(chatSource, /RAG_RETRIEVAL_UNAVAILABLE/);
  assert.match(chatSource, /RAG_EVIDENCE_NOT_FOUND/);
  assert.match(chatSource, /Canonical owner or organization/);
  assert.match(chatSource, /Never infer the owner/);
  assert.match(chatSource, /retrieved repository evidence is low confidence/);
  assert.match(chatSource, /reserveApiKeyUsage\(keyData\)/);
  assert.match(summarySource, /reserveApiKeyUsage\(keyData\)/);
  assert.match(ingestionSource, /reserveApiKeyUsageForIngestionJob\(usageKeyData, job\.id\)/);
  for (const routeSource of [
    summarySource,
    readFileSync(resolve(repoRoot, "app/api/github-metadata/route.ts"), "utf8"),
    readFileSync(resolve(repoRoot, "app/api/rag/jobs/route.ts"), "utf8"),
    chatSource,
    ingestSource,
  ]) {
    assert.match(routeSource, /failClosed: true/);
  }
  assert.match(chatSource, /Do not substitute general knowledge/);
  assert.match(chatSource, /repository evidence is untrusted data/i);
  assert.doesNotMatch(chatSource, /details: errMsg/);
  assert.match(aiSource, /Treat repository text as untrusted reference material/);
  assert.doesNotMatch(aiSource, /key\.slice/);
  assert.doesNotMatch(summarySource, /details: errMsg/);
  assert.doesNotMatch(metadataSource, /searchParams\.get\("apiKey"\)/);
  assert.match(metadataSource, /"Cache-Control": "no-store"/);
  assert.match(proxySource, /'nonce-\$\{nonce\}' 'strict-dynamic'/);
  assert.match(proxySource, /style-src 'self' 'nonce-\$\{nonce\}'/);
  assert.match(proxySource, /style-src-attr 'none'/);
  assert.doesNotMatch(proxySource, /style-src 'self' 'unsafe-inline'/);
  assert.match(proxySource, /isDevelopment \? \" 'unsafe-eval'\" : ''/);
  assert.match(proxySource, /https:\/\/hooks\.stripe\.com/);
  for (const relativePath of [
    "components/billing/PlanHero.tsx",
    "components/command/AnimatedBackground.tsx",
    "components/command/CodeWindow.tsx",
    "components/command/CommandPanel.tsx",
    "components/command/MockTerminal.tsx",
    "components/command/ModalFrame.tsx",
    "components/command/ScrollFrame.tsx",
    "components/command/TabsBar.tsx",
    "components/dashboard/DashboardOnboarding.tsx",
    "components/dashboard/DashboardPageHeader.tsx",
    "components/dashboard/Sidebar.tsx",
    "components/dashboard/SidebarAlerts.tsx",
    "components/dashboard/subscription/KeyDowngradeSelector.tsx",
    "components/playground/ApiKeyDropdown.tsx",
    "components/playground/NetworkLog.tsx",
    "components/playground/RepositoryRequestBuilder.tsx",
    "components/ui/SkeletonBlocks.tsx",
    "components/usage/UsageIntelligenceDashboard.tsx",
    "components/usage/UsageSparkline.tsx",
  ]) {
    const source = readFileSync(resolve(repoRoot, relativePath), "utf8");
    assert.doesNotMatch(source, /\bstyle\s*=/, `${relativePath} must not emit inline style attributes`);
    assert.doesNotMatch(source, /\.style\./, `${relativePath} must not mutate inline styles`);
  }
  assert.doesNotMatch(readFileSync(resolve(repoRoot, "components/ui/Toast.tsx"), "utf8"), /dangerouslySetInnerHTML/);
  assert.doesNotMatch(readFileSync(resolve(repoRoot, "components/playground/NetworkLog.tsx"), "utf8"), /dangerouslySetInnerHTML/);
  assert.match(readFileSync(resolve(repoRoot, "app/globals.css"), "utf8"), /@keyframes toast-slide-in/);
  assert.match(readFileSync(resolve(repoRoot, "app/globals.css"), "utf8"), /@keyframes pulse-flow/);
  assert.equal(existsSync(resolve(repoRoot, "app/api/log/route.ts")), false);
  assert.doesNotMatch(
    readFileSync(resolve(repoRoot, "components/dashboard/SidebarAlerts.tsx"), "utf8"),
    /clientLog|\/api\/log/
  );
});

test("GitHub summary metadata can skip release and tag lookup on the hot path", async () => {
  const originalFetch = globalThis.fetch;
  const { fetchRepositoryDataWithAuth } = loadTsModule("lib/services/github.service.ts");
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
          text: async () => "# Summary Repo Readme",
        };
      }

      if (String(url).endsWith("/releases/latest") || String(url).endsWith("/tags")) {
        throw new Error("Version lookup should not run on the summary hot path");
      }

      return {
        ok: true,
        json: async () => ({
          stargazers_count: 42,
          license: { spdx_id: "MIT" },
          forks_count: 5,
          description: "A summary repo",
          default_branch: "main",
        }),
      };
    };

    const repoData = await fetchRepositoryDataWithAuth({
      githubUrl: "https://github.com/owner/repo",
      userId: "user-123",
      includeVersionMetadata: false,
    });

    assert.equal(repoData.readmeContent, "# Summary Repo Readme");
    assert.equal(repoData.metadata.stars, 42);
    assert.equal(repoData.metadata.forks, 5);
    assert.equal(repoData.metadata.license, "MIT");
    assert.equal(repoData.metadata.description, "A summary repo");
    assert.equal(repoData.metadata.version, "Unknown");
    assert.equal(calls.some((call) => call.url.endsWith("/releases/latest") || call.url.endsWith("/tags")), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("GitHub public quota fallback uses a server token for visibility only", () => {
  const githubSource = readFileSync(resolve(repoRoot, "lib/services/github.service.ts"), "utf8");
  const ingestionSource = readFileSync(resolve(repoRoot, "lib/services/ingestion-job.service.ts"), "utf8");

  assert.match(githubSource, /publicFallbackToken = getServerEnv\(\)\.GITHUB_TOKEN/);
  const summaryVisibilityProof = githubSource.indexOf(
    "await assertPublicRepositoryForRag(input.githubUrl, publicFallbackToken)",
  );
  const summaryAnonymousRead = githubSource.indexOf(
    "fetchGitHubReadme(input.githubUrl)",
    summaryVisibilityProof,
  );
  assert(summaryVisibilityProof >= 0);
  assert(summaryAnonymousRead > summaryVisibilityProof);
  assert.doesNotMatch(githubSource, /fetchGitHubReadme\(input\.githubUrl, publicFallbackToken\)/);
  assert.doesNotMatch(githubSource, /fetchGitHubMetadata\(input\.githubUrl, publicFallbackToken/);
  assert.match(githubSource, /GitHubPublicRepositoryRequiredError[\s\S]*GITHUB_PRIVATE_REPO_UNSUPPORTED/);
  assert.doesNotMatch(githubSource, /resolveGitHubRepoAccessForSummary|github-app\.service/);

  const ingestionVisibilityProof = ingestionSource.indexOf(
    "await assertPublicRepositoryForRag(job.repo_url)",
  );
  const ingestionTreeRead = ingestionSource.indexOf(
    "fetchGitHubRepoTreeSnapshot(job.repo_url, branch)",
  );
  const ingestionContentRead = ingestionSource.indexOf(
    "fetchRawFileContent(job.repo_url, branch, file.path)",
  );
  assert(ingestionVisibilityProof >= 0);
  assert(ingestionTreeRead > ingestionVisibilityProof);
  assert(ingestionContentRead > ingestionTreeRead);
  assert.doesNotMatch(ingestionSource, /GITHUB_TOKEN|publicFetchToken/);
});

test("GitHub App reconnect after local disconnect verifies and recreates the local record", async () => {
  const { supabaseAdmin } = loadTsModule("lib/supabase-admin.ts");
  const githubAppService = loadTsModule("lib/services/github-app.service.ts");
  const { relinkGitHubAppInstallationForUser } = githubAppService;

  const originalFrom = supabaseAdmin.from;
  const originalFetch = globalThis.fetch;
  const originalCreateSign = crypto.createSign;
  const calls = [];
  let persistedRow = null;

  crypto.createSign = () => ({
    update: () => ({
      sign: () => Buffer.from("mock-jwt-signature"),
    }),
  });

  supabaseAdmin.from = (table) => {
    assert.equal(table, "github_app_installations");
    return {
      upsert: (row, options) => {
        persistedRow = { row, options };
        return {
          select: () => ({
            single: async () => ({
              data: { id: "row-1", ...row },
              error: null,
            }),
          }),
        };
      },
    };
  };

  try {
    globalThis.fetch = async (url, options) => {
      calls.push({
        url: String(url),
        method: options?.method,
        authHeader: options?.headers?.Authorization,
      });

      if (String(url).includes("/user/installations?")) {
        return jsonResponse({
          total_count: 1,
          installations: [
            {
              id: 987654,
              app_id: 12345,
              account: { id: 42, login: "octo-org", name: "Octo Org", type: "Organization" },
              repository_selection: "selected",
            },
          ],
        });
      }

      if (String(url).includes("/user/installations/987654/repositories")) {
        return jsonResponse({
          total_count: 1,
          repositories: [
            {
              id: 1001,
              name: "repo",
              full_name: "octo-org/repo",
              private: true,
              html_url: "https://github.com/octo-org/repo",
              description: "Verified repo",
              default_branch: "main",
              updated_at: "2026-06-30T00:00:00Z",
            },
          ],
        });
      }

      if (String(url).endsWith("/app/installations/987654")) {
        return jsonResponse({
          id: 987654,
          account: { id: 42, login: "octo-org", name: "Octo Org", type: "Organization" },
          repository_selection: "selected",
        });
      }

      return jsonResponse({ message: "not found" }, { status: 404, statusText: "Not Found" });
    };

    const result = await relinkGitHubAppInstallationForUser({
      userId: "user-after-local-disconnect",
      userAccessToken: "github-user-token",
    });

    assert.equal(result.relinked, true);
    assert.equal(result.installation.installation_id, 987654);
    assert.equal(persistedRow.options.onConflict, "user_id,installation_id");
    assert.equal(persistedRow.row.user_id, "user-after-local-disconnect");
    assert.equal(persistedRow.row.installation_id, 987654);
    assert.equal(persistedRow.row.github_account_login, "octo-org");
    assert.equal(persistedRow.row.repository_selection, "selected");
    assert.equal(persistedRow.row.verified_repository_count, 1);
    assert.deepEqual(persistedRow.row.verified_repositories, [
      {
        id: 1001,
        name: "repo",
        fullName: "octo-org/repo",
        private: true,
        htmlUrl: "https://github.com/octo-org/repo",
        description: "Verified repo",
        defaultBranch: "main",
        updatedAt: "2026-06-30T00:00:00Z",
      },
    ]);
    assert.equal(calls.some((call) => call.url.includes("/installation/repositories")), false);
    assert.equal(calls.some((call) => call.url.includes("/access_tokens")), false);
    assert(calls.some((call) => call.url.includes("/user/installations/987654/repositories")));
    assert(calls.every((call) => call.authHeader !== "Bearer undefined"));
  } finally {
    supabaseAdmin.from = originalFrom;
    globalThis.fetch = originalFetch;
    crypto.createSign = originalCreateSign;
  }
});

test("GitHub disconnect remains local-only and the provider-uninstall endpoint stays removed", async () => {
  const { supabaseAdmin } = loadTsModule("lib/supabase-admin.ts");
  const githubAppService = loadTsModule("lib/services/github-app.service.ts");
  const { removeGitHubInstallationFromDandi } = githubAppService;
  const localDeleteRouteSource = readFileSync(
    resolve(repoRoot, "app/api/integrations/github/installation/route.ts"),
    "utf8",
  );
  const serviceSource = readFileSync(resolve(repoRoot, "lib/services/github-app.service.ts"), "utf8");
  const uninstallRoute = resolve(repoRoot, "app/api/integrations/github/installation/uninstall/route.ts");

  assert.equal(existsSync(uninstallRoute), false);
  assert.equal(githubAppService.uninstallGitHubAppInstallationForUser, undefined);
  assert.doesNotMatch(serviceSource, /export async function uninstallGitHubAppInstallationForUser/);
  assert.match(localDeleteRouteSource, /getPrimaryGitHubInstallationForUserWithClient\(\{[\s\S]*db: supabase,[\s\S]*userId: user\.id/);
  assert.match(localDeleteRouteSource, /removeGitHubInstallationFromDandi\(\{[\s\S]*userId: user\.id,[\s\S]*installationId: installation\.installation_id/);
  assert.match(localDeleteRouteSource, /githubUninstalled: false/);
  assert.match(localDeleteRouteSource, /The GitHub App may still be installed on GitHub/);
  assert.doesNotMatch(localDeleteRouteSource, /request\.json\(|fetch\(/);

  const originalFrom = supabaseAdmin.from;
  const originalFetch = globalThis.fetch;
  const deleteScopes = [];
  let providerFetchCalled = false;

  try {
    supabaseAdmin.from = (table) => {
      assert.equal(table, "github_app_installations");
      return {
        delete: () => ({
          eq: (column, value) => {
            deleteScopes.push([column, value]);
            return {
              eq: async (nextColumn, nextValue) => {
                deleteScopes.push([nextColumn, nextValue]);
                return { error: null };
              },
            };
          },
        }),
      };
    };
    globalThis.fetch = async () => {
      providerFetchCalled = true;
      throw new Error("local disconnect must not call GitHub");
    };

    await removeGitHubInstallationFromDandi({
      userId: "user-111",
      installationId: 141986350,
    });
    assert.deepEqual(deleteScopes, [
      ["user_id", "user-111"],
      ["installation_id", 141986350],
    ]);
    assert.equal(providerFetchCalled, false);
  } finally {
    supabaseAdmin.from = originalFrom;
    globalThis.fetch = originalFetch;
  }
});
