import { getServerEnv } from "@/lib/env";
import { getGitHubRepositoryParts } from "@/lib/github-url";

export class GitHubAuthError extends Error {
  constructor(
    public code: "GITHUB_PRIVATE_REPO_NOT_CONNECTED" | "GITHUB_PRIVATE_REPO_NOT_GRANTED" | "GITHUB_PRIVATE_REPO_TOKEN_FAILED" | "GITHUB_REPO_NOT_FOUND",
    message?: string
  ) {
    super(message || code);
    this.name = "GitHubAuthError";
  }
}

function getGitHubHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "Dandi-AI-Summarizer"
  };

  if (token) {
    headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
  } else {
    const githubToken = getServerEnv().GITHUB_TOKEN;
    if (githubToken) {
      headers["Authorization"] = githubToken.startsWith("token ") || githubToken.startsWith("Bearer ")
        ? githubToken
        : `token ${githubToken}`;
    }
  }

  return headers;
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

/**
 * Fetches repository metadata (stars, license, version) from the GitHub API
 */
export async function fetchGitHubMetadata(githubUrl: string, token?: string) {
  const { owner, repo } = getGitHubRepositoryParts(githubUrl);

  // 1. Fetch Repository Details (Stars, License)
  const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: getGitHubHeaders(token)
  });

  if (!repoResponse.ok) {
    throw new Error(`GitHub API Error: ${repoResponse.statusText}`);
  }

  const repoData = await repoResponse.json();

  // 2. Fetch Latest Release (Version)
  let version = "Unknown";
  try {
    const releaseResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
      headers: getGitHubHeaders(token)
    });
    
    if (releaseResponse.ok) {
      const releaseData = await releaseResponse.json();
      version = releaseData.tag_name;
    } else {
      // Fallback to latest tag if no official release
      const tagsResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/tags`, {
        headers: getGitHubHeaders(token)
      });
      if (tagsResponse.ok) {
        const tagsData = await tagsResponse.json();
        if (tagsData.length > 0) version = tagsData[0].name;
      }
    }
  } catch (err) {
    console.error("Failed to fetch version:", err);
  }

  return {
    stars: repoData.stargazers_count,
    license: repoData.license?.spdx_id || repoData.license?.name || "None",
    version: version,
    forks: repoData.forks_count,
    description: repoData.description
  };
}

/**
 * Fetches repository data, checking for public access first, then falling back to private access if authorized.
 */
export async function fetchRepositoryDataWithAuth(input: {
  githubUrl: string;
  userId: string | null;
}) {
  const { owner, repo } = getGitHubRepositoryParts(input.githubUrl);
  const repoFullName = `${owner}/${repo}`;

  // 1. Attempt public fetch first
  try {
    const [readmeContent, metadata] = await Promise.all([
      fetchGitHubReadme(input.githubUrl),
      fetchGitHubMetadata(input.githubUrl)
    ]);
    return { readmeContent, metadata };
  } catch {
    // 2. Public fetch failed. Resolve access for private retry
    const { resolveGitHubRepoAccessForSummary } = await import("./github-app.service");
    const access = await resolveGitHubRepoAccessForSummary({
      userId: input.userId,
      repoFullName,
    });

    if (!access.authorized) {
      throw new GitHubAuthError(
        access.errorCode,
        access.errorCode === "GITHUB_PRIVATE_REPO_TOKEN_FAILED" ? access.details : undefined
      );
    }

    // 3. Retry fetching with the installation token
    try {
      const [readmeContent, metadata] = await Promise.all([
        fetchGitHubReadme(input.githubUrl, access.token),
        fetchGitHubMetadata(input.githubUrl, access.token)
      ]);
      return { readmeContent, metadata };
    } catch (privateErr) {
      console.error("Fetch with installation token failed:", privateErr);
      throw new GitHubAuthError(
        "GITHUB_PRIVATE_REPO_TOKEN_FAILED",
        privateErr instanceof Error ? privateErr.message : String(privateErr)
      );
    }
  }
}


/**
 * Fetches default branch of a GitHub repository
 */
export async function fetchGitHubBranch(githubUrl: string): Promise<string> {
  const { owner, repo } = getGitHubRepositoryParts(githubUrl);

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: getGitHubHeaders()
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
export async function fetchGitHubRepoTree(githubUrl: string, branch: string): Promise<{ path: string; size: number }[]> {
  const { owner, repo } = getGitHubRepositoryParts(githubUrl);

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, {
    headers: getGitHubHeaders()
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
export async function fetchRawFileContent(githubUrl: string, branch: string, path: string): Promise<string> {
  const { owner, repo } = getGitHubRepositoryParts(githubUrl);

  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  const response = await fetch(rawUrl, {
    headers: getGitHubHeaders()
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch file content: ${response.statusText}`);
  }

  return await response.text();
}
