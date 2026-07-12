import { createClient } from "@/lib/supabase/server";
import PlaygroundClient from "./PlaygroundClient";
import { redirect } from "next/navigation";
import { getServerApiKeys } from "@/lib/services/server-data.service";
import { mapApiKey } from "@/types/api";
import { getGitHubRepositoryParts } from "@/lib/github-url";

export default async function PlaygroundPage({ searchParams }: { searchParams: Promise<{ mode?: string; repo?: string | string[] }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { keys: initialKeysRaw, plan } = await getServerApiKeys();
  const initialKeys = initialKeysRaw?.map(mapApiKey);
  const params = await searchParams;
  const candidateRepo = typeof params.repo === "string" ? params.repo : "";
  let initialRepositoryUrl = "";
  try {
    getGitHubRepositoryParts(candidateRepo);
    initialRepositoryUrl = candidateRepo;
  } catch {
    initialRepositoryUrl = "";
  }

  return <PlaygroundClient initialUser={user} initialKeys={initialKeys} initialPlan={plan} initialRepositoryUrl={initialRepositoryUrl} />;
}
