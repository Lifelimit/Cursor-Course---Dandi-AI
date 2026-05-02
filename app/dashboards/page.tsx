import { auth } from "@/auth";
import DashboardClient from "./DashboardClient";
import { redirect } from "next/navigation";
import { getServerApiKeys } from "@/lib/services/server-data.service";
import { mapApiKey } from "@/types/api";

export default async function DashboardsPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const initialKeysRaw = await getServerApiKeys();
  const initialKeys = initialKeysRaw.map(mapApiKey);

  return <DashboardClient initialSession={session} initialKeys={initialKeys} />;
}
