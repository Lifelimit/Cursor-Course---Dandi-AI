# Remaining backlog status

Date: 2026-07-12

| Item | Current status | Evidence | Remaining gate |
| --- | --- | --- | --- |
| Webhook-secret lifecycle | Implemented | Server responses expose metadata only; new secrets are one-time and rotation is explicit. | Apply/verify the migration and exercise with an isolated account. |
| Atomic quota enforcement | Implemented | Redis Lua reservation is atomic and fail-closed; malformed results are rejected; all provider-backed IP rate-limit callers also fail closed on Redis outages. | Observe counters against a live Redis instance. |
| Stripe integrity | Implemented | Catalog/status entitlement checks, lease claims, lock tokens, RLS, and multi-subscription cancellation handling are present. | Apply the migration and run Stripe test-mode checkout/webhook flows. |
| Webhook test abuse controls | Implemented | Pinned public egress, same-origin JSON confirmation, user-scoped limiter, and fail-closed outage behavior. | Test against an isolated receiver. |
| Historical demo cleanup | Implemented | Durable `credential_type` discriminator and scoped legacy-owner cleanup migration. | Apply migration and inspect row counts in the target database. |
| GitHub anonymous quota resilience | Implemented | Server token is used only after a public-visibility probe; private paths remain authorization-gated. | Run public and private GitHub flows with isolated credentials. |
| CSP hardening | Implemented | Script/style blocks use request nonces; production policy has no `unsafe-inline`, `unsafe-eval`, or inline style attributes. Dynamic progress, tooltip, menu, modal, and animation state use SVG attributes or external CSS. | Verify the deployed response policy and browser console after deployment. |
| Production webhook delivery | Implemented | Durable outbox, lock-token leases, retries/backoff, circuit breaking, versioned signing, history, retention, and cron worker. | Configure `CRON_SECRET`, apply migration, and test a real receiver. |
| Legal routes | Pending approval | No fabricated legal pages or links were added. | Approved Privacy/Terms/cookie copy and canonical route names. |
| External workflow validation | Partially validated | Repeatable redacted readiness/probe harness passes safe read-only Stripe, Google, Supabase Auth, GitHub public API, CSP, and worker-auth checks. | Isolated test user, GitHub token, usable SMTP sandbox, Stripe mutation approval, and receiver target. |

Automated repository validation currently passes lint, typecheck, all tests,
production build, and whitespace checks. Local Supabase SQL lint is not
available until a Postgres container is running.
