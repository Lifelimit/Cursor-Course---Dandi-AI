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

Do not edit files, generate migrations, stage changes, or commit. Use shared rules from `docs/PROJECT_RULES.md` without copying them into the plan.

## Workflow

1. Read `AGENTS.md` and only the shared docs needed for the requested scope.
2. Identify the target outcome, constraints, dependencies, and risk areas.
3. Inspect relevant files enough to anchor the plan in the real project.
4. Break the work into small phases that produce useful checkpoints.
5. Define acceptance criteria and validation for each phase.
6. Generate execution prompts when the user wants handoff-ready tasks.
7. Use the planning template in `docs/PROJECT_RULES.md` for larger plans.

## Planning Rules

- Prefer incremental phases that keep Dandi's dashboard, billing, usage, and playground flows usable.
- For Supabase work, plan around `@supabase/ssr`, native RLS, and server-only `supabaseAdmin`; do not propose NextAuth.
- For Stripe webhook, Upstash Redis, API key, or usage-counter work, include the relevant trust boundary and failure-mode checks.
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

Response: produce phases covering discovery, Stripe data flow, server trust boundaries, UI states, tests, validation from `package.json`, and risks. Do not edit files.
