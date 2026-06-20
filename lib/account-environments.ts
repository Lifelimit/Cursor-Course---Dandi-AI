import type { AccountApiKey, AccountEnvironment, AccountUsageLog } from "@/types/account";

export type {
  AccountApiKey,
  AccountEnvironment,
  AccountEnvironmentKind,
  AccountUsageLog,
} from "@/types/account";

export function getRequestIp(request: Request) {
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("cf-connecting-ip") ||
    null
  );
}

export function getRequestTelemetry(request: Request) {
  return {
    ip: getRequestIp(request),
    userAgent: request.headers.get("user-agent"),
    city: request.headers.get("x-vercel-ip-city") || request.headers.get("cf-ipcity"),
    region: request.headers.get("x-vercel-ip-country-region") || request.headers.get("cf-region"),
    country: request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry"),
  };
}

export function formatEnvironmentLocation(input: {
  city?: string | null;
  region?: string | null;
  country?: string | null;
}) {
  const parts = [input.city, input.region, input.country]
    .map((part) => part?.trim())
    .filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : null;
}

export function describeUserAgent(userAgent?: string | null) {
  if (!userAgent) return "Anonymous browser";
  const lower = userAgent.toLowerCase();

  if (lower.includes("curl")) return "Terminal curl command";
  if (lower.includes("postman")) return "Postman client";
  if (lower.includes("insomnia")) return "Insomnia client";
  if (lower.includes("python")) return "Python client";
  if (lower.includes("node")) return "Node.js client";
  if (lower.includes("chrome")) return "Chrome browser";
  if (lower.includes("safari") && !lower.includes("chrome")) return "Safari browser";
  if (lower.includes("firefox")) return "Firefox browser";

  return `Custom client`;
}

export function buildAccountEnvironments(input: {
  currentRequest: {
    ip: string | null;
    userAgent: string | null;
    city?: string | null;
    region?: string | null;
    country?: string | null;
  };
  apiKeys: AccountApiKey[];
  usageLogs: AccountUsageLog[];
  now?: Date;
}): AccountEnvironment[] {
  const environments: AccountEnvironment[] = [
    {
      id: "browser-current",
      kind: "browser",
      label: describeUserAgent(input.currentRequest.userAgent),
      detail: "Authenticated account session",
      ip: input.currentRequest.ip,
      location: formatEnvironmentLocation(input.currentRequest),
      lastSeenAt: input.now?.toISOString() ?? new Date().toISOString(),
      current: true,
      revocable: false,
    },
  ];

  for (const key of input.apiKeys.filter((key) => key.is_active)) {
    environments.push({
      id: `api-key-${key.id}`,
      kind: "api_key",
      label: key.name,
      detail: `${key.key_type === "production" ? "Production" : "Development"} API key`,
      ip: null,
      location: null,
      lastSeenAt: key.created_at ?? null,
      current: false,
      revocable: true,
      apiKeyId: key.id,
    });
  }

  const latestByFingerprint = new Map<string, AccountUsageLog>();
  for (const log of input.usageLogs) {
    const fingerprint = [
      log.keyId || "unknown-key",
      log.ip || "unknown-ip",
      describeUserAgent(log.userAgent),
    ].join("|");

    const existing = latestByFingerprint.get(fingerprint);
    const existingTime = existing?.usedAt ? Date.parse(existing.usedAt) : 0;
    const nextTime = log.usedAt ? Date.parse(log.usedAt) : 0;
    if (!existing || nextTime >= existingTime) {
      latestByFingerprint.set(fingerprint, log);
    }
  }

  for (const [fingerprint, log] of latestByFingerprint) {
    environments.push({
      id: `api-request-${fingerprint}`,
      kind: "api_request",
      label: describeUserAgent(log.userAgent),
      detail: log.repoUrl ? `Recent API request: ${log.repoUrl}` : "Recent API request",
      ip: log.ip || null,
      location: formatEnvironmentLocation(log),
      lastSeenAt: log.usedAt || null,
      current: false,
      revocable: !!log.keyId,
      apiKeyId: log.keyId,
    });
  }

  return environments.sort((a, b) => {
    if (a.current) return -1;
    if (b.current) return 1;
    const aTime = a.lastSeenAt ? Date.parse(a.lastSeenAt) : 0;
    const bTime = b.lastSeenAt ? Date.parse(b.lastSeenAt) : 0;
    return bTime - aTime;
  });
}

export function splitAccountEnvironments<T extends AccountEnvironment>(environments: T[]) {
  return {
    apiAccessEnvironments: environments.filter(
      (environment) => environment.kind === "api_key" || environment.kind === "api_request"
    ),
    browserEnvironments: environments.filter((environment) => environment.kind === "browser"),
  };
}
