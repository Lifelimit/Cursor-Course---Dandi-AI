import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import UsageClient from "@/app/usage/UsageClient";
import { getServerUsageData } from "@/lib/services/server-data.service";
import { getVerifiedSession } from "@/lib/services/auth.service";

export default async function UsagePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/login");
  }

  const session = await getVerifiedSession(supabase, user);
  const usageData = await getServerUsageData({ includeBilling: false });

  return <UsageClient initialSession={session} initialData={usageData} />;
}
