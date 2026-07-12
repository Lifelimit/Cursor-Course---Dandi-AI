import { createClient } from "@/lib/supabase/server";
import LandingClient from "./LandingClient";
import { getVerifiedSession } from "@/lib/services/auth.service";

export default async function Home() {
  const supabase = await createClient();
  const session = await getVerifiedSession(supabase);
  return <LandingClient initialSession={session} />;
}
