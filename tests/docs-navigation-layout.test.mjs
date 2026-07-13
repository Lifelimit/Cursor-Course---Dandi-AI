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
  assert.doesNotMatch(docs, /scrollIntoView/);
});

test("docs shortcut navigation uses controlled scrolling with mobile collapse-before-scroll sequencing", async () => {
  const docs = await read("app/docs/DocsClient.tsx");

  assert.match(docs, /event\.preventDefault\(\)/);
  assert.match(docs, /window\.history\.pushState\(null, "", `#\$\{id\}`\)/);
  assert.doesNotMatch(docs, /window\.location\.hash\s*=/);
  assert.match(docs, /useReducedMotion/);
  assert.match(docs, /reducedMotion/);
  assert.match(docs, /window\.scrollTo\(\{ top: targetY, behavior: "auto" \}\)/);
  assert.match(docs, /easeOutCubic/);
  assert.match(docs, /getScrollDuration/);
  assert.match(docs, /requestAnimationFrame/);
  assert.match(docs, /cancelAnimationFrame/);
  assert.match(docs, /animationFrameRef/);
  assert.match(docs, /programmaticTargetRef/);
  assert.match(docs, /handleMobileSectionSelect/);
  assert.match(docs, /setMobileNavOpen\(false\)/);
  assert.match(docs, /onSelect=\{scrollToSection\}/);
  assert.match(docs, /onSelect=\{handleMobileSectionSelect\}/);
  assert.match(docs, /SECTION_TOP_OFFSET_AUTHENTICATED = 24/);
  assert.match(docs, /SECTION_TOP_OFFSET_PUBLIC = 112/);
  assert.match(docs, /getSectionTargetY/);
  assert.match(docs, /scroll-mt-6/);
  assert.match(docs, /scroll-mt-28/);
  assert.match(docs, /"wheel"/);
  assert.match(docs, /"touchstart"/);
  assert.match(docs, /"PageUp"/);
  assert.match(docs, /event\.isTrusted/);
  assert.match(docs, /cancelScrollAnimation/);
  assert.match(docs, /useEffect\(\(\) => \(\) => cancelScrollAnimation\(\)/);
  assert.doesNotMatch(docs, /onSectionNavigate/);
  assert.doesNotMatch(docs, /onNavigate/);
  assert.doesNotMatch(docs, /activeId.*scrollIntoView/);
  assert.doesNotMatch(docs, /useEffect\(\(\) => \{[^}]*scrollIntoView/s);
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
