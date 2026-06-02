# Dandi Roadmap

This roadmap is a lightweight planning aid for agents. Treat it as directional context, not as permission to implement unrelated work.

## Current Focus

- Keep authentication, API key management, usage analytics, billing, and repository intelligence stable.
- Strengthen validation around security-sensitive flows.
- Maintain a clean dual-agent setup for Codex and Antigravity.

## Near-Term Themes

- Security and RLS review for auth, API keys, billing webhooks, usage data, and RAG endpoints.
- Focused regression tests for critical helpers and route behavior.
- Clearer docs for product flows, validation steps, and operational assumptions.
- Better agent workflows that separate brainstorming, planning, execution, and audit.

## Planning Rules

- Put data, auth, RLS, and migrations before UI when data boundaries are involved.
- Put backend contracts before frontend surfaces when API behavior changes.
- Put focused tests near risky logic rather than adding broad test scaffolding by default.
- Validate with commands that already exist in `package.json`.
