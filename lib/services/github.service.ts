import { getServerEnv } from "@/lib/env";

function getGitHubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "Dandi-AI-Summarizer"
  };

  const githubToken = getServerEnv().GITHUB_TOKEN;
  if (githubToken) {
    headers["Authorization"] = githubToken.startsWith("token ") || githubToken.startsWith("Bearer ")
      ? githubToken
      : `token ${githubToken}`;
  }

  return headers;
}

/**
 * Helper function to fetch README.md from a GitHub URL
 */
export async function fetchGitHubReadme(githubUrl: string): Promise<string> {
  const url = new URL(githubUrl);
  const pathParts = url.pathname.split("/").filter(Boolean);

  if (pathParts.length < 2) {
    throw new Error("Invalid GitHub URL. Expected format: https://github.com/owner/repo");
  }

  const [owner, repo] = pathParts;

  // Primary method: Use GitHub API to automatically resolve the default branch (e.g., canary, develop)
  const headers = getGitHubHeaders();
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
      headers: getGitHubHeaders()
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
export async function fetchGitHubMetadata(githubUrl: string) {
  const url = new URL(githubUrl);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const [owner, repo] = pathParts;

  // 1. Fetch Repository Details (Stars, License)
  const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: getGitHubHeaders()
  });

  if (!repoResponse.ok) {
    throw new Error(`GitHub API Error: ${repoResponse.statusText}`);
  }

  const repoData = await repoResponse.json();

  // 2. Fetch Latest Release (Version)
  let version = "Unknown";
  try {
    const releaseResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
      headers: getGitHubHeaders()
    });
    
    if (releaseResponse.ok) {
      const releaseData = await releaseResponse.json();
      version = releaseData.tag_name;
    } else {
      // Fallback to latest tag if no official release
      const tagsResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/tags`, {
        headers: getGitHubHeaders()
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
