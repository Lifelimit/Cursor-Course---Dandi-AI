/**
 * /protected — Hidden API key validation route
 *
 * This page is intentionally excluded from all navigation (Sidebar, Navbar, CTAs).
 * It serves as a manual API key validation test page and as a demonstration
 * of the auth-gated architecture.
 *
 * Access: Manually navigate to /protected, then paste a key into the form.
 * Requires an active session (enforced by proxy.ts protected-route checks and
 * this page's server-side auth check).
 *
 * If this route is no longer needed, remove it along with its proxy.ts entry.
 */

import { createClient } from "@/lib/supabase/server";
import ProtectedClient from "./ProtectedClient";
import { redirect } from "next/navigation";
import { getVerifiedSession } from "@/lib/services/auth.service";

export default async function ProtectedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const session = await getVerifiedSession(supabase, user);

  return <ProtectedClient initialSession={session} />;
}
