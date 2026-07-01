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
2. Classify the work as Normal, Sensitive, or Critical.
   - Normal: UI, copy, local component, or docs changes that do not affect trust boundaries.
   - Sensitive: route handlers, auth, Supabase, RLS, billing, API keys, webhooks, GitHub App, AI/RAG, logging, rate limits, CSP, CORS, cache behavior, environment variables, secrets, or tokens.
   - Critical: tenant isolation, service-role expansion, private repository access, webhook trust, billing trust boundaries, or secret storage.
3. For Sensitive or Critical work, include a pre-implementation security-review phase using `docs/SECURITY_REVIEW_GUIDE.md`.
4. For Sensitive or Critical work, include security acceptance criteria and post-implementation validation or test expectations.
5. Inspect relevant project files enough to anchor the plan.
6. Split work into phases that keep the app usable.
7. For Supabase work, plan around `@supabase/ssr`, native RLS, server-only `supabaseAdmin`, and no NextAuth.
8. For Stripe webhook, Upstash Redis, API key, or usage-counter work, include relevant trust-boundary and failure-mode checks.
9. Put data, auth, RLS, and migrations before UI when data boundaries are involved.
10. Define acceptance criteria and validation for each phase using commands from `package.json`.
11. Produce execution prompts when handoff is useful.
12. Use the planning template in `docs/PROJECT_RULES.md` for larger plans.

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
