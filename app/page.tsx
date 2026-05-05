import { createClient } from "@/lib/supabase/server";
import LandingClient from "./LandingClient";

export default async function Home() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return <LandingClient initialSession={session} />;
}
