# Testing Policy

Use this document when deciding what validation to run, when to add tests, and when a change is too risky to leave untested.

## Available Commands

Inspect `package.json` before naming commands. Current validation commands are:

- `yarn lint`
- `yarn typecheck`
- `yarn test`
- `yarn ci:check`

Use Yarn only.

## What To Run

- Documentation-only changes: usually no automated validation is required. Run a focused spell, link, or formatting check only if the repo provides one.
- TypeScript, React, or route-handler changes: run `yarn lint` and `yarn typecheck`.
- Server behavior, validation, billing, usage, AI/RAG, or Supabase helper changes: run `yarn test` when relevant coverage exists or is added.
- Migration, RLS, or schema changes: run the relevant Supabase/manual SQL checks if available, plus `yarn lint` and `yarn typecheck` when TypeScript call sites change.
- Broad or release-sensitive changes: run `yarn ci:check`.
- Before pushing: `yarn lint` and `yarn typecheck` must pass.

## When To Add Tests

Add focused regression tests when a change affects:

- Auth, authorization, RLS, tenant or account isolation.
- Route-handler request validation or response shape.
- Billing, Stripe webhooks, subscriptions, invoices, or payment methods.
- Usage quotas, rate limits, hot counters, or alert thresholds.
- AI/RAG ingestion, retrieval scoping, prompt assembly, output parsing, or quota enforcement.
- API key creation, validation, revocation, masking, or bulk actions.
- Date, currency, pagination, retry, or partial-failure behavior.

Small copy, layout, or docs-only changes do not need tests unless they change behavior.

## Test Design

- Prefer narrow tests that prove the boundary or behavior that changed.
- Cover both allowed and denied cases for auth-sensitive work.
- Use fixtures that do not contain real secrets, tokens, customer data, prompts, repository content, or billing details.
- Avoid network-dependent tests unless the project already has a stable mocked pattern.
- Keep tests deterministic and aligned with the existing `tests/*.test.mjs` runner.

## Reporting Validation

Final handoffs should name:

- Commands run and whether they passed.
- Commands skipped and why.
- Important behavior left unverified.
- Any failure that blocks push readiness.

## Stop Conditions

Stop and ask for approval or a narrower scope when safe validation would require new infrastructure, new dependencies, destructive data changes, external paid services, secrets the agent does not have, or broad unrelated fixes.
