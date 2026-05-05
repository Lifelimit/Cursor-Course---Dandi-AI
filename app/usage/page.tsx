import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import UsageClient from "@/app/usage/UsageClient";
import { getServerUsageData } from "@/lib/services/server-data.service";

export default async function UsagePage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    redirect("/login");
  }

  const usageData = await getServerUsageData();

  return <UsageClient initialSession={session} initialData={usageData} />;
}
