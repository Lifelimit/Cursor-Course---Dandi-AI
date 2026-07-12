import { createClient } from "@/lib/supabase/server";
import { DEFAULT_AUTH_REDIRECT, getSafeAuthRedirect } from "@/lib/auth-utils";
import { NextResponse } from "next/server";

function authFailureRedirect(origin: string, reason: string, next: string) {
  const destination = new URL("/login", origin);
  destination.searchParams.set("error", "auth-failed");
  destination.searchParams.set("reason", reason);
  if (next !== DEFAULT_AUTH_REDIRECT) destination.searchParams.set("next", next);
  return NextResponse.redirect(destination);
}

export async function GET(request: Request) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the SSR package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeAuthRedirect(requestUrl.searchParams.get("next"));
  const flow = requestUrl.searchParams.get("flow") === "signup" ? "signup" : null;
  const returnTo = getSafeAuthRedirect(requestUrl.searchParams.get("returnTo"));
  const recoveryDestination =
    (next === "/reset-password" || next === "/auth/success") && returnTo !== DEFAULT_AUTH_REDIRECT
      ? returnTo
      : next;

  if (requestUrl.searchParams.has("error") && !code) {
    const reason = requestUrl.searchParams.get("error_code") === "otp_expired"
      ? "link-expired"
      : requestUrl.searchParams.get("error") === "access_denied"
        ? "oauth-canceled"
        : "callback-failed";
    return authFailureRedirect(requestUrl.origin, reason, recoveryDestination);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const destination = new URL(next, requestUrl.origin);
      if (flow) destination.searchParams.set("flow", flow);
      if ((next === "/reset-password" || next === "/auth/success") && returnTo !== DEFAULT_AUTH_REDIRECT) {
        destination.searchParams.set("next", returnTo);
      }
      return NextResponse.redirect(destination);
    }
  }

  return authFailureRedirect(requestUrl.origin, "callback-failed", recoveryDestination);
}
