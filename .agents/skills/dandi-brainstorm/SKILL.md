# Dandi Brainstorm

## Trigger

Use this skill when the user asks to brainstorm, ideate, compare approaches, explore architecture, define tradeoffs, or think through Dandi work before planning or implementation.

## Contract

Explore the solution shape without changing files.

## Constraints

- Do not edit, delete, stage, commit, or push files.
- Read only the context needed for the discussion.
- Use `AGENTS.md` and shared docs in `docs/` when they help.
- Separate facts from assumptions.

## Workflow

1. Clarify the goal, users, constraints, and non-goals if needed.
2. Ground the discussion in `docs/PROJECT_RULES.md`, `docs/ARCHITECTURE.md`, `docs/PRODUCT_VISION.md`, or `docs/ROADMAP.md` when relevant.
3. Compare two to four approaches when useful.
4. Call out security, RLS, product, migration, and operational tradeoffs.
5. Recommend one direction.
6. End with the right next step: brainstorm, plan, execute, or audit.

## Output

- Recommendation
- Options
- Risks
- Decision Points
- Next Step

## Example

User: "Brainstorm a better usage alert model."

Answer with tradeoffs and a recommended direction. Do not edit files.
