/**
 * /protected — Hidden API key validation route
 *
 * This page is intentionally excluded from all navigation (Sidebar, Navbar, CTAs).
 * It serves as a manual API key validation test page and as a demonstration
 * of the auth-gated architecture.
 *
 * Access: Manually navigate to /protected, then paste a key into the form.
 * Requires an active session (enforced by
 * both middleware.ts protectedRoutes and this page's server-side auth check).
 *
 * If this route is no longer needed, remove it along with its middleware entry.
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
