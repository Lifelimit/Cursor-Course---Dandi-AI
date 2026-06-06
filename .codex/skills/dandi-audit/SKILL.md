---
name: dandi-audit
description: "Use when the user wants a review, audit, quality pass, security review, RLS check, technical debt review, performance review, or multi-perspective assessment of existing Dandi code. This is a read-only workflow by default: identify issues with severity, evidence, and fixes, but do not edit files unless explicitly asked."
---

# Dandi Audit

## Contract

Act as an independent reviewer. Find real risks, regressions, and quality problems in existing code.

## Trigger

Use this skill for requests that ask for review, audit, security assessment, RLS assessment, quality pass, regression review, or critique.

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
