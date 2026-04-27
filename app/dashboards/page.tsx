import { auth } from "@/auth";
import DashboardClient from "./DashboardClient";
import { redirect } from "next/navigation";

export default async function DashboardsPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return <DashboardClient initialSession={session} />;
}
