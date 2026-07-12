import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (relativePath) =>
  readFile(new URL("../" + relativePath, import.meta.url), "utf8");

test("landing previews honor reduced motion and hide closed listbox options", async () => {
  const source = await readSource("components/landing/FeatureGrid.tsx");

  assert.match(source, /useReducedMotion/);
  assert.match(source, /if \(reducedMotion\)/);
  assert.match(source, /hidden=\{!isDropdownOpen\}/);
  assert.match(source, /aria-hidden=\{!isDropdownOpen\}/);
  assert.match(source, /role="combobox"/);
  assert.match(source, /aria-activedescendant/);
  assert.match(source, /event\.key === "ArrowDown"/);
  assert.match(source, /event\.key === "Home"/);
});

test("landing API examples match the streaming summary contract", async () => {
  const [featureSource, heroSource] = await Promise.all([
    readSource("components/landing/FeatureGrid.tsx"),
    readSource("components/landing/HeroSection.tsx"),
  ]);

  for (const source of [featureSource, heroSource]) {
    assert.match(source, /res\.text\(\)/);
    assert.match(source, /x-github-metadata/);
    assert.match(source, /metadata\.metadata\.stars|Decoded x-github-metadata header/);
  }
  assert.doesNotMatch(heroSource, /res\.json\(\)/);
});

test("account security inputs expose browser hints and persistent inline errors", async () => {
  const [panelSource, clientSource] = await Promise.all([
    readSource("components/account/AccountSecurityPanel.tsx"),
    readSource("app/account/AccountClient.tsx"),
  ]);

  assert.match(panelSource, /name="new-password"/);
  assert.match(panelSource, /name="confirm-password"/);
  assert.match(panelSource, /autoComplete="new-password"/);
  assert.match(panelSource, /name="email"/);
  assert.match(panelSource, /autoComplete="email"/);
  assert.match(panelSource, /aria-invalid=\{Boolean\(passwordError\)\}/);
  assert.match(panelSource, /id="account-password-error" role="alert"/);
  assert.match(panelSource, /id="account-email-error" role="alert"/);
  assert.match(clientSource, /setPasswordSaveError/);
  assert.match(clientSource, /setEmailSaveError/);
  assert.match(clientSource, /totalUsage: usage\?\.totalUsage \?\? null/);
});

test("repository chat labels its question and announces only completion", async () => {
  const source = await readSource("components/playground/RepositoryChatPanel.tsx");

  assert.match(source, /htmlFor="repository-chat-question"/);
  assert.match(source, /id="repository-chat-question"/);
  assert.match(source, /name="repository-question"/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /Dandi response complete\./);
  assert.match(source, /\[overflow-wrap:anywhere\]/);
});

test("readiness labels require real prerequisites", async () => {
  const [dashboardSource, playgroundSource] = await Promise.all([
    readSource("components/dashboard/WorkspaceReadiness.tsx"),
    readSource("app/playground/PlaygroundClient.tsx"),
  ]);

  assert.match(dashboardSource, /workspaceReady = !hasAttention && hasRepositoryWork/);
  assert.match(dashboardSource, /Ready for first run/);
  assert.match(dashboardSource, /pulse=\{workspaceReady\}/);
  assert.match(playgroundSource, /canRunCurrentWorkflow/);
  assert.match(playgroundSource, /Setup Required/);
  assert.match(playgroundSource, /Ready to Run/);
});
