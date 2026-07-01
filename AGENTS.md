<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Rules
- Start here, then use `docs/DOMAIN_MAP.md` before broad repo exploration.
- Shared rules live in `docs/PROJECT_RULES.md`; focused guardrails live in `docs/ARCHITECTURE_BOUNDARIES.md`, `docs/ROUTE_HANDLER_RULES.md`, `docs/SECURITY_RLS_CHECKLIST.md`, `docs/AI_RAG_GUARDRAILS.md`, `docs/SECURITY_REVIEW_GUIDE.md`, and `docs/TESTING_POLICY.md`.
- Durable architecture, security, dependency, and workflow decisions belong in `docs/decisions/`.
- Use **Yarn** (`yarn`) only. Inspect `package.json` only when commands or dependencies are relevant.
- Before pushing to GitHub, always run `yarn lint` and `yarn typecheck`. Do not push if either command fails; fix the issue first or explicitly report the blocker.
- Keep Codex behavior in `.codex/skills/`, Antigravity behavior in `.agents/`, and shared knowledge in `docs/`.
- Use the workflow boundary `Brainstorm -> Plan -> Security Review -> Execute -> Audit`. Security Review is mandatory for Sensitive or Critical work. Brainstorm, Plan, Security Review, and Audit are read-only by default. Execute is the only implementation workflow.
- Stop and ask before broad architecture moves, dependency changes, auth/RLS trust changes, service-role expansion, destructive migrations, or unsafe AI/RAG data exposure.

## Hidden Routes
- `/protected` — Auth-gated Vault page for API key validation testing. Not linked from any UI navigation. Access by URL only.
