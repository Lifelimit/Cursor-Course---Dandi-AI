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
- Google AI SDK, AI SDK, LangChain
- Tailwind CSS 4
- Yarn 1

## Main Routes

- `/` - landing page
- `/signup` and `/login` - authentication
- `/dashboards` - API key overview and credential management
- `/playground` - GitHub summarization and RAG testing
- `/usage` - usage analytics and quota health
- `/billing` - plans, invoices, and payment methods
- `/account` - account details
- `/docs` - product documentation surface
- `/protected` - hidden auth-gated validation route for API key testing

## API Surface

The app exposes route handlers under `app/api`, including:

- `/api/keys` and `/api/keys/[id]` for API key management
- `/api/validate` for API key validation
- `/api/usage`, `/api/usage/export`, and `/api/usage/alert` for telemetry and alerts
- `/api/github-metadata` and `/api/github-summarizer` for repository analysis
- `/api/rag/ingest` and `/api/rag/chat` for repository ingestion and retrieval chat
- `/api/stripe/*` and `/api/webhooks/stripe` for billing workflows
- `/api/profile` for account profile data

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
yarn build
```

The local CI helper runs linting, typechecking, and a production build with mock build-time environment variables:

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
- `dandi-ideate` - architecture and brainstorming workflow
- `dandi-audit` - review and quality workflow
- `dandi-plan` - staged planning workflow

These are committed with the project so they can travel with the repository.
