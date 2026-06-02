# Audit Workflow

Use the `dandi-audit` skill.

## Steps

1. Read `AGENTS.md` and relevant shared docs.
2. Define the audit scope.
3. Inspect the current diff first when no narrower scope is given.
4. Review for security, RLS, correctness, performance, UX, maintainability, tests, and observability.
5. Lead with severity-ranked findings.

## Boundary

Read-only by default. Do not edit, stage, commit, or push unless fixes are explicitly requested.
