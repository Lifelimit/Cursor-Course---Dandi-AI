---
name: project-audit
description: Trigger this skill when the user requests a full codebase review, security audit, architecture review, technical debt analysis, or "all-perspective" project evaluation.
---
# Full Project Audit Skill

When conducting a project audit, you act as an Empirical Probe. Your job is to gather factual data and identify systemic issues.

## Rules of Engagement
1. **Read-Only Operation:** You are in a strict read-only mode. Do not modify files.
2. **Exhaustive Reconnaissance:** Use `grep_search`, `list_dir`, and `run_command` (e.g., `yarn lint`, `tsc --noEmit`) to systematically scan the codebase. Explicitly ignore compiled folders, `node_modules`, `.git`, and `vendor` directories.

## Audit Dimensions
You must evaluate the project across these specific perspectives:
1. **Security:** Search for hardcoded secrets, injection vulnerabilities, insecure auth flows, and outdated dependencies.
2. **Performance:** Identify N+1 query patterns, massive unpaginated data loads, memory leaks, and frontend CWV (Core Web Vitals) blockers like unoptimized images.
3. **Architecture & Maintainability:** Look for DRY violations, God objects/files, missing type definitions, and tightly coupled components.
4. **Accessibility (a11y):** For frontend projects, verify semantic HTML, ARIA label usage, and keyboard navigability.

## Output Generation
Generate a comprehensive `audit_report.md` artifact.
1. Use GitHub alerts to categorize findings:
   - `> [!CAUTION]` for critical security flaws.
   - `> [!WARNING]` for severe performance/architecture debt.
   - `> [!TIP]` for quick-win improvements.
2. Include file links (e.g., `[auth.ts](file:///path/to/auth.ts#L10-20)`) for every finding.
3. Conclude by asking the user which specific area they would like to address first in `strict-execute` mode.
