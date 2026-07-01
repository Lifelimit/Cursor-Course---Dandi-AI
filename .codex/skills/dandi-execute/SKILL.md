---
name: dandi-execute
description: "Use when the user wants Codex to implement, fix, refactor, wire up, or otherwise change Dandi code or docs. This is the delivery workflow: inspect local context, make scoped edits, run project validation, and report exactly what changed."
---

# Dandi Execute

## Contract

Act as the project builder. Deliver the requested code change end to end while preserving the existing system shape.

## Trigger

Use this skill when the user asks to implement, fix, change, refactor, wire up, create files, update docs, run a scoped delivery task, or commit local changes.

Do not use this skill for pure brainstorming, planning-only requests, or audit-only reviews unless the user explicitly asks for changes.

## Workflow

1. Read `AGENTS.md`.
2. Read `docs/DOMAIN_MAP.md` before broad exploration.
3. Read only docs relevant to the task; use `docs/PROJECT_RULES.md` and focused guardrail docs by reference.
4. Use targeted search before broad file reads. Avoid scanning unrelated product areas.
5. Inspect `package.json` only when commands or dependencies are relevant.
6. Classify the task as Normal, Sensitive, or Critical using `docs/SECURITY_REVIEW_GUIDE.md`.
7. For Sensitive or Critical tasks, complete a pre-edit security gate that checks auth boundary, authorization or ownership boundary, RLS/service-role usage, secrets exposure, raw error leakage, logging/redaction, rate limit/quota behavior, cache/CORS/CSP impact, and test requirements.
8. Make scoped edits that satisfy the user request. Keep unrelated refactors, formatting churn, and speculative cleanup out of the change.
9. Stop and report if the task expands beyond scope or hits a guardrail stop condition.
10. Run the narrowest meaningful validation using scripts that exist in `package.json` when validation is relevant.
11. If validation cannot run, report the exact blocker and what remains unverified.

## Implementation Rules

- Use existing project conventions unless they conflict with `docs/ROUTE_HANDLER_RULES.md`, `docs/SECURITY_RLS_CHECKLIST.md`, `docs/AI_RAG_GUARDRAILS.md`, `docs/TESTING_POLICY.md`, or `docs/SECURITY_REVIEW_GUIDE.md`.
- Prefer local helpers, types, and components over new abstractions.
- Delete code only when it is clearly obsolete because of the requested change.
- Use the focused docs listed in `AGENTS.md` instead of repeating their rules here or in final responses.
- Use `/protected` only when the task involves the hidden auth-gated API key validation route.
- For frontend changes, verify responsive behavior and avoid layout shifts, overlapping text, and decorative complexity that does not serve the workflow.
- For Sensitive or Critical implementation, include a short security self-review in the final response.

## Final Response

Keep the handoff short:

- what changed
- where it changed
- what validation ran
- any residual risk or follow-up that matters

## Example

User: "Implement the approved API key rename plan."

Response: make scoped edits, run relevant validation from `package.json`, summarize changed files, and report risks. Do not push unless explicitly asked.
