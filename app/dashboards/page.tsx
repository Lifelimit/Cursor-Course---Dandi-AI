import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./DashboardClient";
import { redirect } from "next/navigation";
import { getServerApiKeys } from "@/lib/services/server-data.service";
import { mapApiKey } from "@/types/api";

export default async function DashboardsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { keys: initialKeysRaw, plan } = await getServerApiKeys();
  const initialKeys = initialKeysRaw.map(mapApiKey);

  return <DashboardClient initialSession={user as any} initialKeys={initialKeys} initialPlan={plan} />;
}
