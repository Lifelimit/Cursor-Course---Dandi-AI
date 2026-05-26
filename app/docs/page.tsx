import { createClient } from "@/lib/supabase/server";
import DocsClient from "./DocsClient";

export default async function DocsPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  return <DocsClient initialSession={session} />;
}
