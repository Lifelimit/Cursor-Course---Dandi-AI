# Webhook test egress policy

Date: 2026-07-12
Status: Accepted

## Context

Account webhook test deliveries turn a user-controlled URL into a server-side outbound request. URL and DNS checks performed before a normal `fetch` are insufficient because the request can resolve the hostname again, and automatic redirects can move the request to a private service after validation.

## Decision

- Accept only HTTP and HTTPS URLs up to 2,000 characters, without embedded credentials.
- Reject localhost and any literal or resolved IPv4/IPv6 address in private, loopback, link-local, documentation, translation, tunneling, multicast, or other reserved ranges.
- Validate endpoints both when they are saved and immediately before every delivery.
- Reject a hostname if any resolved address is unsafe, then pin one validated public address into the native HTTP/HTTPS connection lookup while preserving the original hostname for HTTP Host and TLS verification.
- Never follow redirect responses.
- Bound request time and captured response size, redact sensitive response headers, and expose only stable errors.

## Consequences

DNS rebinding and redirect-based access to private services are blocked without adding a dependency or expanding service-role access. Endpoints that redirect, use embedded credentials, resolve to mixed public/private addresses, or are not resolvable at save time are rejected. DNS is checked again for every test delivery.

This policy still permits non-standard ports on public addresses. Authentication and future rate limiting remain separate abuse controls.

## Alternatives Considered

- `fetch` with manual redirects: blocks redirect following but does not bind the validated DNS result to the socket connection.
- Revalidating each followed redirect: adds complexity and still requires connection-time DNS pinning; direct webhook endpoints do not need redirects.
- A dedicated egress proxy or network firewall: stronger centralized enforcement, but it requires new infrastructure and is outside this scoped fix.
