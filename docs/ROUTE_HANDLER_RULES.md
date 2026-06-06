# Route Handler Rules

Use this document for `app/**/route.ts` work. Before changing route handlers, caching, request APIs, middleware, proxy behavior, or route segment config, read the relevant installed Next.js guide in `node_modules/next/dist/docs/`.

## Local Next.js Notes

- Route handlers are App Router `route.ts` files inside `app/`.
- A route segment cannot have both `page.tsx` and `route.ts` at the same level.
- Supported methods are `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, and `OPTIONS`.
- Route handler `params` are asynchronous in this Next.js version. Await them or use the generated `RouteContext` helper when appropriate.
- Route handlers are not cached by default. `GET` handlers can opt into caching, but never cache request-specific, user-specific, auth-specific, billing, usage, or RAG responses unless the cache key and invalidation model are explicit.

## Handler Shape

- Keep handlers small and ordered: method export, request parsing, auth, validation, service call, response mapping.
- Prefer `NextRequest` when using `nextUrl`, cookies, or request helpers.
- Return `Response.json(...)` or `NextResponse.json(...)` consistently with the surrounding route.
- Parse request bodies once. Handle malformed JSON with a clear `400`.
- Validate body, params, and query values with existing validation helpers or schemas before using them.
- Do not trust client-supplied `userId`, `accountId`, tenant IDs, Stripe IDs, usage counters, repository ownership, or billing status.
- Normalize expected errors to safe status codes and messages. Do not leak stack traces, secrets, SQL errors, provider payloads, or internal policy details.
- Use explicit status codes for `401`, `403`, `404`, `409`, `422`, `429`, and `500` when they carry different product meaning.

## Auth And Trust

- Authenticate with the existing Supabase server client for user routes.
- Let Supabase RLS enforce account/user boundaries. Route code may narrow access further, but it must not be the only boundary.
- Use `supabaseAdmin` only inside trusted server-to-server flows where bypassing RLS is intentional and documented in code.
- Keep webhook handlers separate from browser-authenticated routes. Stripe webhook handlers must validate Stripe signatures before trusting payloads.
- Do not put secrets, service-role keys, webhook secrets, provider keys, or admin clients in browser-importable modules.

## Caching And Runtime

- Treat authenticated `GET` handlers as dynamic unless proven otherwise.
- Do not use static caching for API key validation, usage, billing, account, repository, or RAG routes.
- Avoid route segment config changes unless the task explicitly involves caching/runtime behavior.
- If caching is introduced, define the cache scope, invalidation trigger, tenant/user isolation, and stale-data impact.
- Do not stream or buffer large provider responses without considering timeouts, aborts, and partial failure behavior.

## Validation

- Add or update focused tests when handler behavior, auth, validation, rate limiting, or response shape changes.
- Run `yarn lint` and `yarn typecheck` for TypeScript route changes.
- Run `yarn test` when Node regression coverage is added or touched.
- Before pushing, `yarn lint` and `yarn typecheck` must pass.

## Stop Conditions

Stop for explicit approval when route work requires a new dependency, broad route reorganization, auth model change, RLS bypass, new cache layer, webhook trust change, or migration not already in scope.
