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
  const { getFallbackEmbeddingModel, getPrimaryEmbeddingModel } = loadTsModule("lib/services/google-gemini.service.ts");

  try {
    delete process.env.GOOGLE_EMBEDDING_PRIMARY;
    delete process.env.GOOGLE_EMBEDDING_FALLBACK;
    assert.equal(getPrimaryEmbeddingModel(), ["gemini", "embedding", "001"].join("-"));
    assert.equal(getFallbackEmbeddingModel(), ["gemini", "embedding", "001"].join("-"));

    process.env.GOOGLE_EMBEDDING_PRIMARY = "models/custom-primary";
    process.env.GOOGLE_EMBEDDING_FALLBACK = "custom-fallback";
    assert.equal(getPrimaryEmbeddingModel(), "custom-primary");
    assert.equal(getFallbackEmbeddingModel(), "custom-fallback");
  } finally {
    restoreGoogleEnv(snapshot);
  }
});

test("supports gemini-embedding-002 as an explicitly configured fallback", async () => {
  const snapshot = snapshotGoogleEnv();
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  const calls = [];
  const { googleEmbed } = loadTsModule("lib/services/google-gemini.service.ts");

  try {
    process.env.GOOGLE_API_KEYS = "key-1";
    process.env.GOOGLE_EMBEDDING_PRIMARY = "gemini-embedding-001";
    process.env.GOOGLE_EMBEDDING_FALLBACK = "gemini-embedding-002";
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

    assert.deepEqual(await googleEmbed("query"), [0.3, 0.4]);
    assert.deepEqual(calls, ["gemini-embedding-001", "gemini-embedding-002"]);
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
    restoreGoogleEnv(snapshot);
  }
});

test("tries Gemini embedding keys and models in the requested failover order", async () => {
  const snapshot = snapshotGoogleEnv();
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  const calls = [];
  const warnings = [];
  const { googleEmbed } = loadTsModule("lib/services/google-gemini.service.ts");

  try {
    process.env.GOOGLE_API_KEYS = "key-1,key-2,key-3";
    process.env.GOOGLE_EMBEDDING_PRIMARY = "primary-model";
    process.env.GOOGLE_EMBEDDING_FALLBACK = "fallback-model";
    console.warn = (...args) => warnings.push(args);
    globalThis.fetch = async (url, options) => {
      const model = String(url).match(/models\/([^:]+):/)?.[1];
      calls.push({
        key: options.headers["x-goog-api-key"],
        model,
      });

      if (calls.length < 6) {
        return jsonResponse(
          { error: { status: "RESOURCE_EXHAUSTED", message: "quota exceeded" } },
          { status: 429, statusText: "Too Many Requests" }
        );
      }

      return jsonResponse({ embedding: { values: [0.1, 0.2] } });
    };

    assert.deepEqual(await googleEmbed("query"), [0.1, 0.2]);
    assert.deepEqual(calls, [
      { key: "key-1", model: "primary-model" },
      { key: "key-1", model: "fallback-model" },
      { key: "key-2", model: "primary-model" },
      { key: "key-2", model: "fallback-model" },
      { key: "key-3", model: "primary-model" },
      { key: "key-3", model: "fallback-model" },
    ]);
    assert(warnings.some((warning) => warning[0] === "Moving from API key #1 to API key #2"));
    assert(warnings.some((warning) => warning[0] === "Embedding primary exhausted, trying fallback model"));
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
    restoreGoogleEnv(snapshot);
  }
});

test("dedupes identical Gemini embedding primary and fallback model attempts", async () => {
  const snapshot = snapshotGoogleEnv();
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  const calls = [];
  const { googleEmbed } = loadTsModule("lib/services/google-gemini.service.ts");

  try {
    process.env.GOOGLE_API_KEYS = "key-1,key-2";
    process.env.GOOGLE_EMBEDDING_PRIMARY = "gemini-embedding-001";
    process.env.GOOGLE_EMBEDDING_FALLBACK = "models/gemini-embedding-001";
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

    assert.deepEqual(await googleEmbed("query"), [0.5, 0.6]);
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
    process.env.GOOGLE_EMBEDDING_PRIMARY = "primary-model";
    process.env.GOOGLE_EMBEDDING_FALLBACK = "fallback-model";
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
    process.env.GOOGLE_EMBEDDING_PRIMARY = "primary-model";
    process.env.GOOGLE_EMBEDDING_FALLBACK = "fallback-model";
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
    process.env.GOOGLE_EMBEDDING_PRIMARY = "primary-model";
    process.env.GOOGLE_EMBEDDING_FALLBACK = "fallback-model";
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
    process.env.GOOGLE_EMBEDDING_PRIMARY = "primary-model";
    process.env.GOOGLE_EMBEDDING_FALLBACK = "fallback-model";
    globalThis.fetch = async (url, options) => {
      const model = String(url).match(/models\/([^:]+):/)?.[1];
      const body = JSON.parse(options.body);
      assert.equal(model, "primary-model");
      assert.equal(body.requests.length, 2);
      assert(body.requests.every((request) => request.model === "models/primary-model"));
      assert(body.requests.every((request) => request.outputDimensionality === 768));
      return jsonResponse({ embeddings: [{ values: [1, 2] }, { values: [3, 4] }] });
    };

    assert.deepEqual(await googleBatchEmbed(["first", "second"]), [[1, 2], [3, 4]]);
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
    process.env.GOOGLE_EMBEDDING_PRIMARY = "primary-model";
    process.env.GOOGLE_EMBEDDING_FALLBACK = "fallback-model";
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
