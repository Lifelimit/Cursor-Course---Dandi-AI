import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

function getLatestWorkByRepo(works) {
  const latest = new Map();
  for (const work of works) {
    if (!latest.has(work.repoUrl)) {
      latest.set(work.repoUrl, work);
    }
  }
  return [...latest.values()];
}

function work(overrides) {
  return {
    repoName: null,
    currentStep: null,
    summaryAvailable: false,
    indexAvailable: false,
    errorMessage: null,
    ...overrides,
  };
}

test("dashboard recovery uses latest job per repo before flagging failures", async () => {
  const [dashboard, dashboardPage, recentWork] = await Promise.all([
    read("app/dashboards/DashboardClient.tsx"),
    read("app/dashboards/page.tsx"),
    read("components/dashboard/RecentRepositoryWork.tsx"),
  ]);

  assert.match(dashboard, /getLatestWorkByRepo\(initialRecentWork\)\.find\(\(work\) => work\.status === "failed"\)/);
  assert.match(dashboardPage, /formatIngestionJob\(job\)/);
  assert.match(dashboardPage, /formatted\.errorMessage/);
  assert.match(recentWork, /getLatestWorkByRepo\(works\)/);
});

test("getLatestWorkByRepo keeps the newest job per repo", () => {
  const repo = "https://github.com/example/repo";
  const works = [
    work({ id: "1", repoUrl: repo, status: "completed", updatedAt: "2026-07-13T10:00:00.000Z" }),
    work({ id: "2", repoUrl: repo, status: "failed", updatedAt: "2026-07-12T10:00:00.000Z" }),
  ];

  const latest = getLatestWorkByRepo(works);
  assert.equal(latest.length, 1);
  assert.equal(latest[0]?.id, "1");
  assert.equal(latest[0]?.status, "completed");
});

test("getLatestWorkByRepo surfaces unresolved repo failures only", () => {
  const works = [
    work({ id: "1", repoUrl: "https://github.com/example/fixed", status: "completed", updatedAt: "2026-07-13T10:00:00.000Z" }),
    work({ id: "2", repoUrl: "https://github.com/example/fixed", status: "failed", updatedAt: "2026-07-12T10:00:00.000Z" }),
    work({ id: "3", repoUrl: "https://github.com/example/broken", status: "failed", updatedAt: "2026-07-11T10:00:00.000Z", errorMessage: "Tree read failed." }),
  ];

  const failedWork = getLatestWorkByRepo(works).find((item) => item.status === "failed");
  assert.equal(failedWork?.id, "3");
  assert.equal(failedWork?.errorMessage, "Tree read failed.");
});
