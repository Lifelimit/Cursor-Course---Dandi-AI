---
name: dandi-plan
description: "Use when the user wants a roadmap, implementation plan, staged checklist, migration strategy, or execution prompts for a complex Dandi task before code changes. This is a planning-only workflow by default. Do not write or modify code unless the user explicitly switches to execution."
---

# Dandi Plan

## Contract

Act as the strategist. Convert ambiguous or large work into a sequence that can be executed safely.

## Hard Boundary

Do not edit files, generate migrations, stage changes, or commit. Read local context as needed to make the plan concrete.

## Workflow

1. Read `AGENTS.md`.
2. Identify the target outcome, constraints, dependencies, and risk areas.
3. Inspect relevant files enough to anchor the plan in the real project.
4. Break the work into small phases that produce useful checkpoints.
5. Define acceptance criteria and validation for each phase.
6. Generate execution prompts when the user wants handoff-ready tasks.
7. Use `references/plan-template.md` for larger plans.

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
- validation commands
- risks
- execution prompts

End with the recommended first execution step.
