import { auth } from "@/auth";
import { redirect } from "next/navigation";
import UsageClient from "./UsageClient";

export default async function UsagePage() {
  const session = await auth();
  
  if (!session) {
    redirect("/login");
  }

  return <UsageClient initialSession={session} />;
}
