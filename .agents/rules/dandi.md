# Dandi Antigravity Rules

These rules apply to Antigravity agents in this workspace.

## Shared Context

- Read `AGENTS.md` first.
- Use `docs/PROJECT_RULES.md` as the shared source of truth for project rules.
- Use `docs/ARCHITECTURE.md`, `docs/PRODUCT_VISION.md`, and `docs/ROADMAP.md` when product or system context matters.

## Agent Boundaries

- Use `/brainstorm` before `/plan` when the solution shape is unclear.
- Use `/plan` before `/execute` for large or risky work.
- Use `/execute` only when the user asks for implementation or file changes.
- Use `/audit` for review, security, RLS, performance, and quality checks.
- Brainstorm, plan, and audit are read-only by default.

## Constraints

- Use Yarn only.
- Inspect `package.json` before naming validation commands.
- Keep shared knowledge in `docs/`.
- Keep Antigravity-specific rules, skills, and workflows in `.agents/`.
- Do not push to GitHub unless explicitly asked.
- Preserve unrelated user changes.
