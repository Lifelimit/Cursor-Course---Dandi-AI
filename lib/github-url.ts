const GITHUB_REPO_PATH_RE = /github\.com\/([^\/]+\/[^\/]+)/;
const INVALID_GITHUB_URL_MESSAGE = "Invalid GitHub URL. Expected format: https://github.com/owner/repo";

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
  const url = new URL(githubUrl);
  const pathParts = url.pathname.split("/").filter(Boolean);

  if (pathParts.length < 2) {
    throw new Error(INVALID_GITHUB_URL_MESSAGE);
  }

  const [owner, repo] = pathParts;
  return { owner, repo };
}
