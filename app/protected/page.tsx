import { auth } from "@/auth";
import ProtectedClient from "./ProtectedClient";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return <ProtectedClient initialSession={session} />;
}
