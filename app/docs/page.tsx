import { createClient } from "@/lib/supabase/server";
import DocsClient from "./DocsClient";
import { getVerifiedSession } from "@/lib/services/auth.service";

export default async function DocsPage() {
  const supabase = await createClient();
  const session = await getVerifiedSession(supabase);
  
  return <DocsClient initialSession={session} />;
}
