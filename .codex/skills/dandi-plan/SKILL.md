---
name: dandi-plan
description: "Use when the user wants a roadmap, implementation plan, staged checklist, migration strategy, or execution prompts for Dandi work before code changes. This is a read-only workflow: do not write or modify files unless the user explicitly switches to execution."
---

# Dandi Plan

## Contract

Act as the strategist. Convert ambiguous or large work into a sequence that can be executed safely.

## Trigger

Use this skill for requests that ask for a plan, roadmap, staged checklist, implementation strategy, migration strategy, or execution prompts.

## Constraints

Do not edit files, generate migrations, stage changes, or commit. Read local context as needed to make the plan concrete.

## Workflow

1. Read `AGENTS.md`.
2. Read relevant shared docs in `docs/`, especially `docs/PROJECT_RULES.md`, `docs/ARCHITECTURE.md`, and `docs/ROADMAP.md`.
3. Identify the target outcome, constraints, dependencies, and risk areas.
4. Inspect relevant files enough to anchor the plan in the real project.
5. Break the work into small phases that produce useful checkpoints.
6. Define acceptance criteria and validation for each phase.
7. Generate execution prompts when the user wants handoff-ready tasks.
8. Use the planning template in `docs/PROJECT_RULES.md` for larger plans.

## Planning Rules

- Prefer incremental phases that keep the app usable.
- Put schema, auth, RLS, and migration work before UI work when data boundaries are involved.
- Put discovery or audit phases before implementation when unknowns are high.
- Mark tasks that require user decisions.
- Avoid pretending uncertain work is certain; name assumptions directly.

## Output Shape

For small tasks, provide a concise checklist.

For larger tasks, include:

- objective
- assumptions
- phases
- acceptance criteria
- validation commands that exist in `package.json`
- risks
- execution prompts

End with the recommended first execution step.

## Example

User: "Plan the Stripe invoice history feature."

Response: produce phases covering discovery, data/auth, backend, frontend, tests, validation, and risks. Do not edit files.
