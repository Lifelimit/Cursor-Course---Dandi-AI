import { normalizeGitHubRepoUrl } from "@/lib/security-core";

const GITHUB_REPO_PATH_RE = /github\.com\/([^\/]+\/[^\/]+)/;
const INVALID_GITHUB_URL_MESSAGE = "Invalid GitHub URL. Expected format: https://github.com/owner/repo";
export const GITHUB_REPOSITORY_URL_VALIDATION_MESSAGE = "Enter a valid GitHub repository URL, for example https://github.com/owner/repository.";

export type GitHubRepositoryParts = {
  owner: string;
  repo: string;
};

export function getGitHubRepoPath(value: string, fallback = "unknown/repository") {
  try {
    const match = value.match(GITHUB_REPO_PATH_RE);
    return match ? match[1] : fallback;
  } catch {
    return fallback;
  }
}

export function formatGitHubRepoLabel(value: string, options: { trimTrailingSlash?: boolean } = {}) {
  const label = value.replace("https://github.com/", "");
  return options.trimTrailingSlash ? label.replace(/\/$/, "") : label;
}

export function getGitHubRepositoryParts(githubUrl: string): GitHubRepositoryParts {
  const normalized = normalizeGitHubRepoUrl(githubUrl);
  if (!normalized) throw new Error(INVALID_GITHUB_URL_MESSAGE);

  const url = new URL(normalized);
  const pathParts = url.pathname.split("/").filter(Boolean);

  if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "github.com" || pathParts.length !== 2) {
    throw new Error(INVALID_GITHUB_URL_MESSAGE);
  }

  const [owner, rawRepo] = pathParts;
  const repo = rawRepo.replace(/\.git$/i, "");
  if (!repo) throw new Error(INVALID_GITHUB_URL_MESSAGE);
  return { owner, repo };
}
