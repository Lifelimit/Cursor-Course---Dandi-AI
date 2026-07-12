---
name: dandi-security-review
description: "Use when reviewing Dandi auth, authorization, Supabase, RLS, service-role, admin client, route.ts, API route, webhook, Stripe, billing, API key, usage, quota, rate limit, Redis, GitHub App, private repo, AI/RAG, logging, CSP, CORS, env, secret, or token work. This is read-only by default."
---

# Dandi Security Review

## Contract

Act as the security reviewer. Find confirmed trust-boundary, privacy, abuse, and data-isolation issues with evidence, and avoid speculative findings.

## Trigger

Use this skill when the user asks for a security review, threat model, RLS check, auth review, route trust review, or review involving auth, authorization, Supabase, RLS, service-role, admin client, `route.ts`, API route, webhook, Stripe, billing, API key, usage, quota, rate limit, Redis, GitHub App, private repo, AI/RAG, logging, CSP, CORS, env, secret, or token concerns.

Prefer this skill over `dandi-audit` when the primary question is security, privacy, tenant isolation, abuse resistance, or trust boundaries.

## Constraints

- Read-only by default: do not edit files, stage changes, commit, run migrations, or perform destructive commands unless the user explicitly asks for fixes.
- Report only confirmed findings grounded in local evidence.
- Put uncertain risks in Open Questions instead of presenting them as findings.
- Keep Cursor-specific behavior in `.cursor/skills/` and shared doctrine in `docs/`.

## Workflow

1. Read `AGENTS.md`.
2. Read `docs/DOMAIN_MAP.md` before broad exploration.
3. Read `docs/SECURITY_REVIEW_GUIDE.md`.
4. Read the focused docs relevant to the scope, especially `docs/ROUTE_HANDLER_RULES.md`, `docs/SECURITY_RLS_CHECKLIST.md`, `docs/AI_RAG_GUARDRAILS.md`, and `docs/TESTING_POLICY.md`.
5. Use targeted search before broad file reads. Avoid unrelated product areas.
6. Classify the reviewed work as Normal, Sensitive, or Critical using `docs/SECURITY_REVIEW_GUIDE.md`.
7. Inspect enough code, docs, tests, migrations, or diffs to prove or disprove each concern.
8. For each finding, include severity, file/line evidence, what is wrong, why it matters, concrete fix, and suggested test.
9. Note safe-as-is checks that materially reduce risk.
10. Stop and report if the review expands beyond the requested scope.

## Output Shape

```text
Confirmed Findings
- [severity] Title - file:line
  Evidence:
  What is wrong:
  Why it matters:
  Concrete fix:
  Suggested test:

Not Findings / Safe As-Is
- ...

Open Questions
- ...

Recommended Fix Order
- ...
```

If there are no confirmed findings, say that clearly and list meaningful safe-as-is checks, open questions, and validation gaps.
