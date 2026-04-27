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
  const branches = ["main", "master"];

  for (const branch of branches) {
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`;
    const response = await fetch(rawUrl);

    if (response.ok) {
      return await response.text();
    }
  }

  throw new Error("Could not find README.md in the 'main' or 'master' branches.");
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
    headers: {
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "Dandi-AI-Summarizer"
    }
  });

  if (!repoResponse.ok) {
    throw new Error(`GitHub API Error: ${repoResponse.statusText}`);
  }

  const repoData = await repoResponse.json();

  // 2. Fetch Latest Release (Version)
  let version = "Unknown";
  try {
    const releaseResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
      headers: {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Dandi-AI-Summarizer"
      }
    });
    
    if (releaseResponse.ok) {
      const releaseData = await releaseResponse.json();
      version = releaseData.tag_name;
    } else {
      // Fallback to latest tag if no official release
      const tagsResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/tags`, {
        headers: {
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "Dandi-AI-Summarizer"
        }
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
