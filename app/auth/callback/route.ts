import { DEFAULT_AUTH_REDIRECT, getSafeAuthRedirect, isPasswordResetRoute, PASSWORD_RESET_ROUTE, RECOVERY_COOKIE_NAME } from "@/lib/auth-utils";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function authFailureRedirect(origin: string, reason: string, next: string) {
  const destination = new URL("/login", origin);
  destination.searchParams.set("error", "auth-failed");
  destination.searchParams.set("reason", reason);
  if (next !== DEFAULT_AUTH_REDIRECT) destination.searchParams.set("next", next);
  return NextResponse.redirect(destination);
}

function recoveryFailureRedirect(origin: string, reason: string, next: string) {
  const destination = new URL(PASSWORD_RESET_ROUTE, origin);
  destination.searchParams.set("error", reason);
  if (next !== DEFAULT_AUTH_REDIRECT) destination.searchParams.set("next", next);
  return NextResponse.redirect(destination);
}

function recoverySuccessRedirect(origin: string, next: string, secure: boolean) {
  const destination = new URL(PASSWORD_RESET_ROUTE, origin);
  if (next !== DEFAULT_AUTH_REDIRECT) destination.searchParams.set("next", next);
  const response = NextResponse.redirect(destination);
  response.cookies.set({
    name: RECOVERY_COOKIE_NAME,
    value: "1",
    httpOnly: true,
    maxAge: 15 * 60,
    path: PASSWORD_RESET_ROUTE,
    sameSite: "lax",
    secure,
  });
  return response;
}

export async function GET(request: Request) {
  // The `/auth/callback` route exchanges the PKCE code used by the SSR auth flow.
  // Recovery links use the same exchange, but receive a short-lived marker so the
  // reset page can distinguish recovery from an ordinary signed-in session.
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedNext = requestUrl.searchParams.get("next");
  const next = getSafeAuthRedirect(requestedNext);
  const flow = requestUrl.searchParams.get("flow") === "signup" ? "signup" : null;
  const returnTo = getSafeAuthRedirect(requestUrl.searchParams.get("returnTo"));
  const recoveryRequest = requestUrl.searchParams.get("flow") === "recovery" || isPasswordResetRoute(requestedNext) || requestUrl.searchParams.get("type") === "recovery";
  const recoveryDestination = recoveryRequest && !isPasswordResetRoute(returnTo) ? returnTo : DEFAULT_AUTH_REDIRECT;
  const callbackFailureReason = requestUrl.searchParams.get("error_code") === "otp_expired" ? "link-expired" : "invalid-link";

  if (requestUrl.searchParams.has("error") && !code) {
    if (recoveryRequest) return recoveryFailureRedirect(requestUrl.origin, callbackFailureReason, recoveryDestination);
    const reason = requestUrl.searchParams.get("error_code") === "otp_expired"
      ? "link-expired"
      : requestUrl.searchParams.get("error") === "access_denied"
        ? "oauth-canceled"
        : "callback-failed";
    return authFailureRedirect(requestUrl.origin, reason, next);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (recoveryRequest) return recoverySuccessRedirect(requestUrl.origin, recoveryDestination, requestUrl.protocol === "https:");
      const destination = new URL(next, requestUrl.origin);
      if (flow) destination.searchParams.set("flow", flow);
      if (next === "/auth/success" && returnTo !== DEFAULT_AUTH_REDIRECT) destination.searchParams.set("next", returnTo);
      return NextResponse.redirect(destination);
    }
  }

  // Support dashboard templates configured for token_hash delivery without ever
  // forwarding the one-time token to the browser or error UI.
  const tokenHash = requestUrl.searchParams.get("token_hash");
  if (tokenHash && recoveryRequest) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
    if (!error) return recoverySuccessRedirect(requestUrl.origin, recoveryDestination, requestUrl.protocol === "https:");
  }

  if (recoveryRequest) return recoveryFailureRedirect(requestUrl.origin, "invalid-link", recoveryDestination);
  return authFailureRedirect(requestUrl.origin, "callback-failed", next);
}
