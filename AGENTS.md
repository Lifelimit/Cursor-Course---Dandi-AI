<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Rules
- Shared project knowledge lives in `docs/`. Start with `docs/PROJECT_RULES.md`, then use `docs/ARCHITECTURE.md`, `docs/PRODUCT_VISION.md`, and `docs/ROADMAP.md` when the task needs product or system context.
- Always use **Yarn** (`yarn`) for package management and script execution. Do not use `npm`, `pnpm`, or package-manager substitutions.
- Inspect `package.json` before naming validation commands. Current core checks are `yarn lint`, `yarn typecheck`, `yarn test`, and `yarn ci:check`.
- Before pushing to GitHub, always run `yarn lint` and `yarn typecheck`. Do not push if either command fails; fix the issue first or explicitly report the blocker.
- Keep agent behavior separated:
  - Codex-specific skills live in `.codex/skills/`.
  - Antigravity-specific rules, skills, and workflows live in `.agents/`.
  - Shared knowledge and reusable checklists live in `docs/`.
- Use the workflow boundary `Brainstorm -> Plan -> Execute -> Audit`. Brainstorm, plan, and audit are read-only by default. Execute is the only implementation workflow.

## Hidden Routes
- `/protected` — Auth-gated Vault page for API key validation testing. Not linked from any UI navigation. Access by URL only.
