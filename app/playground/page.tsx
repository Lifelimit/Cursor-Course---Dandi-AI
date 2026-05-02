import { auth } from "@/auth";
import PlaygroundClient from "./PlaygroundClient";
import { redirect } from "next/navigation";
import { getServerApiKeys } from "@/lib/services/server-data.service";
import { mapApiKey } from "@/types/api";

export default async function PlaygroundPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const initialKeysRaw = await getServerApiKeys();
  const initialKeys = initialKeysRaw.map(mapApiKey);

  return <PlaygroundClient initialSession={session} initialKeys={initialKeys} />;
}
