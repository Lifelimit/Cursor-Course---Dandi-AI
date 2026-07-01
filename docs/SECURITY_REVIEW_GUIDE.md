# Security Review Guide

Use this guide as the central checklist for security-sensitive Dandi reviews. It does not replace the focused guardrails in `docs/ROUTE_HANDLER_RULES.md`, `docs/SECURITY_RLS_CHECKLIST.md`, `docs/AI_RAG_GUARDRAILS.md`, or `docs/TESTING_POLICY.md`; use those documents for the detailed rules in their domains.

## When To Use This Guide

Run a security review before Sensitive or Critical work, and use it again after implementation when the change touches authentication, authorization, Supabase, RLS, service-role access, route handlers, webhooks, billing, API keys, usage quotas, rate limits, Redis, GitHub App/private repository access, AI/RAG, logging, CSP, CORS, environment variables, secrets, or tokens.

Classify work as:

- Normal: UI, copy, local component, or docs changes that do not affect trust boundaries.
- Sensitive: route handlers, auth, Supabase, RLS, billing, API keys, webhooks, GitHub App, AI/RAG, logging, rate limits, CSP, CORS, cache behavior, environment variables, secrets, or tokens.
- Critical: tenant isolation, service-role expansion, private repository access, webhook trust, billing trust boundaries, or secret storage.

## Review Doctrine

Security reviews should report only confirmed, actionable issues. Do not invent speculative findings. If a risk depends on missing context, list it as an open question with the evidence needed to resolve it.

For each confirmed finding, include severity, file/line evidence, what is wrong, why it matters, concrete fix, and suggested test.

## Auth And Authorization

- Protected routes authenticate before reading or mutating user data.
- User, account, tenant, repository, Stripe, usage, and billing identifiers come from trusted server-side context or are verified against it.
- Client-supplied ownership, billing, quota, or repository values never create authority.
- Unauthorized, forbidden, and missing-resource responses do not leak the existence of another user's data.
- Hidden diagnostic routes, including `/protected`, remain auth-gated and are not linked into public navigation.

## Supabase, RLS, And Service Role

Use `docs/SECURITY_RLS_CHECKLIST.md` for detailed Supabase checks.

- Browser code imports only browser-safe Supabase clients.
- Server user flows use the session-aware server client.
- `supabaseAdmin` and service-role keys stay server-only and are limited to trusted server-to-server flows.
- RLS policies enforce user, account, team, or tenant boundaries for reads and mutations.
- Joins, views, RPCs, counts, aggregates, storage paths, and signed URLs cannot leak cross-tenant information.
- New schema or ownership changes include matching RLS and validation notes.

## API Routes And Input Handling

Use `docs/ROUTE_HANDLER_RULES.md` for route-handler specifics.

- Route handlers parse request bodies once and return safe `400` responses for malformed JSON.
- Params, query values, headers, and bodies are validated before use.
- Auth and authorization happen before protected reads, writes, provider calls, or expensive operations.
- Expected failures map to safe status codes and safe messages.
- Raw stack traces, SQL errors, provider payloads, policy internals, and debug details are not browser-visible.

## Secrets, Tokens, And Error Leakage

- Secrets, API keys, webhook secrets, service-role keys, provider tokens, repository tokens, and refresh tokens never appear in client bundles, logs, screenshots, docs, fixtures, or browser-visible errors.
- Secret storage has an explicit owner, retention model, rotation expectation, and access boundary.
- Environment variable fallbacks do not silently disable security.
- Test fixtures and examples use fake values that cannot be mistaken for real credentials.

## Logging And Redaction

- Logs contain operational metadata only when sensitive content and identifiers are redacted.
- Do not log repository contents, prompts, retrieved chunks, embeddings, billing details, raw user data, provider payloads, or secrets.
- Error reporting keeps enough context to debug without exposing protected data.

## Rate Limits, Quotas, And Redis Outages

- Expensive routes enforce server-side rate limits and quotas before provider calls or durable writes.
- Redis-backed hot paths define outage behavior: fail closed for abuse-sensitive paths, or use an explicit degraded mode when product-safe.
- Usage counters, durable Supabase records, and billing state stay consistent through explicit service boundaries.
- `429` responses are safe and do not reveal sensitive usage data.

## Stripe Billing And Webhooks

- User-initiated billing routes and provider-signed webhook routes stay separate.
- Stripe webhook handlers verify signatures before trusting payloads.
- Billing entitlement, plan, invoice, subscription, customer, and payment-method state is not trusted from client input.
- Webhook idempotency, replay behavior, and failure logging do not leak customer or payment details.

## GitHub App And Private Repository Access

- Private repository access is scoped to the authenticated installation, account, user, and repository.
- Installation IDs, repository IDs, branches, file paths, and provider responses are verified before use.
- Repository contents and metadata are treated as user data.
- Access tokens and provider payloads are server-only and redacted from logs and errors.

## AI And RAG

Use `docs/AI_RAG_GUARDRAILS.md` for detailed AI/RAG checks.

- Ingestion, retrieval, prompt construction, embeddings, completions, and summaries stay within the authorized user/account/repository scope.
- Retrieved repository content is treated as untrusted input and cannot override system, developer, security, billing, or access-control rules.
- Prompts, retrieved chunks, embeddings, provider traces, and generated outputs are not exposed unless the product intentionally displays them.
- Provider calls have quota, rate-limit, timeout, validation, and failure handling appropriate to the route.

## CSP, CORS, And Cache Headers

- CORS allows only intended origins, methods, and headers.
- CSP changes do not weaken script, connect, frame, image, or style boundaries without a documented reason.
- Authenticated, billing, usage, API key, repository, and RAG responses are dynamic or cache-isolated by user/account/tenant.
- Cache keys and invalidation plans are explicit for any cached protected data.

## Required Tests And Validation

Use `docs/TESTING_POLICY.md` to choose validation.

Security-sensitive changes should include focused tests or manual verification for:

- allowed and denied authorization cases
- ownership and tenant isolation
- malformed JSON and input validation
- rate-limit and quota enforcement
- webhook signature and idempotency behavior
- safe error messages and redaction
- RLS policies, migrations, and service-role usage where applicable
- AI/RAG ingestion and retrieval scope where applicable

Documentation-only changes normally do not require app validation. TypeScript, route, service, Supabase, billing, usage, and AI/RAG changes require the relevant Yarn checks from `package.json`.
