import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("reduced-motion foundation stops ambient and decorative effects", async () => {
  const css = await read("app/globals.css");
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /\.command-ambient-radial/);
  assert.match(css, /\.animate-ping/);
  assert.match(css, /scroll-behavior: auto !important/);
});

test("landing workflow does not progress through timers for reduced motion", async () => {
  const source = await read("components/landing/WorkspaceMockup.tsx");
  assert.match(source, /useReducedMotion/);
  assert.match(source, /if \(!isRunning \|\| reducedMotion\) return/);
  assert.match(source, /setStage\("prepared"\)/);
  assert.match(source, /window\.clearTimeout/);
});

test("shared primitives retain accessible focus, tab, modal, and loading semantics", async () => {
  const [tabs, modal, skeletons] = await Promise.all([
    read("components/command/TabsBar.tsx"),
    read("components/command/ModalFrame.tsx"),
    read("components/ui/SkeletonBlocks.tsx"),
  ]);
  assert.match(tabs, /role="tablist"/);
  assert.match(tabs, /aria-selected/);
  assert.match(tabs, /onKeyDown/);
  assert.match(modal, /aria-modal="true"/);
  assert.match(modal, /event.key === "Escape"/);
  assert.match(skeletons, /role="status"/);
  assert.match(skeletons, /aria-hidden="true"/);
});

test("dashboard distinguishes initial loading from an empty metric", async () => {
  const source = await read("app/dashboards/DashboardClient.tsx");
  assert.match(source, /isInitialDashboardLoading/);
  assert.match(source, /"Loading…"/);
  assert.match(source, /"No requests yet"/);
});
