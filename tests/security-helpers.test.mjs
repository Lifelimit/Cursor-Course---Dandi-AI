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

test("normalizes only canonical GitHub repository URLs", () => {
  const { normalizeGitHubRepoUrl } = loadTsModule("lib/security-core.ts");

  assert.equal(
    normalizeGitHubRepoUrl("https://github.com/OpenAI/codex/tree/main?tab=readme"),
    "https://github.com/OpenAI/codex"
  );
  assert.equal(normalizeGitHubRepoUrl("http://github.com/OpenAI/codex"), null);
  assert.equal(normalizeGitHubRepoUrl("https://example.com/OpenAI/codex"), null);
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
