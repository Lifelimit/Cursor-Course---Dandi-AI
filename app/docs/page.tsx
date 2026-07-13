import { createClient } from "@/lib/supabase/server";
import DocsClient from "./DocsClient";
import { getVerifiedSession } from "@/lib/services/auth.service";
import { getServerApiKeys } from "@/lib/services/server-data.service";
import { mapApiKey } from "@/types/api";

export default async function DocsPage() {
  const supabase = await createClient();
  const session = await getVerifiedSession(supabase);

  if (!session) {
    return <DocsClient initialSession={null} />;
  }

  const { keys: initialKeysRaw, plan } = await getServerApiKeys();
  const initialKeys = initialKeysRaw?.map(mapApiKey);

  return <DocsClient initialSession={session} initialKeys={initialKeys} initialPlan={plan} />;
}
