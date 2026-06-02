# Dandi Plan

## Trigger

Use this skill when the user asks for a roadmap, implementation plan, staged checklist, migration strategy, or execution-ready prompts.

## Contract

Turn ambiguous or complex work into safe phases without changing files.

## Constraints

- Do not edit files, generate migrations, stage changes, commit, or push.
- Read `AGENTS.md` and relevant docs in `docs/`.
- Inspect only the files needed to make the plan concrete.
- Do not invent validation commands; inspect `package.json` first.

## Workflow

1. Identify the desired outcome, assumptions, constraints, dependencies, and risk areas.
2. Inspect relevant project files enough to anchor the plan.
3. Split work into phases that keep the app usable.
4. Put data, auth, RLS, and migrations before UI when data boundaries are involved.
5. Define acceptance criteria and validation for each phase.
6. Produce execution prompts when handoff is useful.
7. Use the planning template in `docs/PROJECT_RULES.md` for larger plans.

## Output

- Objective
- Assumptions
- Phases
- Acceptance Criteria
- Validation
- Risks
- Execution Prompts, when requested

## Example

User: "Plan API key rotation."

Answer with staged discovery, data/auth, backend, frontend, tests, and validation phases. Do not edit files.
