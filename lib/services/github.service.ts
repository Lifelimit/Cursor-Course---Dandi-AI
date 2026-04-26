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
