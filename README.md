# Dandi AI

Dandi AI is a Next.js application for managing AI API access, usage, billing, and repository intelligence from one authenticated workspace.

The project is built as a product dashboard rather than a starter template. It includes account authentication, secure API key management, usage telemetry, Stripe billing flows, and an AI playground that can summarize and query GitHub repositories through a RAG workflow.

## Scope

This repository currently covers:

- Public landing page with pricing and account-aware calls to action.
- Supabase authentication for signup, login, account, and protected dashboard pages.
- API key lifecycle management, including create, edit, revoke, replace, masking, validation, and usage limits.
- Per-key and account-level usage analytics backed by Redis hot counters and logs.
- Alert thresholds and alert channels for usage monitoring.
- Stripe checkout, subscription, billing portal, invoices, payment methods, and webhook handling.
- GitHub repository metadata, summarization, ingestion, embeddings, and RAG chat endpoints.
- Playground UI for testing keys, summarizing repositories, ingesting code, and inspecting network logs.
- Project-scoped Codex skills for implementation, ideation, audit, and planning workflows.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Supabase Auth and Postgres
- Stripe Billing
- Upstash Redis
- Google AI SDK and AI SDK
- Tailwind CSS 4
- Yarn 1

## Main Routes

- `/` - landing page
- `/signup` and `/login` - authentication
- `/dashboards` - workspace overview and recent repository activity
- `/playground` - GitHub summarization and RAG testing
- `/usage` - usage analytics and quota health
- `/billing` - plans, invoices, and payment methods
- `/account` - workspace settings, including profile, GitHub, API access, webhooks, and security
- `/docs` - product documentation surface
- `/protected` - hidden auth-gated validation route for API key testing

## API Surface

The app exposes route handlers under `app/api`, including:

- `/api/keys`, `/api/keys/[id]`, and `/api/keys/bulk-delete` for API key management and alert settings
- `/api/validate` for API key validation
- `/api/usage` and `/api/usage/export` for telemetry
- `/api/github-metadata` and `/api/github-summarizer` for repository analysis
- `/api/rag/ingest`, `/api/rag/jobs`, and `/api/rag/chat` for repository ingestion and retrieval chat
- `/api/integrations/github/*` for GitHub App connection flows
- `/api/stripe/*` and `/api/webhooks/stripe` for billing workflows
- `/api/profile`, `/api/profile/webhook-secret`, and `/api/profile/webhook-test` for account profile and webhook settings
- `/api/account` and `/api/account/environments` for account lifecycle and environment metadata

## Getting Started

Install dependencies with Yarn:

```bash
yarn install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Fill in the required values for Supabase, Stripe, Upstash Redis, Google AI, auth, and API key hashing. The example file documents the expected variable names.

Run the development server:

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database

Supabase migrations live in `supabase/migrations`.

Apply them to a Supabase project before relying on the dashboard, billing, usage, or RAG flows. The migrations cover API keys, profiles, billing metadata, payment methods, usage logs, database hardening, vector embeddings, and webhook policies.

## Validation

Use Yarn for all scripts:

```bash
yarn lint
yarn typecheck
yarn test
yarn build
```

The local CI helper runs migration checks, linting, typechecking, tests, and a production build with mock build-time environment variables:

```bash
yarn ci:check
```

Before pushing to GitHub, always run:

```bash
yarn lint
yarn typecheck
```

Do not push if either command fails.

## Project Rules For Agents

Repo-specific agent instructions live in `AGENTS.md`.

Codex project skills live in `.codex/skills`:

- `dandi-execute` - implementation workflow
- `dandi-brainstorm` - architecture and brainstorming workflow (`dandi-ideate` is a compatibility alias)
- `dandi-audit` - review and quality workflow
- `dandi-plan` - staged planning workflow
- `dandi-security-review` - security and trust-boundary review workflow

These are committed with the project so they can travel with the repository.
