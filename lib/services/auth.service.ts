import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Secures an API route by verifying the user's session and 
 * retrieving their internal Supabase user ID via an email lookup.
 * 
 * @throws {Error} 401 Unauthorized if no session or user found
 */
export async function getAuthenticatedUserId(): Promise<string> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const email = session?.user?.email;

  if (!email) {
    throw new Error("Unauthorized: No active session found.");
  }

  // Perform the mandatory database lookup to get the internal ID
  // as per the course security requirements.
  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (error || !profile) {
    console.error("AuthService: User lookup failed for email:", email, error);
    throw new Error("Unauthorized: User profile not found in database.");
  }

  return profile.id;
}
