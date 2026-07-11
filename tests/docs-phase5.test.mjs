import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../app/docs/DocsClient.tsx", import.meta.url), "utf8");

test("docs retain the canonical repository intelligence flow", () => {
  assert.match(source, /Summarize gives an immediate overview/);
  assert.match(source, /Prepare indexes repository content/);
  assert.match(source, /Preparation enables Ask; it is not required for Summary/);
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
  assert.match(source, /scroll-mt-28/);
  assert.match(source, /Skip to documentation/);
});
