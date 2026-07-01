# Dandi Security Review

## Trigger

Use this skill when the user asks for a security review, threat model, RLS check, auth review, route trust review, or review involving auth, authorization, Supabase, RLS, service-role, admin client, `route.ts`, API route, webhook, Stripe, billing, API key, usage, quota, rate limit, Redis, GitHub App, private repo, AI/RAG, logging, CSP, CORS, env, secret, or token concerns.

Prefer this skill over `dandi-audit` when the primary question is security, privacy, tenant isolation, abuse resistance, or trust boundaries.

## Contract

Review security-sensitive work without changing files. Use the shared Dandi doctrine in `docs/SECURITY_REVIEW_GUIDE.md` and report only evidence-backed findings.

## Constraints

- Read-only by default: do not edit, delete, stage, commit, push, or run migrations unless the user explicitly asks for fixes.
- Keep Antigravity-specific behavior in `.agents/`.
- Put shared security doctrine in `docs/`, not in this skill.
- Avoid speculative findings. Use Open Questions for risks that need more evidence.

## Workflow

1. Read `AGENTS.md`.
2. Use `docs/DOMAIN_MAP.md` before broad exploration.
3. Read `docs/SECURITY_REVIEW_GUIDE.md`.
4. Read focused docs relevant to the scope, especially `docs/ROUTE_HANDLER_RULES.md`, `docs/SECURITY_RLS_CHECKLIST.md`, `docs/AI_RAG_GUARDRAILS.md`, and `docs/TESTING_POLICY.md`.
5. Classify the reviewed work as Normal, Sensitive, or Critical.
6. Inspect the smallest useful file, migration, test, or diff set.
7. Report confirmed findings with severity, file/line evidence, what is wrong, why it matters, concrete fix, and suggested test.
8. Name meaningful safe-as-is checks and remaining open questions.

## Output

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

If there are no confirmed findings, say so directly and list remaining validation gaps.
