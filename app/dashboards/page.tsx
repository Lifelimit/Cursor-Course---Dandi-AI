import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./DashboardClient";
import { redirect } from "next/navigation";
import { getServerUsageData } from "@/lib/services/server-data.service";
import { listRecentIngestionJobs } from "@/lib/services/ingestion-job.service";
import { mapApiKey } from "@/types/api";

export default async function DashboardsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const usageData = await getServerUsageData();
  const initialKeys = (usageData?.keys || []).map(mapApiKey);
  const initialHasSuccessfulRepositoryAnalysis = Boolean(
    (usageData?.totalUsage || 0) > 0 || (usageData?.globalTopRepos?.length || 0) > 0
  );

  let initialHasAskedRepository = false;
  try {
    const recentIngestionJobs = await listRecentIngestionJobs({ userId: user.id, limit: 20 });
    initialHasAskedRepository = recentIngestionJobs.some((job) => job.status === "completed");
  } catch {
    initialHasAskedRepository = false;
  }

  return (
    <DashboardClient 
      initialUser={user} 
      initialKeys={initialKeys} 
      initialPlan={usageData?.plan || "Hobby"} 
      initialAvgLatency={usageData?.avgLatency || 0}
      initialSuccessRate={usageData?.successRate || 100}
      initialResetDate={usageData?.resetDate || null}
      initialHasSuccessfulRepositoryAnalysis={initialHasSuccessfulRepositoryAnalysis}
      initialHasAskedRepository={initialHasAskedRepository}
    />
  );
}
