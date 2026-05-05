import { createClient } from "@/lib/supabase/server";
import ProtectedClient from "./ProtectedClient";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  return <ProtectedClient initialSession={session} />;
}
