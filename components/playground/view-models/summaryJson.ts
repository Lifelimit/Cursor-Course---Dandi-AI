import type { RepositoryMetadata, RepositorySummaryResult, RepositorySummaryStatus, SummaryJsonData } from "./types";

export function buildSummaryJsonData({
  githubUrl,
  repoMetadata,
  summaryResult,
  summaryStatus,
  summaryStreamMessage,
}: {
  githubUrl: string;
  repoMetadata: RepositoryMetadata | null;
  summaryResult: RepositorySummaryResult | undefined;
  summaryStatus: RepositorySummaryStatus;
  summaryStreamMessage: string;
}): SummaryJsonData {
  if (summaryStatus === "idle") {
    return { message: "No summary request has been run yet." };
  }

  if (summaryStatus === "error") {
    return { error: summaryStreamMessage || "Summary request failed." };
  }

  const body = {
    summary: summaryResult?.summary ?? "",
    cool_facts: (summaryResult?.cool_facts ?? []).filter((fact): fact is string => typeof fact === "string"),
  };

  if (githubUrl && repoMetadata) {
    return {
      body,
      headers: {
        "x-github-metadata": {
          repo: githubUrl,
          metadata: repoMetadata,
        },
      },
    };
  }

  return { body };
}
