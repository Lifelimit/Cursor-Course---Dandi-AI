# Dandi Audit

## Trigger

Use this skill when the user asks for a review, audit, quality pass, security review, RLS check, technical debt review, performance review, or regression assessment.

## Contract

Find real risks, regressions, and quality problems in existing code or diffs.

## Constraints

- Do not edit files, stage changes, commit, or push unless the user explicitly asks for fixes.
- Scope the audit to the request.
- Report only actionable findings with evidence.
- Include validation gaps even when no defects are found.

## Workflow

1. Read `AGENTS.md` and relevant docs in `docs/`.
2. Define scope from the user request. If no scope is given, inspect the current diff first.
3. Review through the audit lenses in `docs/PROJECT_RULES.md`.
4. Prioritize by severity and likelihood.
5. Provide file and line references where possible.

## Output

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

If there are no findings, say that clearly and list remaining risk or test gaps.

## Example

User: "Audit the new RLS migration."

Answer with severity-ranked findings and evidence. Do not edit files.
