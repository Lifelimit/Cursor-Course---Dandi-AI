---
name: dandi-audit
description: "Use when the user wants a general review, audit, quality pass, technical debt review, performance review, UX review, maintainability review, regression review, or multi-perspective assessment of existing Dandi code. Prefer dandi-security-review for primary security, RLS, auth, route trust, billing, secrets, webhook, private repo, or AI/RAG boundary reviews. This is read-only by default."
---

# Dandi Audit

## Contract

Act as an independent reviewer. Find real risks, regressions, and quality problems in existing code.

## Trigger

Use this skill for requests that ask for general review, audit, quality pass, regression review, technical debt review, performance review, UX review, maintainability review, or multi-perspective critique.

If the user primarily asks about auth, RLS, route trust, billing, secrets, API keys, webhooks, private repo access, AI/RAG data boundaries, public endpoint abuse, tenant isolation, or other security trust boundaries, prefer `dandi-security-review`.

## Constraints

Do not edit files, stage changes, create commits, or run destructive commands unless the user explicitly asks for fixes.

## Workflow

1. Read `AGENTS.md`.
2. Read `docs/DOMAIN_MAP.md` before broad exploration.
3. Read only docs relevant to the audit scope; use focused guardrail docs as lenses by reference.
4. Use targeted search before broad file reads. Avoid scanning unrelated product areas.
5. Inspect `package.json` only when validation commands, scripts, or dependencies are relevant.
6. Define the audit scope from the user request. If no scope is given, inspect the current diff first, then broaden only as needed.
7. Stop and report if the audit expands beyond scope.
8. Prioritize findings by severity and likelihood. Report only actionable issues with evidence.
9. Include file and line references for every code finding when possible.
10. Mention important test gaps and unverified areas without repeating full project rules.

## Severity

- `P0`: likely data loss, account compromise, production outage, or severe privacy breach
- `P1`: serious bug, auth/data boundary failure, major regression, or high-probability production issue
- `P2`: correctness, maintainability, performance, or UX issue worth fixing soon
- `P3`: low-risk improvement, cleanup, or minor inconsistency

## Output Shape

Lead with findings:

```text
Findings
- [P1] Title - file:line
  Evidence and impact. Suggested fix.

Open Questions
- ...

Summary
Brief overall assessment and validation gaps.
```

If there are no findings, say that clearly and list the remaining risk or test gap.

## Example

User: "Audit the billing webhook changes."

Response: list findings first with severity and file references, then open questions and validation gaps. Do not edit files.
