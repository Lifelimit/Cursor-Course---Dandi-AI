# Dandi Architecture

Dandi is a Next.js product dashboard for authenticated AI API access, usage monitoring, billing, and repository intelligence.

## Application Shape

- `app/` contains App Router pages and route handlers.
- `components/` contains UI grouped by product area.
- `hooks/` contains client hooks.
- `lib/` contains shared server/client utilities, service clients, validation, billing helpers, and security helpers.
- `supabase/` contains Supabase config, migrations, snippets, and seed data.
- `tests/` contains Node-based regression tests.
- `scripts/` contains validation helpers.
- `docs/` contains shared agent and project knowledge.

## Product Areas

- Landing and account-aware calls to action.
- Supabase signup, login, account, and protected dashboard flows.
- API key lifecycle management.
- Usage analytics, quotas, alert thresholds, and alert channels.
- Stripe checkout, subscriptions, billing portal, invoices, payment methods, and webhooks.
- GitHub repository metadata, summarization, ingestion, embeddings, and RAG chat.
- Playground surfaces for key validation, repository analysis, and network inspection.

## Main Routes

- `/` - landing page.
- `/signup` and `/login` - authentication.
- `/dashboards` - API key overview and credential management.
- `/playground` - GitHub summarization and RAG testing.
- `/usage` - usage analytics and quota health.
- `/billing` - plans, invoices, and payment methods.
- `/account` - account details.
- `/docs` - product documentation surface.
- `/protected` - hidden auth-gated API key validation route.

## Security Model

- Supabase Auth identifies users.
- Supabase RLS must enforce account and user data boundaries independently from UI checks.
- Browser clients must use public, scoped access only.
- Admin or service-role clients must stay server-side and be reserved for trusted backend flows.
- Route handlers and server actions must validate inputs at trust boundaries.

## Validation Model

Use the narrowest command that meaningfully validates the change. For general safety, prefer `yarn lint` and `yarn typecheck`; use `yarn test` when behavior covered by Node tests changes; use `yarn ci:check` for broader pre-release confidence.
