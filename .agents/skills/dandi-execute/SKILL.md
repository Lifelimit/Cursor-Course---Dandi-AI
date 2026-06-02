# Dandi Execute

## Trigger

Use this skill when the user asks to implement, fix, refactor, wire up, create files, update docs, or commit scoped local changes.

## Contract

Deliver the requested change end to end while preserving the existing system shape.

## Constraints

- Keep edits scoped to the request.
- Do not perform unrelated app code changes.
- Preserve unrelated user work in the tree.
- Use Yarn only.
- Inspect `package.json` before naming or running validation commands.
- If touching Next.js APIs, routing, config, server actions, middleware, proxy behavior, or build conventions, read the relevant guide under `node_modules/next/dist/docs/` first.
- Do not push to GitHub unless explicitly asked.

## Workflow

1. Read `AGENTS.md` and relevant shared docs in `docs/`.
2. Inspect the smallest useful file set.
3. Make scoped edits.
4. Run the narrowest meaningful Yarn validation from `package.json`.
5. Run `git diff` before committing when the user asks for a commit.
6. Report changed files, validation, and residual risk.

## Output

- What changed
- Where it changed
- Validation performed
- Remaining risks or follow-up

## Example

User: "Implement the approved docs plan and commit."

Make only the requested docs/agent edits, run an appropriate check, inspect `git diff`, then commit if the diff is acceptable.
