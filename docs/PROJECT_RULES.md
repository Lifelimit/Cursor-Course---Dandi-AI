# Dandi Project Rules

This document is the shared source of truth for AI agents working in Dandi. Agent-specific behavior belongs in `.codex/` or `.agents/`; project facts and reusable guidance belong here.

## Stack

- Next.js 16 App Router with React 19 and TypeScript.
- Supabase Auth and Postgres through `@supabase/ssr` and `@supabase/supabase-js`.
- Stripe Billing for subscriptions, invoices, checkout, and webhooks.
- Upstash Redis for hot usage counters and rate limiting.
- AI SDK, Google AI SDK, LangChain, and Google GenAI packages for AI and repository intelligence.
- Tailwind CSS 4.
- Yarn 1 for package management and scripts.

## Hard Rules

- Use `yarn` only. Do not use `npm`, `pnpm`, or substitute package managers.
- Before touching Next.js APIs, routing, config, server actions, middleware, proxy behavior, caching, or build conventions, read the relevant guide in `node_modules/next/dist/docs/`.
- Do not expose secrets in client bundles, logs, browser-visible errors, docs, screenshots, or test fixtures.
- Use Supabase Auth with `@supabase/ssr`. Do not introduce NextAuth.
- Keep service-role or admin Supabase access server-only. Use it only for server-to-server flows that intentionally bypass RLS, such as trusted webhook handling.
- Enforce user and tenant boundaries in Supabase RLS, not only in UI or route code.
- Preserve unrelated user changes in the worktree. Never revert files you did not intentionally modify for the task.
- Do not push to GitHub unless explicitly asked.

## Validation Commands

These commands exist in `package.json`:

- `yarn lint` - run ESLint.
- `yarn typecheck` - run `tsc --noEmit`.
- `yarn test` - run Node tests under `tests/*.test.mjs`.
- `yarn ci:check` - run `scripts/validate.sh`.

Before pushing, run `yarn lint` and `yarn typecheck`. Do not push if either fails.

## Agent Workflow Boundary

Use this sequence for project work:

1. Brainstorm: explore options and tradeoffs without editing files.
2. Plan: produce a staged implementation plan without editing files.
3. Execute: make scoped code or doc changes and run relevant validation.
4. Audit: review existing code or diffs without editing files unless fixes are explicitly requested.

## Cross-Agent Coordination

- Only one agent should actively modify files at a time.
- Codex is the preferred implementation agent.
- Antigravity is the preferred independent review and workflow-analysis agent unless explicitly assigned implementation.
- Both agents must respect `AGENTS.md` and the shared docs in `docs/`.
- Neither agent should modify the other agent's configuration without explicit instruction.

## Planning Template

Use this phase shape for larger plans:

- Goal.
- Files or areas likely involved.
- Tasks.
- Acceptance criteria.
- Validation using commands from `package.json`.
- Stop condition.

Prefer this order when it fits the work:

1. Discovery.
2. Data, auth, RLS, policies, and migrations.
3. Backend route handlers, server actions, validation, and helpers.
4. Frontend UI states, forms, navigation, responsiveness, and accessibility.
5. Focused tests.
6. Verification with Yarn checks and manual flows.
7. Cleanup only where it directly supports the change.

## Audit Lenses

Use the relevant lenses for the requested scope. Report only issues that matter.

- Security and privacy: auth bypasses, secret exposure, input validation, unsafe redirects, file paths, and query params.
- Supabase and RLS: tenant/user boundaries, correct client trust level, mutation scope, read leaks through joins, counts, storage URLs, or errors.
- Correctness: loading, empty, error, partial data, async races, dates, currency, pagination, and runtime data shape.
- Performance: waterfalls, repeated queries, bundle size, unbounded lists, and cache behavior for the current Next.js version.
- Resource management: cleanup for subscriptions, timers, streams, listeners, and long-running operations.
- Frontend UX: responsive behavior, disabled, pending, focus, and error states, and user-facing copy.
- Maintainability: module boundaries, naming, types, and useful abstractions.
- Tests and observability: focused coverage, useful errors and logs, and no sensitive leakage.
