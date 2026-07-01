import crypto from "crypto";
import dns from "dns/promises";
import net from "net";
import type { WebhookLogEntry } from "@/types/account";

const MAX_RESPONSE_BODY_LENGTH = 4000;
const MAX_RESPONSE_HEADER_LENGTH = 240;
const MAX_RESPONSE_HEADERS = 24;
const SENSITIVE_RESPONSE_HEADERS = new Set([
  "authorization",
  "cookie",
  "proxy-authenticate",
  "set-cookie",
  "www-authenticate",
  "x-api-key",
  "x-auth-token",
]);

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

function sanitizeErrorMessage(error: unknown) {
  if (error instanceof Error && error.name === "TimeoutError") {
    return "The webhook endpoint timed out.";
  }

  if (error instanceof Error && error.message) {
    if (/fetch failed|network|timeout|aborted|dns|enotfound|econnrefused|econnreset/i.test(error.message)) {
      return "The webhook endpoint could not be reached.";
    }
    return error.message;
  }

  return "The webhook endpoint could not be reached.";
}

function isPrivateOrReservedIpv4(ip: string) {
  const parts = ip.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }

  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 0 && parts[2] === 2) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && parts[2] === 100) ||
    (a === 203 && b === 0 && parts[2] === 113)
  );
}

function isPrivateOrReservedIpv6(ip: string) {
  const normalized = ip.toLowerCase();
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.") ||
    normalized.startsWith("::ffff:169.254.")
  );
}

export function isPrivateOrReservedIp(ip: string) {
  const version = net.isIP(ip);
  if (version === 4) return isPrivateOrReservedIpv4(ip);
  if (version === 6) return isPrivateOrReservedIpv6(ip);
  return true;
}

export async function assertSafeWebhookEndpoint(webhookUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(webhookUrl);
  } catch {
    throw new Error("Webhook endpoint URL is invalid.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Webhook endpoint must use HTTP or HTTPS.");
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error("Webhook endpoint must use a public hostname.");
  }

  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      throw new Error("Webhook endpoint must not resolve to a private or reserved network address.");
    }
    return;
  }

  const resolvedAddresses = await dns.lookup(hostname, { all: true, verbatim: true });
  if (resolvedAddresses.length === 0) {
    throw new Error("Webhook endpoint hostname could not be resolved.");
  }

  if (resolvedAddresses.some((entry) => isPrivateOrReservedIp(entry.address))) {
    throw new Error("Webhook endpoint must not resolve to a private or reserved network address.");
  }
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
    await assertSafeWebhookEndpoint(input.webhookUrl);

    logs.push(`[info] ${formatLogTime()} - Sending HTTP POST request to saved webhook endpoint.`);

    const response = await fetch(input.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Dandi-Webhooks/1.0",
        "X-Dandi-Event": payload.event,
        "X-Dandi-Signature": signature,
      },
      body: payloadBody,
      signal: AbortSignal.timeout(10000),
    });

    const latency = Math.max(0, Math.round(performance.now() - startedAt));
    const responseText = await response.text();
    const responseHeaders = sanitizeResponseHeaders(response.headers);
    const responseBody = parseSafeResponseBody(responseText, response.headers.get("content-type"));

    logs.push(
      response.ok
        ? `[success] ${formatLogTime()} - Endpoint responded with HTTP ${response.status} in ${latency}ms.`
        : `[error] ${formatLogTime()} - Endpoint responded with HTTP ${response.status} in ${latency}ms.`,
    );

    return {
      success: response.ok,
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
    const message = sanitizeErrorMessage(error);
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
