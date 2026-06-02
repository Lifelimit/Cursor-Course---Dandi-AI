# Dandi Plan

## Trigger

Use this skill when the user asks for a roadmap, implementation plan, staged checklist, migration strategy, or execution-ready prompts.

## Contract

Turn ambiguous or complex work into safe phases without changing files.

## Constraints

- Do not edit files, generate migrations, stage changes, commit, or push.
- Use `AGENTS.md` and shared docs in `docs/` as the source for global rules.
- Inspect only the files needed to make the plan concrete.

## Workflow

1. Identify the desired outcome, assumptions, constraints, dependencies, and risk areas.
2. Inspect relevant project files enough to anchor the plan.
3. Split work into phases that keep the app usable.
4. For Supabase work, plan around `@supabase/ssr`, native RLS, server-only `supabaseAdmin`, and no NextAuth.
5. For Stripe webhook, Upstash Redis, API key, or usage-counter work, include relevant trust-boundary and failure-mode checks.
6. Put data, auth, RLS, and migrations before UI when data boundaries are involved.
7. Define acceptance criteria and validation for each phase using commands from `package.json`.
8. Produce execution prompts when handoff is useful.
9. Use the planning template in `docs/PROJECT_RULES.md` for larger plans.

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
