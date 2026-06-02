# Dandi Antigravity Rules

These rules apply to Antigravity agents in this workspace.

## Shared Context

- Read `AGENTS.md` first.
- Use `docs/PROJECT_RULES.md` as the shared source of truth for project rules.
- Use `docs/ARCHITECTURE.md`, `docs/PRODUCT_VISION.md`, and `docs/ROADMAP.md` when product or system context matters.

## Agent Boundaries

- Use `dandi-brainstorm` before `dandi-plan` when the solution shape is unclear.
- Use `dandi-plan` before `dandi-execute` for large or risky work.
- Use `dandi-execute` only when the user asks for implementation or file changes.
- Use `dandi-audit` for review, security, RLS, performance, and quality checks.
- Brainstorm, plan, and audit are read-only by default.

## Constraints

- Follow the cross-agent coordination model in `docs/PROJECT_RULES.md`.
- Keep Antigravity-specific rules and skills in `.agents/`.
- Do not modify Codex configuration in `.codex/` unless explicitly instructed.
