import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./DashboardClient";
import { redirect } from "next/navigation";
import { getServerUsageData } from "@/lib/services/server-data.service";
import { listRecentIngestionJobs } from "@/lib/services/ingestion-job.service";
import { getPrimaryGitHubInstallationForUserWithClient } from "@/lib/services/github-app.service";
import type { UsageData } from "@/types/usage";
import type { DashboardRepositoryWork } from "@/components/dashboard/dashboard-types";

function getGreeting(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [usageData, profileResult, recentIngestionJobs] = await Promise.all([
    getServerUsageData({ includeBilling: false }),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    listRecentIngestionJobs({ userId: user.id, limit: 12 }).catch(() => []),
  ]);

  let githubConnected: boolean | null = null;
  try {
    githubConnected = Boolean(await getPrimaryGitHubInstallationForUserWithClient({
      db: supabase,
      userId: user.id,
    }));
  } catch {
    // Keep this distinct from a confirmed disconnected state.
    githubConnected = null;
  }

  const recentWork: DashboardRepositoryWork[] = recentIngestionJobs.map((job) => ({
    id: job.id,
    repoName: job.repo_name,
    repoUrl: job.repo_url,
    status: job.status,
    currentStep: job.current_step,
    summaryAvailable: Boolean(job.summary_available),
    indexAvailable: Boolean(job.index_available) || job.status === "completed",
    // Keep provider/database details server-side; the dashboard only needs a recovery state.
    errorMessage: job.status === "failed" ? "Dandi could not complete this repository workflow." : null,
    updatedAt: job.updated_at,
  }));

  const initialUsageData: UsageData | null = usageData
    ? {
        plan: usageData.plan,
        totalUsage: usageData.totalUsage,
        keys: usageData.keys,
        globalTopRepos: usageData.globalTopRepos,
        activeRepositoryCount: usageData.activeRepositoryCount,
        resetDate: usageData.resetDate,
        nextInvoiceDate: usageData.nextInvoiceDate,
        avgLatency: usageData.avgLatency,
        successRate: usageData.successRate,
        dailyAnalytics: usageData.dailyAnalytics,
      }
    : null;

  const hasRepositoryActivity = Boolean(
    usageData?.globalTopRepos?.length || recentWork.some((work) => work.summaryAvailable || work.status === "completed"),
  );
  const hasIndexedRepository = recentWork.some((work) => work.indexAvailable);

  return (
    <DashboardClient
      initialUser={user}
      initialDisplayName={profileResult.data?.full_name || null}
      initialGreeting={getGreeting(new Date())}
      initialUsageData={initialUsageData}
      initialRecentWork={recentWork}
      initialGithubConnected={githubConnected}
      initialHasRepositoryActivity={hasRepositoryActivity}
      initialHasIndexedRepository={hasIndexedRepository}
    />
  );
}
