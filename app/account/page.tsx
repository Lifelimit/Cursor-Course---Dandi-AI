import { createClient } from "@/lib/supabase/server";
import AccountClient from "./AccountClient";
import { redirect } from "next/navigation";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: { session } } = await supabase.auth.getSession();

  return <AccountClient initialSession={session} />;
}
