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

Do not edit files, generate migrations, stage changes, or commit. Use shared docs by reference; do not copy long rule blocks into the plan.

## Workflow

1. Read `AGENTS.md`.
2. Read `docs/DOMAIN_MAP.md` before broad exploration.
3. Read only docs relevant to the requested scope.
4. Use targeted search before broad file reads. Avoid scanning unrelated product areas.
5. Inspect `package.json` only when commands or dependencies are relevant.
6. Identify the target outcome, constraints, dependencies, and risk areas.
7. Classify the work as Normal, Sensitive, or Critical.
   - Normal: UI, copy, local component, or docs changes that do not affect trust boundaries.
   - Sensitive: route handlers, auth, Supabase, RLS, billing, API keys, webhooks, GitHub App, AI/RAG, logging, rate limits, CSP, CORS, cache behavior, environment variables, secrets, or tokens.
   - Critical: tenant isolation, service-role expansion, private repository access, webhook trust, billing trust boundaries, or secret storage.
8. For Sensitive or Critical work, include a pre-implementation security-review phase using `docs/SECURITY_REVIEW_GUIDE.md`.
9. For Sensitive or Critical work, include security acceptance criteria and post-implementation validation or test expectations.
10. Inspect relevant files enough to anchor the plan in the real project.
11. Break the work into small phases with acceptance criteria and validation.
12. Stop and report if the requested work expands beyond scope.
13. Generate execution prompts when the user wants handoff-ready tasks.

## Planning Rules

- Prefer incremental phases that keep Dandi's dashboard, billing, usage, and playground flows usable.
- Use the focused docs listed in `AGENTS.md` instead of restating their rules.
- Put schema, auth, RLS, and migration work before UI work when data boundaries are involved.
- Put discovery or audit phases before implementation when unknowns are high.
- Mark tasks that require user decisions.
- Avoid pretending uncertain work is certain; name assumptions directly.
- Do not route Sensitive or Critical work directly from Plan to Execute without naming the Security Review phase and what it must verify.

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
