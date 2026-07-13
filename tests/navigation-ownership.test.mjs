import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const sidebarSource = await readFile(new URL("../components/dashboard/Sidebar.tsx", import.meta.url), "utf8");
const emailSource = await readFile(new URL("../lib/services/email.service.ts", import.meta.url), "utf8");
const readmeSource = await readFile(new URL("../README.md", import.meta.url), "utf8");
const architectureSource = await readFile(new URL("../docs/ARCHITECTURE.md", import.meta.url), "utf8");

test("authenticated navigation uses canonical labels and routes", () => {
  assert.match(sidebarSource, /name: "Playground"/);
  assert.match(sidebarSource, /name: "Usage Intelligence"/);
  assert.match(sidebarSource, /name: "Workspace settings"/);
  assert.match(sidebarSource, /href: ROUTES\.playground/);
  assert.match(sidebarSource, /href: ROUTES\.usage/);
  assert.match(sidebarSource, /href: ROUTES\.account/);
  assert.doesNotMatch(sidebarSource, /name: "API Playground"|name: "Usage Center"|name: "Account Settings"/);
});

test("sidebar keeps its client stable and unknown usage unavailable", () => {
  assert.match(sidebarSource, /const supabase = useMemo\(\(\) => createClient\(\), \[\]\)/);
  assert.match(sidebarSource, /totalUsage = null/);
  assert.match(sidebarSource, /limit = null/);
  assert.match(sidebarSource, /!hasUsage \? "Unavailable"/);
});

test("API key ownership points to workspace settings", () => {
  assert.match(emailSource, /Manage API keys: \$\{new URL\("\/account\?tab=api", getURL\(\)\)\.toString\(\)\}/);
  assert.match(readmeSource, /\/dashboards.*workspace overview/i);
  assert.match(readmeSource, /\/account.*workspace settings/i);
  assert.match(architectureSource, /\| `\/dashboards` \| Workspace overview and recent repository activity \|/);
  assert.match(architectureSource, /\| `\/account` \| Profile, GitHub, API access, webhooks, and security \|/);
});

test("unreferenced legacy usage components stay removed", async () => {
  for (const path of [
    "../components/usage/AnalyticsDashboard.tsx",
    "../components/usage/AnalyticsDashboardParts.tsx",
    "../components/usage/QuotaHealthGrid.tsx",
    "../components/usage/QuotaHealthCards.tsx",
    "../components/usage/TopReposTable.tsx",
  ]) {
    await assert.rejects(access(new URL(path, import.meta.url)));
  }
});
