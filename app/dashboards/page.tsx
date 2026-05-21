import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./DashboardClient";
import { redirect } from "next/navigation";
import { getServerUsageData } from "@/lib/services/server-data.service";
import { mapApiKey } from "@/types/api";

export default async function DashboardsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const usageData = await getServerUsageData();
  const initialKeys = (usageData?.keys || []).map(mapApiKey);

  return (
    <DashboardClient 
      initialUser={user} 
      initialKeys={initialKeys} 
      initialPlan={usageData?.plan || "Hobby"} 
      initialAvgLatency={usageData?.avgLatency || 0}
      initialSuccessRate={usageData?.successRate || 100}
      initialResetDate={usageData?.resetDate || null}
    />
  );
}
