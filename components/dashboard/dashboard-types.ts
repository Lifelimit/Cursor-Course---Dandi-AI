export type DashboardRepositoryWork = {
  id: string;
  repoName: string | null;
  repoUrl: string;
  status: "queued" | "running" | "completed" | "failed";
  currentStep: string | null;
  summaryAvailable: boolean;
  indexAvailable: boolean;
  errorMessage: string | null;
  updatedAt: string;
};
