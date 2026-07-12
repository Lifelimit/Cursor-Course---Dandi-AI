import { createClient } from "@/lib/supabase/server";
import AccountClient from "./AccountClient";
import { redirect } from "next/navigation";
import { getVerifiedSession } from "@/lib/services/auth.service";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const session = await getVerifiedSession(supabase, user);

  return <AccountClient initialSession={session} />;
}
