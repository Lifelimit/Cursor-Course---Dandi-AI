import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import UsageClient from "@/app/usage/UsageClient";
import { getServerUsageSummaryData } from "@/lib/services/server-data.service";

export default async function UsagePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/login");
  }

  const { data: { session } } = await supabase.auth.getSession();
  const usageData = await getServerUsageSummaryData();

  return <UsageClient initialSession={session} initialData={usageData} />;
}
