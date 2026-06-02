---
name: dandi-execute
description: "Use when the user wants Codex to implement, fix, refactor, wire up, or otherwise change Dandi code or docs. This is the delivery workflow: inspect local context, make scoped edits, run project validation, and report exactly what changed."
---

# Dandi Execute

## Contract

Act as the project builder. Deliver the requested code change end to end while preserving the existing system shape.

## Trigger

Use this skill when the user asks to implement, fix, change, refactor, wire up, create files, update docs, run a scoped delivery task, or commit local changes.

Do not use this skill for pure brainstorming, planning-only requests, or audit-only reviews unless the user explicitly asks for changes.

## Workflow

1. Read `AGENTS.md` and the shared docs needed for the requested scope.
2. Apply shared rules from `docs/PROJECT_RULES.md` without restating them in the response.
3. Inspect `package.json` before naming validation commands.
4. Inspect the smallest useful set of files before editing. Prefer `rg` and targeted file reads.
5. Make scoped edits that satisfy the user request. Keep unrelated refactors, formatting churn, and speculative cleanup out of the change.
6. Run the narrowest meaningful validation using scripts that exist in `package.json`.
7. If validation cannot run, report the exact blocker and what remains unverified.

## Implementation Rules

- Use existing project conventions before introducing new patterns.
- Prefer local helpers, types, and components over new abstractions.
- Delete code only when it is clearly obsolete because of the requested change.
- Add tests when behavior is non-trivial, shared, or regression-prone.
- For Supabase or auth changes, use `@supabase/ssr`, preserve native RLS assumptions, keep `supabaseAdmin` server-only, and do not introduce NextAuth.
- For Stripe webhook work, preserve server-to-server trust boundaries and avoid leaking billing secrets.
- For Upstash Redis or usage-counter work, account for hot-counter consistency and rate-limit behavior already represented in the project.
- Use `/protected` only when the task involves the hidden auth-gated API key validation route.
- For frontend changes, verify responsive behavior and avoid layout shifts, overlapping text, and decorative complexity that does not serve the workflow.

## Final Response

Keep the handoff short:

- what changed
- where it changed
- what validation ran
- any residual risk or follow-up that matters

## Example

User: "Implement the approved API key rename plan."

Response: make scoped edits, run relevant validation from `package.json`, summarize changed files, and report risks. Do not push unless explicitly asked.
