# Atomic usage quota enforcement

Date: 2026-07-12
Status: Accepted

## Context

API-key validation previously read workspace and key counters independently, then successful workflows incremented them later. Concurrent requests could all observe available capacity before any increment completed. Redis outages also fell back to a persisted key count, which could allow requests through while the authoritative hot counter was unavailable.

## Decision

- Reserve one request atomically in Redis immediately before expensive or billable repository work.
- Use a single Lua script to read both the workspace and API-key counters, enforce both limits, increment both counters, and apply the monthly TTL as one operation.
- Treat Redis reservation errors as quota-unavailable and fail closed with a safe retryable error. Do not fall back to the persisted `usage_count` column for enforcement.
- Enforce reservations for repository Summary, RAG chat, and ingestion execution. Metadata, job-status reads, and explicit API-key validation do not consume the request allowance.
- Count an accepted reservation even if the downstream GitHub, embedding, or generation provider later fails. This avoids refund races where a failed request could decrement another concurrent request's reservation.
- Keep `incrementKeyUsage` for telemetry and threshold alerts only; it must not increment quota counters a second time.
- Preserve the shared demo key's 1,000-request Redis budget while keeping request-created data ownership tied to the active browser user.

## Consequences

Concurrent requests cannot pass the same remaining capacity window by racing separate reads. A Redis outage temporarily blocks quota-enforced repository work rather than risking overage. Provider failures consume an admitted request, which is predictable and protects the shared capacity budget.

The database `api_keys.usage_count` field remains a legacy/display fallback and is not an enforcement authority. A future migration can remove or repurpose it after all dependent surfaces are retired.

## Alternatives Considered

- Read counters, perform provider work, and increment afterward: preserves the race and allows concurrent overage.
- Increment then decrement on provider failure: introduces refund races and requires request-scoped reservation tokens.
- Use a database transaction/RPC: stronger durability, but it would add a new Supabase function and migration when the existing Redis hot-counter architecture already provides atomic Lua execution.
