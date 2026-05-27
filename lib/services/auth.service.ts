import { createClient } from "@/lib/supabase/server";


/**
 * Secures an API route by verifying the user's session and 
 * retrieving their internal Supabase user ID via an email lookup.
 * 
 * @throws {Error} 401 Unauthorized if no session or user found
 */
export async function getAuthenticatedUserId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !user.id) {
    throw new Error("Unauthorized: No active session found.");
  }

  return user.id;
}
