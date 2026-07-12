import { createClient } from "@/lib/supabase/server";
import type { Session, User } from "@supabase/supabase-js";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Rebuild the browser-facing session with a user that was verified by Auth.
 * Supabase explicitly warns against trusting the user projection returned by
 * getSession(), because that projection comes from the cookie storage layer.
 */
export async function getVerifiedSession(
  supabase: ServerSupabaseClient,
  verifiedUser?: User | null,
): Promise<Session | null> {
  const user = verifiedUser ?? (await supabase.auth.getUser()).data.user;
  if (!user) return null;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  return {
    access_token: session.access_token,
    token_type: session.token_type,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    refresh_token: session.refresh_token,
    provider_token: session.provider_token,
    provider_refresh_token: session.provider_refresh_token,
    user,
  };
}


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
