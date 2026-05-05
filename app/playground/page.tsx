import { createClient } from "@/lib/supabase/server";
import PlaygroundClient from "./PlaygroundClient";
import { redirect } from "next/navigation";
import { getServerApiKeys } from "@/lib/services/server-data.service";
import { mapApiKey } from "@/types/api";

export default async function PlaygroundPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const initialKeysRaw = await getServerApiKeys();
  const initialKeys = initialKeysRaw.map(mapApiKey);

  return <PlaygroundClient initialSession={session} initialKeys={initialKeys} />;
}
