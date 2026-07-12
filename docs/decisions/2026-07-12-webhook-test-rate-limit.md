# Webhook test delivery rate limit

Date: 2026-07-12
Status: Accepted

## Context

The Account webhook test action performs a real server-side outbound HTTP request using a user-controlled endpoint. Endpoint validation prevents private-network targeting, but without an abuse budget an authenticated session could still repeatedly consume server connection, DNS, and egress resources or generate unwanted traffic at a configured receiver.

## Decision

- Limit webhook test deliveries to five attempts per minute.
- Scope the limiter key to the authenticated user ID so changing networks or spoofing proxy headers cannot bypass the account budget.
- Authenticate before checking the limiter, then check the limiter before reading the webhook configuration or making the outbound request.
- Return `429` when the configured budget is exhausted.
- Fail closed with a safe `503` response if Redis cannot evaluate this limiter. No outbound delivery is allowed during an unknown limiter state.
- Keep the existing fail-open behavior for routes where the shared helper is already used; those routes are outside this scoped abuse-sensitive change.

## Consequences

Legitimate users can send up to five test deliveries per minute. A Redis outage temporarily disables webhook test deliveries but protects the application and configured receivers from unbounded server-side egress. The limiter key intentionally does not use a client-supplied or proxy-derived IP value: the authenticated user ID is the authoritative abuse boundary for this browser-authenticated route.

This is an abuse budget, not a billing or usage counter. It does not replace future product-level quotas or automatic outbound webhook delivery controls.
