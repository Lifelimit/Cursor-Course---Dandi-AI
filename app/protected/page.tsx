/**
 * /protected — Hidden API key validation route
 *
 * This page is intentionally excluded from all navigation (Sidebar, Navbar, CTAs).
 * It serves as a URL-only API key validation test page and as a demonstration
 * of the auth-gated architecture.
 *
 * Access: Manually navigate to /protected. Requires active session (enforced by
 * both middleware.ts protectedRoutes and this page's server-side auth check).
 *
 * If this route is no longer needed, remove it along with its middleware entry.
 */

import { createClient } from "@/lib/supabase/server";
import ProtectedClient from "./ProtectedClient";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: { session } } = await supabase.auth.getSession();

  return <ProtectedClient initialSession={session} />;
}
