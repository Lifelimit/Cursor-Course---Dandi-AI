# Execute Workflow

Use the `dandi-execute` skill.

## Steps

1. Read `AGENTS.md`, relevant shared docs, and `package.json`.
2. Inspect the smallest useful file set.
3. Make scoped edits.
4. Run relevant Yarn validation from `package.json`.
5. Run `git diff` before committing when requested.
6. Report changed files, validation, and risks.

## Boundary

Edits are allowed only for the user-approved scope. Do not push unless explicitly asked.
