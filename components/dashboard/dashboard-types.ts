export type DashboardRepositoryWork = {
  id: string;
  repoName: string | null;
  repoUrl: string;
  status: "queued" | "running" | "retrying" | "cancel_requested" | "completed" | "cancelled" | "failed";
  currentStep: string | null;
  summaryAvailable: boolean;
  indexAvailable: boolean;
  errorMessage: string | null;
  updatedAt: string;
};
