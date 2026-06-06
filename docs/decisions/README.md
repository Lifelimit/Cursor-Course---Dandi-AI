# Decision Records

Use this directory for durable architecture, product, security, dependency, and workflow decisions that future agents should not rediscover from scratch.

## When To Add A Decision

Add a decision record when work changes or clarifies:

- Architecture boundaries or file placement.
- Authentication, authorization, RLS, or service-role usage.
- Billing, webhook, usage-counter, or quota trust boundaries.
- AI/RAG data handling, retention, retrieval scope, or provider choice.
- New dependencies, external services, storage, queues, or runtime platforms.
- Testing policy, release gates, or cross-agent workflow.

Do not add a decision record for routine implementation details, transient bugs, or choices already covered by existing docs.

## File Naming

Use:

```text
docs/decisions/yyyy-mm-dd-short-title.md
```

Example:

```text
docs/decisions/2026-06-06-route-handler-cache-policy.md
```

## Template

```md
# Title

Date: YYYY-MM-DD
Status: Proposed | Accepted | Superseded

## Context

What changed, what constraint matters, and why the decision is needed.

## Decision

The chosen direction.

## Consequences

Operational, security, testing, migration, and maintenance impact.

## Alternatives Considered

Other viable options and why they were not chosen.
```

## Maintenance

- Link related docs or pull requests when useful.
- Supersede older decisions instead of rewriting history.
- Keep records concise enough for agents to scan quickly.
