import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../app/docs/DocsClient.tsx", import.meta.url), "utf8");

test("docs retain the canonical repository intelligence flow", () => {
  assert.match(source, /Summarize gives an immediate overview/);
  assert.match(source, /Prepare indexes public repository content/);
  assert.match(source, /Preparation enables Ask; it is not required for Summary/);
  assert.match(source, /README-grounded overview of a public repository/);
  assert.match(source, /streamed structured summary based on README evidence/);
});

test("docs keep every repository intelligence workflow public-only", () => {
  assert.match(source, /Summary, Prepare, and Ask currently support public GitHub repositories only/);
  assert.match(source, /display-only integration metadata and does not authorize private repository reads/);
  assert.match(source, /Private repository preparation is not supported/);
  assert.match(source, /Private repository chat is not supported/);
  assert.doesNotMatch(source, /Repository Summary also supports a private repository/);
  assert.doesNotMatch(source, /authorized private repositories/);
  assert.doesNotMatch(source, /For private Summary requests/);
});

test("docs navigation supports filtering and programmatic current location", () => {
  assert.match(source, /Search endpoints, errors, or concepts/);
  assert.match(source, /No sections match this filter/);
  assert.match(source, /aria-current={activeId === item.id \? "location" : undefined}/);
  assert.match(source, /new IntersectionObserver/);
});

test("docs retain valid endpoint paths and playground mappings", () => {
  for (const endpoint of ["/api/github-summarizer", "/api/rag/ingest", "/api/rag/chat"]) {
    assert.match(source, new RegExp(endpoint.replaceAll("/", "\\/")));
  }
  assert.match(source, /href="\/playground\?mode=summary"/);
  assert.match(source, /playgroundHref="\/playground\?mode=ask"/);
});

test("code examples expose accessible copy controls and safe key placeholders", () => {
  assert.match(source, /aria-label={`Copy \$\{label\}`}/);
  assert.match(source, /YOUR_API_KEY/);
  assert.doesNotMatch(source, /dandi_live_/);
});

test("mobile navigation and reduced-motion-safe anchor behavior remain available", () => {
  assert.match(source, /aria-expanded={mobileNavOpen}/);
  assert.match(source, /sectionClassName = initialSession \? "scroll-mt-6 space-y-6" : "scroll-mt-28 space-y-6"/);
  assert.match(source, /Skip to documentation/);
});

test("desktop docs navigation separates sticky positioning from internal scrolling", () => {
  assert.match(source, /lg:self-start \$\{docsNavStickyClassName\}/);
  assert.match(source, /docsNavStickyClassName = initialSession \? "lg:sticky lg:top-6 lg:z-20" : "lg:sticky lg:top-28 lg:z-20"/);
  assert.match(source, /docsNavScrollClassName = initialSession \? "max-h-\[calc\(100dvh-2rem\)\]" : "max-h-\[calc\(100dvh-8rem\)\]"/);
  assert.match(source, /className=\{`\$\{docsNavScrollClassName\} space-y-5 overflow-y-auto overscroll-y-contain pr-1`\}/);
  assert.doesNotMatch(source, /stickyNavClassName/);
  assert.doesNotMatch(source, /scrollIntoView\(\{ block: "nearest"/);
  assert.doesNotMatch(source, /activeLink\?\.scrollIntoView/);
});

test("intentional section navigation still respects reduced motion", () => {
  assert.match(source, /section\.scrollIntoView\(\{ behavior: reducedMotion \? "auto" : "smooth", block: "start" \}\)/);
  assert.match(source, /useReducedMotion/);
});
