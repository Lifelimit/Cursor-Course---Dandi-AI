import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("usage polling is single-flight, abortable, and pauses in hidden tabs", async () => {
  const source = await read("hooks/useUsageData.ts");

  assert.match(source, /if \(inFlightRequest\.current\) return inFlightRequest\.current/);
  assert.match(source, /new AbortController\(\)/);
  assert.match(source, /signal: controller\.signal/);
  assert.match(source, /activeController\.current\?\.abort\(\)/);
  assert.match(source, /document\.visibilityState === "hidden"/);
  assert.match(source, /document\.addEventListener\("visibilitychange"/);
  assert.match(source, /document\.removeEventListener\("visibilitychange"/);
});

test("usage intelligence preserves unknown data and labels stale or unavailable states", async () => {
  const [source, sidebar] = await Promise.all([
    read("app/usage/UsageClient.tsx"),
    read("components/dashboard/Sidebar.tsx"),
  ]);

  assert.match(source, /fetchOnMount: initialData === null/);
  assert.match(source, /currentData\?\.totalUsage \?\? null/);
  assert.match(source, /label: "Usage stale"/);
  assert.match(source, /label: "Usage unavailable"/);
  assert.match(source, /label: "Usage current"/);
  assert.match(source, /isUsageStale: Boolean\(usageError && currentData\)/);
  assert.match(sidebar, /Showing the last available snapshot while usage reconnects/);
});

test("Playground retries ambiguous server hydration and follows repository query navigation", async () => {
  const [serverData, page, client] = await Promise.all([
    read("lib/services/server-data.service.ts"),
    read("app/playground/page.tsx"),
    read("app/playground/PlaygroundClient.tsx"),
  ]);

  assert.match(serverData, /keys: ApiKeyApiResponse\[\] \| null/);
  assert.match(serverData, /return \{ keys: null, plan/);
  assert.match(page, /initialKeysRaw\?\.map\(mapApiKey\)/);
  assert.match(client, /useApiKeys\(initialKeys, initialPlan \|\| metadataPlan\)/);
  assert.match(client, /hydratedPlan \|\| initialPlan \|\| metadataPlan \|\| "Plan unavailable"/);
  assert.match(client, /repositoryQuery === previousRepositoryQueryRef\.current/);
  assert.match(client, /resetSummary\(\)/);
  assert.match(client, /resetIngestedRepository\(\)/);
  assert.doesNotMatch(client, /initialKeys = \[\]/);
});

test("billing refreshes after server hydration and locks payment deletion while pending", async () => {
  const source = await read("app/billing/BillingClient.tsx");

  assert.match(source, /window\.setTimeout\(\(\) => void fetchBillingData\(\), 0\)/);
  assert.doesNotMatch(source, /if \(initialData\) return/);
  assert.match(source, /if \(deletionInFlight\.current\) return/);
  assert.match(source, /aria-busy=\{isDeletingCard\}/);
  assert.match(source, /role="alert"/);
  assert.match(source, /disabled=\{isDeletingCard\}/);
  assert.match(source, /totalUsage: currentData\?\.totalUsage \?\? null/);
});

test("API key hydration distinguishes an empty server result and waits for an owner before realtime", async () => {
  const source = await read("hooks/useApiKeys.ts");

  assert.match(source, /const hasInitialData = initialData !== undefined/);
  assert.match(source, /const hasCompleteInitialData = hasInitialData && Boolean\(initialPlan\)/);
  assert.match(source, /useState\(!hasCompleteInitialData\)/);
  assert.match(source, /shouldSkipInitialLoad/);
  assert.match(source, /response\.headers\.get\("x-dandi-plan"\)/);
  assert.match(source, /if \(!supabase \|\| !userId\) return/);
  assert.match(source, /eventUserId && eventUserId !== userId/);
  assert.doesNotMatch(source, /filter:\s*["'`]/);
});
