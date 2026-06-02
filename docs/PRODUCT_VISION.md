# Dandi Product Vision

Dandi helps teams manage AI API access, usage, billing, and repository intelligence from one authenticated workspace.

## Direction

- Make AI API usage visible, governable, and easier to operate.
- Keep credential management secure and understandable.
- Give users practical usage and billing feedback before surprises happen.
- Turn repository intelligence into a useful playground for summarization, ingestion, and RAG chat.
- Preserve trust through clear auth boundaries, strong RLS assumptions, and careful handling of secrets.

## Product Principles

- Security first, especially around API keys, RLS, billing webhooks, and server-only credentials.
- Dashboard workflows should be dense, direct, and scannable.
- Empty, loading, error, and partial-data states should be handled as real product states.
- User-facing copy should explain outcomes without exposing implementation details.
- Prefer incremental, reversible changes over broad rewrites.

## Non-Goals For Agents

- Do not turn implementation tasks into speculative product redesigns.
- Do not add new providers, billing concepts, database models, or workflows unless the user asks.
- Do not alter public product positioning without grounding it in existing docs or explicit direction.
