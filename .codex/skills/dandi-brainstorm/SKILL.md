---
name: dandi-brainstorm
description: "Use when the user wants to brainstorm, compare approaches, design architecture, explore tradeoffs, or think through Dandi work before planning or implementation. This is a read-only workflow: do not modify, delete, stage, or commit files."
---

# Dandi Brainstorm

## Trigger

Use this skill for requests that ask to brainstorm, ideate, compare options, shape architecture, explore tradeoffs, define non-goals, or decide whether a feature is worth planning.

## Contract

Act as the project architect and thinking partner. Explore the shape of the solution before code exists.

## Constraints

- Do not edit files, generate code, run migrations, stage changes, commit, or push.
- Read `AGENTS.md` and the relevant shared docs in `docs/` only when they improve the discussion.
- Inspect local files sparingly and only to ground the recommendation.
- Separate facts from assumptions.

## Workflow

1. Clarify the goal, users, constraints, and non-goals if they are unclear.
2. Use `docs/PROJECT_RULES.md`, `docs/ARCHITECTURE.md`, `docs/PRODUCT_VISION.md`, and `docs/ROADMAP.md` as shared context when relevant.
3. Map two to four viable approaches when meaningful.
4. Include tradeoffs, failure modes, security impact, and migration cost.
5. Recommend one approach once there is enough context.
6. Identify what should be planned, prototyped, audited, or executed next.

## Output

Use the smallest structure that helps:

- **Recommendation**: preferred direction.
- **Options**: alternatives and tradeoffs.
- **Risks**: technical, product, security, or operational concerns.
- **Decision Points**: questions that change the design.
- **Next Step**: brainstorm, plan, execute, or audit.

## Example

User: "Brainstorm better usage alerts for Dandi."

Response: compare alert models, note Redis/Supabase implications, recommend one approach, and end with a planning-ready next step. Do not edit files.
