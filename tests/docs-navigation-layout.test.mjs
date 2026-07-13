import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("dashboard sidebar sticky positioning is configurable and defaults to sticky", async () => {
  const sidebar = await read("components/dashboard/Sidebar.tsx");

  assert.match(sidebar, /sticky\?: boolean;/);
  assert.match(sidebar, /sticky = true,/);
  assert.match(sidebar, /const sidebarPositionClassName = sticky/);
  assert.match(sidebar, /\? "sticky top-3 md:top-12"/);
  assert.match(sidebar, /: "static"/);
  assert.match(sidebar, /\$\{sidebarPositionClassName\}/);
  assert.doesNotMatch(sidebar, /relative sticky top-3/);
});

test("authenticated docs disable main dashboard sidebar stickiness while docs nav stays sticky", async () => {
  const docs = await read("app/docs/DocsClient.tsx");

  assert.match(docs, /sticky: false,/);
  assert.match(docs, /docsNavStickyClassName = initialSession \? "lg:sticky lg:top-6 lg:z-20" : "lg:sticky lg:top-28 lg:z-20"/);
  assert.match(docs, /docsNavScrollClassName = initialSession \? "max-h-\[calc\(100dvh-2rem\)\]" : "max-h-\[calc\(100dvh-8rem\)\]"/);
  assert.match(docs, /overflow-y-auto overscroll-y-contain/);
  assert.match(docs, /Browse documentation/);
  assert.doesNotMatch(docs, /activeLink\?\.scrollIntoView/);
});

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
