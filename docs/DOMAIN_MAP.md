# Domain Map

Compact routing map for finding the right area before reading files broadly. Some `lib/*` domains below are conceptual: today they may live as root `lib/*.ts` files plus `lib/services/*.ts`, not physical directories.

| Area | Owns | Start Here |
| --- | --- | --- |
| `app/` | Next.js routes, pages, layouts, route handlers, auth callback, hidden `/protected` route | `app/<route>/page.tsx`, `app/api/<domain>/route.ts` |
| `components/` | UI components grouped by product area plus shared primitives | `components/ui/`, `components/dashboard/`, `components/billing/`, `components/usage/`, `components/playground/`, `components/auth/` |
| `hooks/` | Client-only React hooks | `hooks/useApiKeys.ts`, `hooks/useToast.ts` |
| `lib/supabase/` | Browser/server Supabase clients and session-aware helpers | `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase-client.ts`, `lib/supabase-admin.ts` |
| `lib/billing/` | Stripe, plans, subscriptions, payment methods, invoices, billing safety | `lib/stripe.ts`, `lib/billing-catalog.ts`, `lib/services/stripe-*.ts` |
| `lib/usage/` | Quotas, rate limits, usage counters, alerts, Redis-backed hot paths | `lib/rate-limit.ts`, `lib/redis.ts`, `lib/alerts.ts`, `lib/services/api-key-limits.service.ts` |
| `lib/rag/` | AI/RAG orchestration, ingestion jobs, file selection, model provider calls | `lib/services/ai.service.ts`, `lib/services/google-gemini.service.ts`, `lib/services/ingestion-job.service.ts`, `lib/services/rag-file-selection.service.ts` |
| `lib/github/` | GitHub metadata and repository access helpers | `lib/services/github.service.ts` |
| `lib/security/` | Validation, CORS, environment checks, and security helpers | `lib/security-core.ts`, `lib/request-validation.ts`, `lib/cors.ts`, `lib/env.ts` |
| `lib/services/` | Server-side product services and integration boundaries | `lib/services/*.service.ts` |
| `supabase/` | Config, migrations, seed data, SQL snippets | `supabase/migrations/`, `supabase/snippets/`, `supabase/config.toml` |
| `tests/` | Node regression tests | `tests/*.test.mjs` |
| `scripts/` | Project validation and maintenance scripts | `scripts/validate.sh` |
| `docs/` | Shared project knowledge, guardrails, decisions | `docs/PROJECT_RULES.md`, focused guardrail docs, `docs/decisions/` |

Use targeted search inside the relevant area before opening whole files or neighboring product domains.
