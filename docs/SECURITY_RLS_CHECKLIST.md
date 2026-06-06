# Security And RLS Checklist

Use this checklist for Supabase, auth, account boundaries, storage, secrets, billing, usage, and any route that reads or mutates user-owned data.

## Supabase Client Boundaries

- Browser code uses only public, scoped Supabase clients.
- Server user flows use the existing server client that carries the user's session.
- `supabaseAdmin` and service-role keys stay server-only and are reserved for trusted operations that intentionally bypass RLS.
- Never import admin clients into client components, hooks, browser utilities, or modules that may be bundled for the browser.

## RLS Policy Checks

- Every user-owned table has RLS enabled.
- Policies bind rows to the authenticated user, account, team, or tenant that owns the data.
- Mutations include ownership checks for `insert`, `update`, and `delete`, not only `select`.
- Joins, views, RPCs, counts, and aggregate queries cannot leak rows across accounts.
- Error messages, missing-row behavior, and counts do not reveal another user's data.
- Storage buckets and signed URLs follow the same ownership model as database rows.
- Migrations include policy changes with schema changes when new tables or columns affect access.

## Route And Service Checks

- Route handlers authenticate before reading or mutating protected data.
- User identity comes from the server session, not from the client body.
- Route handlers verify that path params, query params, and body IDs belong to the authenticated user or account.
- Billing and webhook routes separate user-initiated requests from provider-signed server-to-server events.
- Usage counters enforce rate limits and quotas on the server side.
- AI/RAG routes check repository ownership and document scope before ingestion, retrieval, or generation.

## Secret And Privacy Checks

- Do not log secrets, tokens, API keys, provider payloads, repository content, prompts, embeddings, billing details, or raw user data.
- Redact sensitive values in errors, tests, docs, screenshots, and fixtures.
- Keep environment variable names explicit and avoid fallback behavior that silently disables security.
- Do not expose policy internals or provider debug details in browser-visible responses.

## Test Expectations

- Add focused tests for authorization bypass risks, ownership filters, input validation, and sensitive error handling when code changes touch those paths.
- For RLS or migration changes, include manual SQL verification steps or migration validation notes when automated coverage is not practical.
- Run `yarn lint`, `yarn typecheck`, and the narrow relevant tests before pushing.

## Stop Conditions

Stop and ask for security review or explicit approval when a change bypasses RLS, expands service-role usage, changes ownership semantics, changes billing trust boundaries, stores new sensitive data, logs protected data, or introduces a new external provider.
