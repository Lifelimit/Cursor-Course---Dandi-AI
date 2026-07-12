# Production webhook delivery

Date: 2026-07-12
Status: Deferred

## Context

Dandi's usage-threshold alert path was extended with an outbound customer
webhook design. The design used a durable service-role-only outbox,
scheduled processing, retries, circuit breaking, and persisted delivery
history.

The scheduled worker was added to drain that outbox independently of user
requests. It was configured to run every minute so retryable receiver failures
could be retried promptly. That schedule requires a Vercel plan with
sub-daily cron support, which is not appropriate for the current personal
launch scope.

## Current launch contract

- Account settings can save a webhook endpoint and manage its signing secret.
- An authenticated user can send an immediate signed test delivery.
- Test delivery responses are shown in the current account session only; they
  are not persisted as delivery history.
- Usage-threshold email alerts remain unchanged.
- Automatic customer-event webhook delivery, retries, circuit breaking, and
  delivery history are deferred.

The account UI states this limitation explicitly. No route or configuration
value is reserved for a scheduled delivery worker.

## Schema decision

The isolated migration named 20260712_create_webhook_delivery_queue.sql is
left unchanged. It may already have been applied, and removing its table,
functions, or profile columns would be a destructive migration. With the
application producer, worker, history route, and history UI removed, the
schema is harmlessly unused and available for a separately approved future
delivery design. If an environment is confirmed not to have applied the
migration, deleting that migration before applying it is optional cleanup, not
part of this launch change.

## Re-enable criteria

Automatic customer webhooks should return only with an explicitly approved
delivery architecture, scheduler plan, retry policy, and user-facing
delivery-history contract. That work should also include focused validation
against an isolated receiver.
