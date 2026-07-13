# Dandi authentication experience lifecycle

Date: 2026-07-12
Status: Accepted

## Decision

Keep Supabase Auth as the sole authentication provider and use one shared split-screen `AuthExperienceShell` for interactive auth entry points and server-rendered auth states. Client components own only form interaction; server pages own session checks and route redirects.

## Route and state map

| Route | States | Success destination |
| --- | --- | --- |
| `/login` | magic-link request, password sign-in, Google OAuth, invalid credentials, provider cancellation, callback failure | safe `next`, otherwise `/dashboards` |
| `/signup` | password account creation, magic-link account creation where enabled, Google OAuth, confirmation required, existing account | safe `next`, otherwise `/dashboards` |
| `/forgot-password` | recovery request, neutral email-sent response, validation/network failure | `/reset-password` through the Supabase callback |
| `/reset-password` | recovery-session validation, expired/invalid session, password rules, mismatch, update success | safe `next`, otherwise `/dashboards` |
| `/auth/callback` | code exchange, OAuth cancellation, expired/invalid link, exchange failure | validated `next`; signup confirmation uses `/auth/success` |
| `/auth/success` | email verified, account created, missing/invalid confirmation session | `/dashboards` or explicit sign-in recovery |

Protected route requests preserve their local path and query in a validated `next` parameter when the proxy sends a visitor to `/login`.

## Redirect and security rules

- `lib/auth-utils.ts` accepts only same-origin path destinations and rejects protocol-relative URLs, backslashes, and auth-entry loops.
- Callback error pages expose only stable reason codes; provider descriptions, authorization codes, and session values are never forwarded to the UI.
- Password recovery responses remain neutral so the request flow does not disclose whether an email belongs to an account.
- Supabase browser/server clients, PKCE exchange, cookie handling, provider availability, password policy, and Account Security password updates remain unchanged.

## UX conventions

The shell preserves the established Dandi visual panel on desktop, moves the form first on mobile, and adapts only the product-story copy by state. Success and callback states use lightweight status cards, CSS motion already covered by the global reduced-motion rules, and explicit recovery actions.
