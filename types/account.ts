import type { AccountUsageData } from "@/types/usage";

export type AccountEnvironmentKind = "browser" | "api_key" | "api_request";

export type AccountEnvironment = {
  id: string;
  kind: AccountEnvironmentKind;
  label: string;
  detail?: string;
  ip: string | null;
  location: string | null;
  lastSeenAt: string | null;
  current: boolean;
  revocable: boolean;
  apiKeyId?: string;
  telemetryAge?: string;
};

export type AccountUsageLog = {
  keyId?: string;
  repoUrl?: string;
  usedAt?: string;
  latencyMs?: number;
  status?: string;
  ip?: string | null;
  userAgent?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
};

export type AccountApiKey = {
  id: string;
  name: string;
  key_type: string;
  created_at?: string | null;
  is_active: boolean;
};

export type AccountProfileData = {
  fullName: string;
  avatarUrl: string;
  plan: string;
  orgSlug: string;
  webhookUrl: string;
  webhookSecret: string;
  githubConnected: boolean;
};

export type WebhookLogEntry = {
  id: string;
  event: string;
  url: string;
  status: number;
  latency: number;
  timestamp: number;
  requestBody: unknown;
  responseHeaders: Record<string, string>;
  responseBody: unknown;
};

export type AccountDataResponse = AccountUsageData;
