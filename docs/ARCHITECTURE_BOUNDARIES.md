# Architecture Boundaries

Use this document when deciding where code belongs, whether a change crosses ownership boundaries, or when to stop and ask for a narrower plan.

## Directory Responsibilities

- `app/` owns Next.js App Router pages, layouts, server actions, and route handlers. Add user-facing routes near the matching product route. Add backend endpoints under `app/api/<domain>/route.ts` unless the feature intentionally needs a colocated route handler.
- `components/ui/` owns reusable primitive UI. Product-specific UI belongs in `components/<product-area>/`.
- `hooks/` owns client-side React hooks only. Do not put server clients, secrets, direct database access, or route-handler logic in hooks.
- `lib/supabase/` owns Supabase client creation and helpers. Keep browser clients, server clients, and admin/service-role clients separated by file and import path.
- `lib/services/` owns reusable server-side integrations and product services, such as billing, usage, GitHub, repository intelligence, and AI orchestration.
- `lib/utils/` owns small shared pure utilities. Do not turn it into a home for feature services or cross-cutting business logic.
- `supabase/migrations/` owns schema, policy, trigger, function, and index changes. `supabase/snippets/` is for reusable SQL snippets or manual checks.
- `tests/` owns Node regression tests. Add tests near the changed behavior using the existing `tests/*.test.mjs` pattern.
- `docs/` owns shared project knowledge, reusable checklists, decision records, and agent-neutral guidance.
- `.codex/skills/` owns Codex workflow instructions only. Skills should point to shared docs instead of duplicating long project rules.
- `.agents/` owns Antigravity-specific behavior. Do not edit it from Codex unless the user explicitly requests Antigravity changes.

## Boundary Rules

- Keep product flows grouped by domain: auth, dashboards, usage, billing, account, playground, and repository intelligence.
- Keep route handlers thin: parse and authorize requests, call server-side helpers, then normalize the response.
- Keep UI state in client components and data/security decisions on the server or in Supabase RLS.
- Keep service-role Supabase usage behind trusted server-only flows. Never import admin clients into client components, hooks, or browser-reachable utilities.
- Keep Stripe webhook trust separate from user-initiated billing routes.
- Keep Upstash hot counters and Supabase durable records synchronized through explicit service functions rather than scattered writes.
- Keep AI/RAG ingestion, retrieval, prompt construction, and model calls in server-side service or route-handler code.
- Prefer extending existing product folders over adding new top-level directories.

## New File Placement

- New page: `app/<route>/page.tsx`.
- New API endpoint: `app/api/<domain>/route.ts` or `app/api/<domain>/<action>/route.ts`.
- New reusable product component: `components/<product-area>/<Name>.tsx`.
- New UI primitive: `components/ui/<name>.tsx`.
- New client hook: `hooks/use-<thing>.ts`.
- New server integration or business operation: `lib/services/<domain>.ts`.
- New Supabase helper: `lib/supabase/<purpose>.ts`.
- New small pure helper: `lib/utils/<purpose>.ts`.
- New schema or RLS change: `supabase/migrations/<timestamp>_<description>.sql`.
- New regression test: `tests/<feature>.test.mjs`.
- New durable architecture or product decision: `docs/decisions/<yyyy-mm-dd>-<short-title>.md`.

## Dependency Approval

- Do not add, remove, or upgrade dependencies without explicit user approval.
- Inspect existing dependencies and local helpers before proposing a package.
- If a new dependency is justified, name why the existing stack cannot reasonably cover the need, the runtime impact, and the validation commands required after the change.
- Use Yarn only for dependency operations.

## Stop Conditions

Stop and ask for a narrower plan or explicit approval when a change would:

- Modify broad architecture across multiple product domains.
- Move files across top-level boundaries.
- Change authentication, authorization, RLS, billing trust, or webhook trust assumptions.
- Introduce a new datastore, queue, provider, auth system, package manager, or app-wide framework.
- Require destructive data migration, irreversible schema change, or backfill.
- Require touching another agent's configuration.
- Require editing unrelated files to make validation pass.
- Expose or log secrets, user data, repository content, prompts, embeddings, or billing data.
