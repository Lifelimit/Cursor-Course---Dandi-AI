import { auth } from "@/auth";
import { redirect } from "next/navigation";
import UsageClient from "@/app/usage/UsageClient";
import { getServerUsageData } from "@/lib/services/server-data.service";

export default async function UsagePage() {
  const session = await auth();
  
  if (!session) {
    redirect("/login");
  }

  const usageData = await getServerUsageData();

  return <UsageClient initialSession={session} initialData={usageData} />;
}
