# Remaining backlog status

Date: 2026-07-12

| Item | Current status | Evidence | Remaining gate |
| --- | --- | --- | --- |
| Webhook-secret lifecycle | Implemented | Server responses expose metadata only; new secrets are one-time and rotation is explicit. | Apply/verify the migration and exercise with an isolated account. |
| Atomic quota enforcement | Implemented | Redis Lua reservation is atomic and fail-closed; malformed results are rejected; all provider-backed IP rate-limit callers also fail closed on Redis outages. | Observe counters against a live Redis instance. |
| Stripe integrity | Implemented | Catalog/status entitlement checks, lease claims, lock tokens, RLS, and multi-subscription cancellation handling are present. | Apply the migration and run Stripe test-mode checkout/webhook flows. |
| Webhook test abuse controls | Implemented | Pinned public egress, same-origin JSON confirmation, user-scoped limiter, and fail-closed outage behavior. | Test against an isolated receiver. |
| Historical demo cleanup | Implemented | Durable `credential_type` discriminator and scoped legacy-owner cleanup migration. | Apply migration and inspect row counts in the target database. |
| GitHub public-only repository boundary | Implemented | Summary, Prepare, and Ask require a public-visibility probe and fetch content anonymously; sensitive filenames are excluded. GitHub App data is display-only and never authorizes content access. | Run the public content flows and the separate display-only GitHub App connection with isolated credentials. |
| CSP hardening | Implemented | Script/style blocks use request nonces; production policy has no `unsafe-inline`, `unsafe-eval`, or inline style attributes. Dynamic progress, tooltip, menu, modal, and animation state use SVG attributes or external CSS. | Verify the deployed response policy and browser console after deployment. |
| Production webhook delivery | Deferred | Automatic usage-threshold customer webhooks, scheduled retries, circuit breaking, and persisted delivery history are outside the current launch scope; authenticated on-demand test delivery remains available. | Approve a future delivery architecture and scheduler, then test it against an isolated receiver. |
| Legal routes | Pending approval | No fabricated legal pages or links were added. | Approved Privacy/Terms/cookie copy and canonical route names. |
| Email delivery | Implementation present; delivery unvalidated | Dandi application emails already use `nodemailer` with the `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS` integration intended for Resend SMTP. Local `SMTP_PASS` is placeholder/unusable; Vercel credentials and Supabase Auth SMTP are unverified. | After deployment is fixed, verify remote configuration presence without printing secrets, then run one isolated application-email test and one isolated Supabase Auth recovery or confirmation-email test. |
| External workflow validation | Partially validated | Repeatable redacted readiness/probe harness passes safe read-only Stripe, Google, Supabase Auth, GitHub public API, and CSP checks. | Isolated test user, Stripe mutation approval, and receiver target for on-demand test delivery; email-specific validation is tracked separately above. |

Automated repository validation currently passes lint, typecheck, all tests,
production build, and whitespace checks. Local Supabase SQL lint is not
available until a Postgres container is running.
