import "server-only";
import crypto from "crypto";
import dns from "dns/promises";
import type { LookupAddress } from "node:dns";
import http, { type IncomingHttpHeaders } from "node:http";
import https from "node:https";
import net from "net";
import type { LookupFunction } from "node:net";
import type { WebhookLogEntry } from "@/types/account";

const MAX_RESPONSE_BODY_LENGTH = 4000;
const MAX_RESPONSE_CAPTURE_BYTES = 16 * 1024;
const MAX_RESPONSE_HEADER_LENGTH = 240;
const MAX_RESPONSE_HEADERS = 24;
const WEBHOOK_TIMEOUT_MS = 10_000;
const SENSITIVE_RESPONSE_HEADERS = new Set([
  "authorization",
  "cookie",
  "proxy-authenticate",
  "set-cookie",
  "www-authenticate",
  "x-api-key",
  "x-auth-token",
]);

const SAFE_WEBHOOK_ENDPOINT_ERRORS = new Set([
  "Webhook endpoint URL is invalid.",
  "Webhook endpoint URL is too long.",
  "Webhook endpoint must use HTTP or HTTPS.",
  "Webhook endpoint must not include embedded credentials.",
  "Webhook endpoint must use a public hostname.",
  "Webhook endpoint hostname could not be resolved.",
  "Webhook endpoint must not resolve to a private or reserved network address.",
]);

const RESERVED_IPV4_NETWORKS = new net.BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  RESERVED_IPV4_NETWORKS.addSubnet(network, prefix, "ipv4");
}
const RESERVED_IPV6_NETWORKS = new net.BlockList();
for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["::ffff:0:0", 96],
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["100:0:0:1::", 64],
  ["2001::", 23],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["3fff::", 20],
  ["5f00::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["fec0::", 10],
  ["ff00::", 8],
] as const) {
  RESERVED_IPV6_NETWORKS.addSubnet(network, prefix, "ipv6");
}

export type WebhookTestPayload = {
  id: string;
  event: "dandi.test_delivery";
  createdAt: string;
  mode: "test";
  data: {
    message: string;
    endpointPurpose: "account_webhook_test";
  };
};

export type WebhookTestResult = {
  success: boolean;
  logs: string[];
  delivery: WebhookLogEntry;
};

function formatLogTime(date = new Date()) {
  return date.toLocaleTimeString();
}

export function getSafeWebhookErrorMessage(error: unknown) {
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return "The webhook endpoint timed out.";
  }

  if (error instanceof Error && error.message) {
    if (SAFE_WEBHOOK_ENDPOINT_ERRORS.has(error.message)) return error.message;
    if (/fetch failed|network|timeout|aborted|dns|enotfound|econnrefused|econnreset/i.test(error.message)) {
      return "The webhook endpoint could not be reached.";
    }
  }

  return "The webhook endpoint could not be reached.";
}

export function isPrivateOrReservedIp(ip: string) {
  const version = net.isIP(ip);
  if (version === 4) return RESERVED_IPV4_NETWORKS.check(ip, "ipv4");
  if (version === 6) return RESERVED_IPV6_NETWORKS.check(ip, "ipv6");
  return true;
}

type ResolvedWebhookEndpoint = {
  url: URL;
  address: string;
  family: 4 | 6;
};

export function createPinnedLookup(address: string, family: 4 | 6): LookupFunction {
  return (_hostname, options, callback) => {
    if (options.all) {
      callback(null, [{ address, family }]);
      return;
    }
    callback(null, address, family);
  };
}

export async function assertSafeWebhookEndpoint(webhookUrl: string): Promise<ResolvedWebhookEndpoint> {
  if (webhookUrl.length > 2000) {
    throw new Error("Webhook endpoint URL is too long.");
  }

  let parsed: URL;
  try {
    parsed = new URL(webhookUrl);
  } catch {
    throw new Error("Webhook endpoint URL is invalid.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Webhook endpoint must use HTTP or HTTPS.");
  }

  if (parsed.username || parsed.password) {
    throw new Error("Webhook endpoint must not include embedded credentials.");
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error("Webhook endpoint must use a public hostname.");
  }

  const ipVersion = net.isIP(hostname);
  if (ipVersion) {
    if (isPrivateOrReservedIp(hostname)) {
      throw new Error("Webhook endpoint must not resolve to a private or reserved network address.");
    }
    return { url: parsed, address: hostname, family: ipVersion as 4 | 6 };
  }

  let resolvedAddresses: LookupAddress[];
  try {
    resolvedAddresses = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error("Webhook endpoint hostname could not be resolved.");
  }
  if (resolvedAddresses.length === 0) {
    throw new Error("Webhook endpoint hostname could not be resolved.");
  }

  if (resolvedAddresses.some((entry) => isPrivateOrReservedIp(entry.address))) {
    throw new Error("Webhook endpoint must not resolve to a private or reserved network address.");
  }

  const selected = resolvedAddresses.find((entry) => entry.family === 4 || entry.family === 6);
  if (!selected) {
    throw new Error("Webhook endpoint hostname could not be resolved.");
  }

  return { url: parsed, address: selected.address, family: selected.family as 4 | 6 };
}

function toWebHeaders(headers: IncomingHttpHeaders) {
  const result = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      value.forEach((item) => result.append(key, item));
    } else if (value !== undefined) {
      result.set(key, value);
    }
  }
  return result;
}

export async function postToPinnedWebhookEndpoint(
  endpoint: ResolvedWebhookEndpoint,
  payloadBody: string,
  signature: string,
  event: string,
) {
  const transport = endpoint.url.protocol === "https:" ? https : http;

  return new Promise<{ status: number; headers: Headers; bodyText: string }>((resolve, reject) => {
    let settled = false;
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    const request = transport.request(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payloadBody).toString(),
        "User-Agent": "Dandi-Webhooks/1.0",
        "X-Dandi-Event": event,
        "X-Dandi-Signature-Version": "1",
        "X-Dandi-Signature": signature,
      },
      lookup: createPinnedLookup(endpoint.address, endpoint.family),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    }, (response) => {
      const chunks: Buffer[] = [];
      let capturedBytes = 0;
      let truncated = false;

      const finish = () => {
        if (settled) return;
        settled = true;
        const suffix = truncated ? "\n[truncated]" : "";
        resolve({
          status: response.statusCode ?? 0,
          headers: toWebHeaders(response.headers),
          bodyText: `${Buffer.concat(chunks).toString("utf8")}${suffix}`,
        });
      };

      response.on("data", (value: Buffer | string) => {
        const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
        const remaining = Math.max(MAX_RESPONSE_CAPTURE_BYTES - capturedBytes, 0);
        if (remaining > 0) chunks.push(chunk.subarray(0, remaining));
        capturedBytes += chunk.length;
        if (capturedBytes > MAX_RESPONSE_CAPTURE_BYTES) {
          truncated = true;
          finish();
          response.destroy();
        }
      });
      response.on("end", finish);
      response.on("error", (error) => {
        fail(error);
      });
    });

    request.on("error", (error) => {
      fail(error);
    });
    request.end(payloadBody);
  });
}

export function buildWebhookTestPayload(now = new Date()): WebhookTestPayload {
  return {
    id: `evt_test_${crypto.randomUUID()}`,
    event: "dandi.test_delivery",
    createdAt: now.toISOString(),
    mode: "test",
    data: {
      message: "This is a test delivery from Dandi account settings.",
      endpointPurpose: "account_webhook_test",
    },
  };
}

export function signWebhookPayload(payloadBody: string, signingSecret: string, timestamp: number) {
  const digest = crypto
    .createHmac("sha256", signingSecret)
    .update(`${timestamp}.${payloadBody}`)
    .digest("hex");

  return `t=${timestamp},hmac=${digest}`;
}

export function sanitizeResponseHeaders(headers: Headers) {
  const safeHeaders: Record<string, string> = {};

  for (const [key, value] of headers.entries()) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_RESPONSE_HEADERS.has(lowerKey)) continue;
    if (Object.keys(safeHeaders).length >= MAX_RESPONSE_HEADERS) break;
    safeHeaders[lowerKey] = value.length > MAX_RESPONSE_HEADER_LENGTH
      ? `${value.slice(0, MAX_RESPONSE_HEADER_LENGTH)}...`
      : value;
  }

  return safeHeaders;
}

export function parseSafeResponseBody(bodyText: string, contentType: string | null) {
  const truncated = bodyText.length > MAX_RESPONSE_BODY_LENGTH;
  const safeBodyText = truncated
    ? `${bodyText.slice(0, MAX_RESPONSE_BODY_LENGTH)}\n[truncated]`
    : bodyText;

  if (contentType?.toLowerCase().includes("application/json")) {
    try {
      return JSON.parse(safeBodyText);
    } catch {
      return safeBodyText;
    }
  }

  return safeBodyText;
}

export type SignedWebhookDeliveryResult = {
  success: boolean;
  retryable: boolean;
  status: number;
  latency: number;
  responseHeaders: Record<string, string>;
  responseBody: unknown;
  error?: string;
};

function isRetryableWebhookStatus(status: number) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

/**
 * Deliver a versioned, signed product event using the same pinned egress
 * policy as the account test delivery. The result is sanitized and safe to
 * persist in delivery history; it never includes the signing secret.
 */
export async function sendSignedWebhookDelivery(input: {
  webhookUrl: string;
  signingSecret: string;
  event: string;
  payload: unknown;
  now?: Date;
}): Promise<SignedWebhookDeliveryResult> {
  const now = input.now ?? new Date();
  const payloadBody = JSON.stringify(input.payload);
  const timestamp = Math.floor(now.getTime() / 1000);
  const signature = signWebhookPayload(payloadBody, input.signingSecret, timestamp);
  const startedAt = performance.now();

  try {
    const endpoint = await assertSafeWebhookEndpoint(input.webhookUrl);
    const response = await postToPinnedWebhookEndpoint(endpoint, payloadBody, signature, input.event);
    const latency = Math.max(0, Math.round(performance.now() - startedAt));
    const responseHeaders = sanitizeResponseHeaders(response.headers);
    const responseBody = parseSafeResponseBody(response.bodyText, response.headers.get("content-type"));

    return {
      success: response.status >= 200 && response.status < 300,
      retryable: isRetryableWebhookStatus(response.status),
      status: response.status,
      latency,
      responseHeaders,
      responseBody,
    };
  } catch (error) {
    const safeError = getSafeWebhookErrorMessage(error);
    return {
      success: false,
      retryable: !/invalid|must use|embedded|public hostname|resolved|reserved|too long/i.test(safeError),
      status: 0,
      latency: Math.max(0, Math.round(performance.now() - startedAt)),
      responseHeaders: {},
      responseBody: { error: safeError },
      error: safeError,
    };
  }
}

export async function sendWebhookTestDelivery(input: {
  webhookUrl: string;
  signingSecret: string;
  now?: Date;
}): Promise<WebhookTestResult> {
  const now = input.now ?? new Date();
  const payload = buildWebhookTestPayload(now);
  const payloadBody = JSON.stringify(payload);
  const timestamp = Math.floor(now.getTime() / 1000);
  const signature = signWebhookPayload(payloadBody, input.signingSecret, timestamp);
  const logs = [
    `[info] ${formatLogTime(now)} - Validating saved webhook endpoint.`,
    `[info] ${formatLogTime(now)} - Building signed test delivery payload.`,
    `[info] ${formatLogTime(now)} - Added X-Dandi-Signature header (value hidden).`,
  ];
  const startedAt = performance.now();

  try {
    const endpoint = await assertSafeWebhookEndpoint(input.webhookUrl);

    logs.push(`[info] ${formatLogTime()} - Sending HTTP POST request to saved webhook endpoint.`);

    // Native HTTP requests do not follow redirects. The validated address is
    // pinned into DNS lookup so the connection cannot be rebound after review.
    const response = await postToPinnedWebhookEndpoint(endpoint, payloadBody, signature, payload.event);

    const latency = Math.max(0, Math.round(performance.now() - startedAt));
    const responseHeaders = sanitizeResponseHeaders(response.headers);
    const responseBody = parseSafeResponseBody(response.bodyText, response.headers.get("content-type"));
    const responseOk = response.status >= 200 && response.status < 300;

    logs.push(
      responseOk
        ? `[success] ${formatLogTime()} - Endpoint responded with HTTP ${response.status} in ${latency}ms.`
        : `[error] ${formatLogTime()} - Endpoint responded with HTTP ${response.status} in ${latency}ms.`,
    );

    return {
      success: responseOk,
      logs,
      delivery: {
        id: payload.id,
        event: payload.event,
        url: input.webhookUrl,
        status: response.status,
        latency,
        timestamp: now.getTime(),
        requestBody: payload,
        responseHeaders,
        responseBody,
      },
    };
  } catch (error) {
    const latency = Math.max(0, Math.round(performance.now() - startedAt));
    const message = getSafeWebhookErrorMessage(error);
    logs.push(`[error] ${formatLogTime()} - ${message}`);

    return {
      success: false,
      logs,
      delivery: {
        id: payload.id,
        event: payload.event,
        url: input.webhookUrl,
        status: 0,
        latency,
        timestamp: now.getTime(),
        requestBody: payload,
        responseHeaders: {},
        responseBody: { error: message },
      },
    };
  }
}
