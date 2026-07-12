import { getGitHubRepositoryParts } from "@/lib/github-url";
import { getServerEnv } from "@/lib/env";

export class GitHubAuthError extends Error {
  constructor(
    public code: "GITHUB_PRIVATE_REPO_UNSUPPORTED" | "GITHUB_REPO_NOT_FOUND",
    message?: string
  ) {
    super(message || code);
    this.name = "GitHubAuthError";
  }
}

export class GitHubPublicRepositoryRequiredError extends Error {
  readonly code = "GITHUB_PUBLIC_REPOSITORY_REQUIRED";

  constructor() {
    super("Prepare & Ask currently supports public repositories only. Verify the repository URL or use a public repository.");
    this.name = "GitHubPublicRepositoryRequiredError";
  }
}

export class GitHubPublicRepositoryCheckError extends Error {
  readonly code = "GITHUB_PUBLIC_REPOSITORY_CHECK_UNAVAILABLE";

  constructor() {
    super("Dandi could not verify that this repository is public. Wait a moment and retry.");
    this.name = "GitHubPublicRepositoryCheckError";
  }
}

type GitHubRepositoryMetadata = {
  private?: unknown;
  stargazers_count?: number;
  license?: { spdx_id?: string | null; name?: string | null } | null;
  forks_count?: number;
  description?: string | null;
};

function getGitHubHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "Dandi-AI-Summarizer"
  };

  if (token) {
    headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
  }

  return headers;
}

/**
 * Private RAG remains intentionally disabled. The first visibility check is
 * unauthenticated. If GitHub rate-limits that check, an optional server token
 * may retry metadata only; `private` must still be exactly false before any
 * repository content is fetched.
 */
export async function assertPublicRepositoryForRag(
  githubUrl: string,
  visibilityProbeToken = getServerEnv().GITHUB_TOKEN,
) {
  const { owner, repo } = getGitHubRepositoryParts(githubUrl);
  const repositoryUrl = `https://api.github.com/repos/${owner}/${repo}`;
  let response = await fetch(repositoryUrl, {
    headers: getGitHubHeaders(),
  });

  if ((response.status === 403 || response.status === 429) && visibilityProbeToken) {
    response = await fetch(repositoryUrl, {
      headers: getGitHubHeaders(visibilityProbeToken),
    });
  }

  if (response.status === 404) {
    throw new GitHubPublicRepositoryRequiredError();
  }
  if (!response.ok) throw new GitHubPublicRepositoryCheckError();

  const repository = await response.json() as GitHubRepositoryMetadata;
  if (repository.private !== false) {
    throw new GitHubPublicRepositoryRequiredError();
  }
  return repository;
}

function buildGitHubMetadata(repository: GitHubRepositoryMetadata, version = "Unknown") {
  return {
    stars: repository.stargazers_count ?? 0,
    license: repository.license?.spdx_id || repository.license?.name || "None",
    version,
    forks: repository.forks_count ?? 0,
    description: repository.description ?? null,
  };
}

/**
 * Helper function to fetch README.md from a GitHub URL
 */
export async function fetchGitHubReadme(githubUrl: string, token?: string): Promise<string> {
  const { owner, repo } = getGitHubRepositoryParts(githubUrl);

  // Primary method: Use GitHub API to automatically resolve the default branch (e.g., canary, develop)
  const headers = getGitHubHeaders(token);
  headers["Accept"] = "application/vnd.github.v3.raw"; // Get raw text instead of base64 JSON

  const apiResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
    headers
  });

  if (apiResponse.ok) {
    return await apiResponse.text();
  }

  // Fallback: If API rate limited, try fetching from raw.githubusercontent.com directly
  const branches = ["main", "master"];
  for (const branch of branches) {
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`;
    const response = await fetch(rawUrl, {
      headers: getGitHubHeaders(token)
    });

    if (response.ok) {
      return await response.text();
    }
  }

  throw new Error(`Could not find README.md for repository ${owner}/${repo}.`);
}

type FetchGitHubMetadataOptions = {
  includeVersion?: boolean;
};

async function fetchGitHubVersion(owner: string, repo: string, token?: string) {
  try {
    const releaseResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
      headers: getGitHubHeaders(token)
    });

    if (releaseResponse.ok) {
      const releaseData = await releaseResponse.json();
      if (typeof releaseData.tag_name === "string" && releaseData.tag_name.length > 0) {
        return releaseData.tag_name;
      }
    }

    const tagsResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/tags`, {
      headers: getGitHubHeaders(token)
    });
    if (tagsResponse.ok) {
      const tagsData = await tagsResponse.json();
      if (Array.isArray(tagsData) && typeof tagsData[0]?.name === "string" && tagsData[0].name.length > 0) {
        return tagsData[0].name;
      }
    }
  } catch {
    console.warn("Optional GitHub version lookup failed.");
  }

  return "Unknown";
}

/**
 * Fetches repository metadata from the GitHub API. Version lookup is optional because
 * release/tag requests are nice-to-have and can delay summary streaming.
 */
export async function fetchGitHubMetadata(
  githubUrl: string,
  token?: string,
  options: FetchGitHubMetadataOptions = {}
) {
  const { owner, repo } = getGitHubRepositoryParts(githubUrl);
  const { includeVersion = true } = options;

  // 1. Fetch Repository Details (Stars, License)
  const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: getGitHubHeaders(token)
  });

  if (!repoResponse.ok) {
    throw new Error(`GitHub API Error: ${repoResponse.statusText}`);
  }

  const repoData = await repoResponse.json();

  const version = includeVersion ? await fetchGitHubVersion(owner, repo, token) : "Unknown";

  return buildGitHubMetadata(repoData, version);
}

/**
 * Fetches public repository data. GitHub App installation snapshots are
 * display-only and must never be treated as current private-repository
 * authorization.
 */
export async function fetchRepositoryDataWithAuth(input: {
  githubUrl: string;
  userId?: string | null;
  includeVersionMetadata?: boolean;
}) {
  const metadataOptions = { includeVersion: input.includeVersionMetadata ?? true };

  // 1. Attempt public fetch first
  try {
    const [readmeContent, metadata] = await Promise.all([
      fetchGitHubReadme(input.githubUrl),
      fetchGitHubMetadata(input.githubUrl, undefined, metadataOptions)
    ]);
    return { readmeContent, metadata };
  } catch {
    const publicFallbackToken = getServerEnv().GITHUB_TOKEN;

    // An optional server token may retry the visibility probe only. Repository
    // content remains anonymous so a broadly scoped token can never turn a
    // public-only workflow into a private-content read after a visibility race.
    if (publicFallbackToken) {
      try {
        const verifiedRepository = await assertPublicRepositoryForRag(input.githubUrl, publicFallbackToken);
        const readmeContent = await fetchGitHubReadme(input.githubUrl);
        const metadata = buildGitHubMetadata(verifiedRepository);
        return { readmeContent, metadata };
      } catch (err) {
        if (err instanceof GitHubPublicRepositoryRequiredError) {
          throw new GitHubAuthError("GITHUB_PRIVATE_REPO_UNSUPPORTED");
        }
        // Continue to the final public visibility check below.
      }
    }

    try {
      await assertPublicRepositoryForRag(input.githubUrl);
    } catch (err) {
      if (err instanceof GitHubPublicRepositoryRequiredError) {
        throw new GitHubAuthError("GITHUB_PRIVATE_REPO_UNSUPPORTED");
      }
      throw err;
    }

    throw new Error("Public repository README or metadata is unavailable.");
  }
}


/**
 * Fetches default branch of a GitHub repository
 */
export async function fetchGitHubBranch(githubUrl: string, token?: string): Promise<string> {
  const { owner, repo } = getGitHubRepositoryParts(githubUrl);

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: getGitHubHeaders(token)
  });

  if (!response.ok) {
    return "main"; // Fallback to main
  }

  const data = await response.json();
  return data.default_branch || "main";
}

/**
 * Recursively fetches a repository file tree
 */
export async function fetchGitHubRepoTree(githubUrl: string, branch: string, token?: string): Promise<{ path: string; size: number }[]> {
  const { owner, repo } = getGitHubRepositoryParts(githubUrl);

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, {
    headers: getGitHubHeaders(token)
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch repository tree: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.tree) return [];

  // Allowed code & documentation text extensions
  const textExtensions = [
    ".js", ".jsx", ".ts", ".tsx", ".py", ".go", ".rs", ".java", ".c", ".cpp", ".h", 
    ".md", ".txt", ".json", ".html", ".css", ".yaml", ".yml", ".toml", ".sh"
  ];
  
  // Folders and files to exclude from RAG embeddings
  const excludedPaths = [
    "node_modules/", ".next/", "dist/", "build/", "out/", ".git/", ".github/", 
    "yarn.lock", "package-lock.json", "pnpm-lock.yaml", ".svg", ".png", ".jpg", ".jpeg"
  ];

  interface GitHubTreeItem {
    type: string;
    path: string;
    size?: number;
  }

  return (data.tree as GitHubTreeItem[])
    .filter((item: GitHubTreeItem) => {
      if (item.type !== "blob") return false;
      const pathLower = item.path.toLowerCase();
      const isExcluded = excludedPaths.some(p => pathLower.includes(p));
      if (isExcluded) return false;
      const hasTextExtension = textExtensions.some(ext => pathLower.endsWith(ext));
      return hasTextExtension;
    })
    .map((item: GitHubTreeItem) => ({
      path: item.path,
      size: item.size || 0
    }));
}

/**
 * Downloads raw file content from GitHub raw usercontent servers
 */
export async function fetchRawFileContent(githubUrl: string, branch: string, path: string, token?: string): Promise<string> {
  const { owner, repo } = getGitHubRepositoryParts(githubUrl);

  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  const response = await fetch(rawUrl, {
    headers: getGitHubHeaders(token)
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch file content: ${response.statusText}`);
  }

  return await response.text();
}
