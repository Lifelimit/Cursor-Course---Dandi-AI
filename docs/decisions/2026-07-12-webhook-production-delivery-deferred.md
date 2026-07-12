# Production webhook delivery architecture

Date: 2026-07-12
Status: Implemented

## Contract

Production events use a versioned JSON envelope:

```json
{
  "id": "evt_<uuid>",
  "event": "dandi.usage_threshold_exceeded",
  "version": 1,
  "createdAt": "2026-07-12T00:00:00.000Z",
  "mode": "live",
  "data": {}
}
```

The initial producer is the existing usage-threshold alert path. Webhook
enqueueing is independent of the user's email alert-channel preference. A
monthly, per-key dedupe key prevents concurrent requests from creating
duplicate alert events. The same pinned public-egress policy and HMAC signing format used by
test delivery are reused for production delivery, with
`X-Dandi-Signature-Version: 1` and `X-Dandi-Event` headers.

## Durable delivery

`webhook_deliveries` is a service-role-only outbox and history table. It stores
the event payload and sanitized response metadata, but never copies the
endpoint signing secret. A Vercel Cron request to
`/api/internal/webhook-delivery` claims up to 20 rows using a Postgres
`FOR UPDATE SKIP LOCKED` lease. The route requires `Authorization: Bearer
<CRON_SECRET>` and is scheduled once per minute in `vercel.json`.
The once-per-minute schedule requires a Vercel plan that supports sub-daily
cron intervals (Vercel Pro or an equivalent external scheduler); Hobby
deployments must use an approved external scheduler or a daily schedule.

Claims carry a lock token, so a worker that finishes after its lease expires
cannot overwrite a later worker's result. Successful deliveries are retained
as history. Missing endpoint configuration is cancelled without attempting
network access.

## Retry and circuit policy

HTTP 2xx responses complete the delivery. Timeouts, network failures, 408,
425, 429, and 5xx responses retry with delays of 1m, 5m, 30m, 2h, 12h, and
24h, capped at eight attempts. Other HTTP errors become terminal failures.
After five retryable failures, the profile circuit opens for one hour; the
claim function skips that endpoint until the circuit window expires. Saving an
endpoint or rotating its secret resets the circuit. A successful delivery also
resets the failure count.

The account delivery history route reads only the authenticated user's rows;
response headers and bodies are sanitized and bounded before persistence.
