import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("repository recovery and integration callbacks use canonical workflow destinations", async () => {
  const [dashboard, recentWork, githubStart, githubCallback, routes] = await Promise.all([
    read("app/dashboards/DashboardClient.tsx"),
    read("components/dashboard/RecentRepositoryWork.tsx"),
    read("app/api/integrations/github/start/route.ts"),
    read("app/api/integrations/github/callback/route.ts"),
    read("lib/routes.ts"),
  ]);

  assert.match(dashboard, /playgroundRoute\("ask", failedWork\.repoUrl\)/);
  assert.match(recentWork, /mode: "summary" \| "ask" = "ask"/);
  assert.match(recentWork, /return playgroundRoute\(mode, work\.repoUrl\)/);
  assert.match(recentWork, /workHref\(work, "summary"\)/);
  assert.match(githubStart, /searchParams\.set\("tab", "github"\)/);
  assert.match(githubCallback, /searchParams\.set\("tab", "github"\)/);
  assert.doesNotMatch(`${githubStart}\n${githubCallback}`, /searchParams\.set\("tab", "integrations"\)/);
  assert.match(routes, /accountApi: accountRoute\("api"\)/);
  assert.match(routes, /billingPlans: "\/billing#plans"/);
});

test("Account and Playground synchronize missing query parameters to canonical defaults", async () => {
  const [account, playground] = await Promise.all([
    read("app/account/AccountClient.tsx"),
    read("app/playground/PlaygroundClient.tsx"),
  ]);

  assert.match(account, /setActiveTab\(parseAccountTab\(tab\)\)/);
  assert.doesNotMatch(account, /if \(!tab\) return/);
  assert.match(playground, /setActiveTab\("summary"\)/);
  assert.match(playground, /if \(mode === "ask"\)/);
  assert.doesNotMatch(playground, /realtimePlan|fetch\("\/api\/usage"\)/);
});

test("homepage pricing compares plans while Billing owns authenticated mutations", async () => {
  const pricing = await read("components/landing/PricingSection.tsx");

  assert.match(pricing, /href="\/billing#plans"/);
  assert.match(pricing, /total API requests/);
  assert.match(pricing, /requests per month/);
  assert.doesNotMatch(pricing, /SubscriptionModal|useSubscriptionFlow|cancel-subscription|\/api\/stripe/);
  assert.doesNotMatch(pricing, /summaries per month|repository summaries do you expect/);
});

test("authenticated documentation stays in the product shell and states repository boundaries", async () => {
  const docs = await read("app/docs/DocsClient.tsx");

  assert.match(docs, /if \(initialSession\)/);
  assert.match(docs, /<DashboardShell/);
  assert.match(docs, /<Navbar session=\{initialSession\}/);
  assert.match(docs, /README-grounded overview of a public repository/);
  assert.match(docs, /Summary, Prepare, and Ask currently support public GitHub repositories only/);
  assert.match(docs, /display-only integration metadata and does not authorize private repository reads/);
  assert.doesNotMatch(docs, /Repository Summary also supports a private repository/);
  assert.doesNotMatch(docs, /For private Summary requests/);
});

test("usage alert settings belong to owner-scoped API key updates", async () => {
  const [editModal, keyRoute] = await Promise.all([
    read("components/account/AccountApiKeyEditModal.tsx"),
    read("app/api/keys/[id]/route.ts"),
  ]);

  await assert.rejects(
    access(new URL("../app/api/usage/alert/route.ts", import.meta.url)),
    (error) => error?.code === "ENOENT",
  );
  assert.match(editModal, /fetch\(`\/api\/keys\/\$\{apiKey\.apiKeyId\}`/);
  assert.match(editModal, /method: "PATCH"/);
  assert.match(editModal, /alertThreshold: alertsEnabled \? parsedThreshold : null/);
  assert.match(editModal, /alertChannels: alertsEnabled/);
  assert.doesNotMatch(editModal, /\/api\/usage\/alert/);

  assert.match(keyRoute, /const userId = await getAuthenticatedUserId\(\)/);
  assert.match(keyRoute, /updates\.alert_threshold = settings\.alertThreshold/);
  assert.match(keyRoute, /updates\.alert_channels = settings\.alertChannels/);
  const ownerFilters = keyRoute.match(/\.eq\("user_id", userId\)/g) || [];
  assert.ok(ownerFilters.length >= 2, "API key reads and updates must remain owner-scoped");
  assert.match(keyRoute, /rpc\(\s*"begin_owned_api_key_deletion"/);
  assert.match(keyRoute, /p_profile_id: userId, p_key_id: id/);
});

test("external validation is opt-in, read-only, and secret-redacting", async () => {
  const script = await read("scripts/external-validation.mjs");

  assert.match(script, /process\.argv\.includes\("--probe"\)/);
  assert.match(script, /no customer, payment, email, AI-generation, repository-ingestion, or outbound-webhook mutations/i);
  assert.match(script, /Still intentionally gated/);
  assert.doesNotMatch(script, /console\.log\([^\n]*(STRIPE_SECRET_KEY|GOOGLE_API_KEY|SUPABASE_SERVICE_ROLE_KEY)/);
});

test("shared controls expose table, tab, listbox, quota, and contrast semantics", async () => {
  const [apiTables, deliveryTable, deliveryInspector, accountNav, keyDropdown, sidebar, usage, shell, css] = await Promise.all([
    read("components/account/AccountApiKeysPanel.tsx"),
    read("components/account/AccountDeliveryLogsPanel.tsx"),
    read("components/account/AccountDeliveryLogInspectorModal.tsx"),
    read("components/account/AccountSettingsNav.tsx"),
    read("components/playground/ApiKeyDropdown.tsx"),
    read("components/dashboard/Sidebar.tsx"),
    read("components/usage/UsageIntelligenceDashboard.tsx"),
    read("components/dashboard/DashboardShell.tsx"),
    read("app/globals.css"),
  ]);

  assert.match(apiTables, /role="list" aria-label="Active API keys"/);
  assert.match(apiTables, /<th scope="col"/);
  assert.match(deliveryTable, /<caption className="sr-only">Webhook test delivery details<\/caption>/);
  assert.match(deliveryInspector, /aria-controls="delivery-log-request-panel"/);
  assert.match(deliveryInspector, /event\.key === "Home"/);
  assert.match(accountNav, /role="tablist"/);
  assert.match(accountNav, /role="tab"/);
  assert.match(accountNav, /aria-selected=\{isActive\}/);
  assert.match(accountNav, /event\.key === "ArrowRight"/);
  assert.match(keyDropdown, /role="combobox"/);
  assert.match(keyDropdown, /aria-activedescendant/);
  assert.match(keyDropdown, /event\.key === "Tab"/);
  assert.match(keyDropdown, /menuDirection === "above"/);
  assert.match(keyDropdown, /max-h-\[calc\(100dvh-4rem\)\]/);
  assert.match(sidebar, /role=\{hasUsage && !isUnlimited && hasLimit \? "meter" : undefined\}/);
  assert.match(sidebar, /isUsageStale \? "Snapshot stale"/);
  assert.match(usage, /aria-pressed=\{metric === option\}/);
  assert.match(usage, /role=\{isUnlimited \? "status" : "meter"\}/);
  assert.match(usage, /event\.preventDefault\(\)/);
  assert.match(shell, /href="#dashboard-main-content"/);
  assert.match(shell, /id="dashboard-main-content" tabIndex=\{-1\}/);
  assert.match(css, /--dandi-text-meta: #7c8ba1/);
});

test("hidden API key validation never places credentials in the URL", async () => {
  const [protectedClient, proxy, validationRoute] = await Promise.all([
    read("app/protected/ProtectedClient.tsx"),
    read("proxy.ts"),
    read("app/api/validate/route.ts"),
  ]);

  assert.match(protectedClient, /<form className="mt-10 space-y-3" onSubmit=\{validateKey\}>/);
  assert.match(protectedClient, /body: JSON\.stringify\(\{ key: submittedKey \}\)/);
  assert.match(protectedClient, /type="password"/);
  assert.doesNotMatch(protectedClient, /useSearchParams|searchParams\.get\("key"\)|hasKeyQueryParam/);
  assert.match(proxy, /pathname === "\/protected" && request\.nextUrl\.searchParams\.has\("key"\)/);
  assert.match(proxy, /sanitizedUrl\.searchParams\.delete\("key"\)/);
  assert.match(validationRoute, /Redis was unavailable during validation rate limiting; blocking the request/);
  assert.match(validationRoute, /status: 503/);
  assert.match(validationRoute, /"Retry-After": "60"/);
});

test("repository preparation polling remains active in hidden tabs at a safe cadence", async () => {
  const source = await read("hooks/useRepositoryIngestion.ts");

  assert.match(source, /ingestionControllerRef/);
  assert.match(source, /new AbortController\(\)/);
  assert.match(source, /document\.visibilityState === "hidden"/);
  assert.match(source, /Math\.max\(visibleDelay, 5000\)/);
  assert.match(source, /signal: controller\.signal/);
  assert.match(source, /ingestionControllerRef\.current\?\.abort\(\)/);
  assert.match(source, /pollIngestionJobUntilSettled/);
});
