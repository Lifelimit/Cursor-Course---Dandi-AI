import type { DashboardRepositoryWork } from "./dashboard-types";

/** Keeps the newest job per repo. Input must be sorted by updatedAt descending. */
export function getLatestWorkByRepo(works: DashboardRepositoryWork[]) {
  const latest = new Map<string, DashboardRepositoryWork>();
  for (const work of works) {
    if (!latest.has(work.repoUrl)) {
      latest.set(work.repoUrl, work);
    }
  }
  return [...latest.values()];
}
