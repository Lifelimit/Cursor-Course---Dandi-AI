import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the docs page forwards the optional session to one shared documentation workspace", async () => {
  const page = await read("app/docs/page.tsx");

  assert.match(page, /getVerifiedSession\(supabase\)/);
  assert.match(page, /getServerApiKeys\(\)/);
  assert.match(page, /<DocsClient initialSession=\{session\} initialKeys=\{initialKeys\} initialPlan=\{plan\} \/>/);
  assert.match(page, /<DocsClient initialSession=\{null\} \/>/);
});

test("authenticated docs use dashboard chrome while public docs keep public chrome", async () => {
  const docs = await read("app/docs/DocsClient.tsx");
  const authenticatedStart = docs.indexOf("if (initialSession)");
  const publicStart = docs.indexOf('return <div className="min-h-screen', authenticatedStart);

  assert.ok(authenticatedStart >= 0, "authenticated docs branch must exist");
  assert.ok(publicStart > authenticatedStart, "public docs branch must follow the authenticated branch");

  const authenticatedBranch = docs.slice(authenticatedStart, publicStart);
  const publicBranch = docs.slice(publicStart);

  assert.match(docs, /const ContentRoot: "main" \| "div" = initialSession \? "div" : "main"/);
  assert.match(authenticatedBranch, /<AuthenticatedDocsShell/);
  assert.match(docs, /sticky: false,/);
  assert.match(docs, /<DashboardShell/);
  assert.match(authenticatedBranch, /\{docsWorkspace\}/);
  assert.doesNotMatch(authenticatedBranch, /<Navbar|<Footer/);

  assert.match(publicBranch, /href="#docs-content"/);
  assert.match(publicBranch, /<Navbar session=\{initialSession\} \/>/);
  assert.match(publicBranch, /\{docsWorkspace\}/);
  assert.match(publicBranch, /<Footer \/>/);
  assert.doesNotMatch(publicBranch, /<DashboardShell/);
});
