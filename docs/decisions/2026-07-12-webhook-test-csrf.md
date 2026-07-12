# Webhook test delivery request protection

Date: 2026-07-12
Status: Accepted

## Context

The authenticated webhook test endpoint performs a side effect: it sends a real signed request to the user's configured receiver. The previous browser call used an empty `POST`, which allowed a cross-site HTML form to submit the action if the browser supplied the account session cookie.

## Decision

- Require an explicit JSON request body containing `confirm: true`.
- Reject requests whose `Origin` header is present but does not match the request origin.
- Keep absent `Origin` support for trusted non-browser callers, while relying on the JSON content-type requirement to prevent simple cross-site form submissions.
- Perform these request checks before authentication and rate limiting; no account data or outbound request is touched when they fail.
- Update the Account client to send the explicit same-origin JSON request.

## Consequences

The action remains a normal same-origin browser fetch, while a cross-site form cannot provide the required content type and confirmation body. Non-browser integrations must send JSON and may omit `Origin`; this is intentional because authentication still protects the route and no caller-supplied user identifier is accepted.

This is request-level CSRF protection for the test action. It does not replace the session cookie's SameSite policy or the separate rate limit and SSRF egress controls.
