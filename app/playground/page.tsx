import { createClient } from "@/lib/supabase/server";
import PlaygroundClient from "./PlaygroundClient";
import { redirect } from "next/navigation";
import { getServerApiKeys } from "@/lib/services/server-data.service";
import { mapApiKey } from "@/types/api";

export default async function PlaygroundPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { keys: initialKeysRaw } = await getServerApiKeys();
  const initialKeys = initialKeysRaw.map(mapApiKey);

  return <PlaygroundClient initialSession={user as any} initialKeys={initialKeys} />;
}
