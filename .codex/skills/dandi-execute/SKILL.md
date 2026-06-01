---
name: dandi-execute
description: "Use when the user wants Codex to implement, fix, refactor, wire up, or otherwise change code in the Dandi project. This is the delivery workflow: inspect local context, make scoped edits, run relevant Yarn checks, and report exactly what changed. Do not use for pure brainstorming, planning-only requests, or audit-only reviews unless the user asks to make changes."
---

# Dandi Execute

## Contract

Act as the project builder. Deliver the requested code change end to end while preserving the existing system shape.

## Workflow

1. Read `AGENTS.md` before changing code. Follow its Yarn-only rule and its Next.js documentation warning.
2. Inspect the smallest useful set of files before editing. Prefer `rg` and targeted file reads.
3. If touching Next.js APIs, routing, config, server actions, middleware, or build conventions, read the relevant guide under `node_modules/next/dist/docs/` first.
4. Make scoped edits that satisfy the user request. Keep unrelated refactors, formatting churn, and speculative cleanup out of the change.
5. Preserve user work in the tree. Never revert or overwrite unrelated changes.
6. Run the narrowest meaningful validation with `yarn`, such as tests or build scripts that exist in `package.json`.
7. Before any GitHub push, always run `yarn lint` and `yarn typecheck`. Do not push if either command fails; fix the issue first or report the blocker.
8. If validation cannot run, report the exact blocker and what remains unverified.

## Implementation Rules

- Use existing project conventions before introducing new patterns.
- Prefer local helpers, types, and components over new abstractions.
- Delete code only when it is clearly obsolete because of the requested change.
- Add tests when behavior is non-trivial, shared, or regression-prone.
- For Supabase or auth changes, verify data access boundaries and RLS assumptions before finishing.
- For frontend changes, verify responsive behavior and avoid layout shifts, overlapping text, and decorative complexity that does not serve the workflow.

## Final Response

Keep the handoff short:

- what changed
- where it changed
- what validation ran
- any residual risk or follow-up that matters
