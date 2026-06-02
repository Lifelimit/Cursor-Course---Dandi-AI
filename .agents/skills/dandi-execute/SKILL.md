# Dandi Execute

## Trigger

Use this skill when the user asks to implement, fix, refactor, wire up, create files, update docs, or commit scoped local changes.

## Contract

Deliver the requested change end to end while preserving the existing system shape.

## Constraints

- Keep edits scoped to the request.
- Do not perform unrelated app code changes.
- Use `AGENTS.md` and `docs/PROJECT_RULES.md` for global rules, validation commands, and cross-agent coordination.
- Do not modify Codex configuration unless explicitly instructed.

## Workflow

1. Read only the shared docs needed for the requested scope.
2. Inspect the smallest useful file set.
3. Make scoped edits.
4. For Supabase/auth work, preserve `@supabase/ssr`, native RLS, server-only `supabaseAdmin`, and no NextAuth.
5. For Stripe webhook, Upstash Redis, API key, or usage-counter work, preserve the existing trust boundaries and failure handling.
6. Use `/protected` only when the task involves the hidden auth-gated API key validation route.
7. Run the narrowest meaningful validation from `package.json`.
8. Run `git diff` before committing when the user asks for a commit.
9. Report changed files, validation, and residual risk.

## Output

- What changed
- Where it changed
- Validation performed
- Remaining risks or follow-up

## Example

User: "Implement the approved docs plan and commit."

Make only the requested docs/agent edits, run an appropriate check, inspect `git diff`, then commit if the diff is acceptable.
