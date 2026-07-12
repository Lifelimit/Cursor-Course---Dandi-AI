import "server-only";
import crypto from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  sendSignedWebhookDelivery,
  type SignedWebhookDeliveryResult,
} from "@/lib/services/webhook-test.service";
import type { WebhookLogEntry } from "@/types/account";

export const PRODUCTION_WEBHOOK_EVENT = "dandi.usage_threshold_exceeded" as const;
export const PRODUCTION_WEBHOOK_EVENT_VERSION = 1 as const;
export const WEBHOOK_DELIVERY_MAX_ATTEMPTS = 8;
export const WEBHOOK_FAILURE_THRESHOLD = 5;
export const WEBHOOK_CIRCUIT_SECONDS = 60 * 60;
export const WEBHOOK_DELIVERY_BATCH_SIZE = 20;
export const WEBHOOK_DELIVERY_LEASE_SECONDS = 5 * 60;
export const WEBHOOK_HISTORY_RETENTION_DAYS = 90;

const RETRY_DELAYS_SECONDS = [60, 300, 1_800, 7_200, 43_200, 86_400];

type ProductionWebhookPayload = {
  id: string;
  event: typeof PRODUCTION_WEBHOOK_EVENT;
  version: typeof PRODUCTION_WEBHOOK_EVENT_VERSION;
  createdAt: string;
  mode: "live";
  data: Record<string, unknown>;
};

type ClaimedWebhookDelivery = {
  id: string;
  user_id: string;
  endpoint_url: string;
  event: string;
  event_version: number;
  payload: ProductionWebhookPayload;
  attempts: number;
  lock_token: string;
};

type OutcomeRow = {
  updated?: boolean;
  delivery_status?: string | null;
  disabled_until?: string | null;
};

function isUniqueViolation(error: { code?: string } | null | undefined) {
  return error?.code === "23505";
}

function stringifyResponseBody(value: unknown) {
  if (typeof value === "string") return value.slice(0, 4000);
  try {
    return JSON.stringify(value).slice(0, 4000);
  } catch {
    return "[unavailable]";
  }
}

function retryAt(now: Date, attempts: number) {
  const index = Math.min(Math.max(attempts - 1, 0), RETRY_DELAYS_SECONDS.length - 1);
  return new Date(now.getTime() + RETRY_DELAYS_SECONDS[index] * 1000);
}

function deliveryStatusCode(status: string, responseStatus: number | null) {
  if (status === "succeeded") return responseStatus || 200;
  return responseStatus || 0;
}

/**
 * Add one production event to the durable outbox. The endpoint and signing
 * secret are deliberately not copied into the queue row; the worker reads the
 * current server-only profile configuration when it claims the delivery.
 */
export async function enqueueProductionWebhookEvent(input: {
  userId: string;
  data: Record<string, unknown>;
  dedupeKey?: string;
  now?: Date;
}) {
  if (!input.userId || input.userId === "demo-user-id") return null;

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("webhook_url, webhook_secret")
    .eq("id", input.userId)
    .maybeSingle();

  if (profileError) {
    console.error("Failed to inspect webhook configuration while enqueueing an event.");
    return null;
  }

  if (!profile?.webhook_url || !profile.webhook_secret) return null;

  const now = input.now ?? new Date();
  const deliveryId = crypto.randomUUID();
  const payload: ProductionWebhookPayload = {
    id: `evt_${deliveryId}`,
    event: PRODUCTION_WEBHOOK_EVENT,
    version: PRODUCTION_WEBHOOK_EVENT_VERSION,
    createdAt: now.toISOString(),
    mode: "live",
    data: input.data,
  };

  const { data: inserted, error } = await supabaseAdmin
    .from("webhook_deliveries")
    .insert({
      id: deliveryId,
      user_id: input.userId,
      endpoint_url: profile.webhook_url,
      event: payload.event,
      event_version: payload.version,
      payload,
      dedupe_key: input.dedupeKey ?? null,
      status: "pending",
      next_attempt_at: now.toISOString(),
    })
    .select("id")
    .maybeSingle();

  if (error) {
    if (isUniqueViolation(error)) return null;
    console.error("Failed to enqueue a production webhook event.");
    return null;
  }

  return inserted?.id ?? deliveryId;
}

async function cancelClaimedDelivery(delivery: ClaimedWebhookDelivery, reason: string) {
  const { error } = await supabaseAdmin
    .from("webhook_deliveries")
    .update({
      status: "cancelled",
      locked_until: null,
      lock_token: null,
      last_error: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", delivery.id)
    .eq("status", "processing")
    .eq("lock_token", delivery.lock_token);

  if (error) console.error("Failed to cancel an unavailable webhook delivery.");
}

async function recordOutcome(
  delivery: ClaimedWebhookDelivery,
  result: SignedWebhookDeliveryResult,
  now: Date,
) {
  const { data, error } = await supabaseAdmin.rpc("record_webhook_delivery_outcome", {
    p_delivery_id: delivery.id,
    p_lock_token: delivery.lock_token,
    p_success: result.success,
    p_retry: result.retryable,
    p_next_attempt_at: result.retryable ? retryAt(now, delivery.attempts).toISOString() : null,
    p_response_status: result.status || null,
    p_latency_ms: result.latency,
    p_response_headers: result.responseHeaders,
    p_response_body: stringifyResponseBody(result.responseBody),
    p_error: result.error || (result.success ? null : `Endpoint returned HTTP ${result.status}.`),
    p_max_attempts: WEBHOOK_DELIVERY_MAX_ATTEMPTS,
    p_failure_threshold: WEBHOOK_FAILURE_THRESHOLD,
    p_circuit_seconds: WEBHOOK_CIRCUIT_SECONDS,
  });

  if (error) {
    console.error("Failed to persist a webhook delivery outcome.");
    return false;
  }

  return Boolean((data as OutcomeRow[] | null)?.[0]?.updated);
}

export async function deliverPendingWebhooks(input: {
  limit?: number;
  now?: Date;
} = {}) {
  const now = input.now ?? new Date();
  const limit = Math.min(Math.max(input.limit ?? WEBHOOK_DELIVERY_BATCH_SIZE, 1), 100);
  const leaseUntil = new Date(now.getTime() + WEBHOOK_DELIVERY_LEASE_SECONDS * 1000);
  const { data, error } = await supabaseAdmin.rpc("claim_webhook_deliveries", {
    p_limit: limit,
    p_lease_until: leaseUntil.toISOString(),
  });

  if (error) {
    throw new Error("Webhook delivery queue could not be claimed.");
  }

  const claimed = (data ?? []) as ClaimedWebhookDelivery[];
  let succeeded = 0;
  let retried = 0;
  let failed = 0;
  let cancelled = 0;

  const retentionCutoff = new Date(now.getTime() - WEBHOOK_HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await supabaseAdmin
    .from("webhook_deliveries")
    .delete()
    .in("status", ["succeeded", "failed", "cancelled"])
    .lt("created_at", retentionCutoff);

  for (const delivery of claimed) {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("webhook_url, webhook_secret")
      .eq("id", delivery.user_id)
      .maybeSingle();

    if (profileError || !profile?.webhook_url || !profile.webhook_secret) {
      await cancelClaimedDelivery(delivery, "Webhook endpoint is no longer configured.");
      cancelled += 1;
      continue;
    }

    if (profile.webhook_url !== delivery.endpoint_url) {
      await cancelClaimedDelivery(delivery, "Webhook endpoint changed before delivery.");
      cancelled += 1;
      continue;
    }

    const result = await sendSignedWebhookDelivery({
      webhookUrl: delivery.endpoint_url,
      signingSecret: profile.webhook_secret,
      event: delivery.event,
      payload: delivery.payload,
      now,
    });

    const updated = await recordOutcome(delivery, result, now);
    if (!updated) continue;
    if (result.success) succeeded += 1;
    else if (result.retryable && delivery.attempts < WEBHOOK_DELIVERY_MAX_ATTEMPTS) retried += 1;
    else failed += 1;
  }

  return { claimed: claimed.length, succeeded, retried, failed, cancelled };
}

export async function getWebhookDeliveryHistory(userId: string, limit = 50): Promise<WebhookLogEntry[]> {
  const [{ data, error }, { data: profile }] = await Promise.all([
    supabaseAdmin
    .from("webhook_deliveries")
    .select("id, endpoint_url, event, payload, status, response_status, latency_ms, response_headers, response_body, last_error, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 100)),
    supabaseAdmin.from("profiles").select("webhook_url").eq("id", userId).maybeSingle(),
  ]);

  if (error) throw new Error("Webhook delivery history could not be loaded.");

  return (data ?? []).map((row) => ({
    id: row.id,
    event: row.event,
    url: row.endpoint_url || profile?.webhook_url || "Configured webhook endpoint",
    status: deliveryStatusCode(row.status, row.response_status),
    latency: row.latency_ms ?? 0,
    timestamp: new Date(row.created_at).getTime(),
    requestBody: row.payload,
    responseHeaders: (row.response_headers ?? {}) as Record<string, string>,
    responseBody: row.response_body ?? (row.last_error ? { error: row.last_error } : null),
  }));
}
