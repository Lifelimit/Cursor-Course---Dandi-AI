import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("shared dashboard shells clip horizontal overflow without creating sticky scroll containers", async () => {
  const [animatedBackground, commandShell, dashboardShell] = await Promise.all([
    read("components/command/AnimatedBackground.tsx"),
    read("components/command/CommandShell.tsx"),
    read("components/dashboard/DashboardShell.tsx"),
  ]);

  assert.match(animatedBackground, /overflow-x-clip/);
  assert.doesNotMatch(animatedBackground, /overflow-hidden/);
  assert.match(commandShell, /overflow-x-clip/);
  assert.doesNotMatch(commandShell, /overflow-x-hidden/);
  assert.doesNotMatch(dashboardShell, /overflow-x-hidden/);
});
