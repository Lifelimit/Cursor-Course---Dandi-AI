import { getURL } from "@/lib/utils/url-helper";

export const DEFAULT_AUTH_REDIRECT = "/dashboards";

const AUTH_ENTRY_ROUTES = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/auth/callback",
]);

/**
 * Accept only same-origin, path-based destinations for auth redirects.
 * This intentionally rejects protocol-relative URLs and auth entry points so
 * failed or completed auth flows cannot create an open redirect or a loop.
 */
export function getSafeAuthRedirect(
  next: string | null | undefined,
  fallback = DEFAULT_AUTH_REDIRECT,
) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return fallback;
  }

  try {
    const url = new URL(next, getURL());
    if (url.origin !== new URL(getURL()).origin || AUTH_ENTRY_ROUTES.has(url.pathname)) {
      return fallback;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function getAuthCallbackUrl(next: string, extraParams?: Record<string, string>) {
  const url = new URL("/auth/callback", getURL());
  url.searchParams.set("next", getSafeAuthRedirect(next));

  for (const [key, value] of Object.entries(extraParams ?? {})) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

export function getAuthFailureReason(value: string | null | undefined) {
  switch (value) {
    case "oauth-canceled":
    case "link-expired":
    case "invalid-link":
    case "callback-failed":
    case "session-expired":
    case "network":
      return value;
    default:
      return "auth-failed" as const;
  }
}

export type AuthFailureReason = ReturnType<typeof getAuthFailureReason>;
