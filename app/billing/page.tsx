import { auth } from "@/auth";
import { redirect } from "next/navigation";
import BillingClient from "./BillingClient";

export default async function BillingPage() {
  const session = await auth();
  
  if (!session) {
    redirect("/login");
  }

  return <BillingClient initialSession={session} />;
}
