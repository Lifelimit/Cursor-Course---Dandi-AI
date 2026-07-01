import type { AccountUsageData } from "@/types/usage";

export type CurrentBrowserTelemetry = {
  id: string;
  label: string;
  detail?: string;
  ip: string | null;
  location: string | null;
  lastSeenAt: string | null;
  current: true;
  revocable: false;
  telemetryAge?: string;
};

export type AccountApiKeyAccess = {
  id: string;
  label: string;
  detail?: string;
  keyType: string;
  ip: null;
  location: null;
  lastSeenAt: string | null;
  current: false;
  revocable: boolean;
  apiKeyId: string;
  telemetryAge?: string;
  requestsThisMonth?: number;
  lastUsedAt?: string | null;
  lastUsedClient?: string | null;
  lastUsedIp?: string | null;
  lastUsedLocation?: string | null;
  latestRepoUrl?: string | null;
  latestStatus?: string | null;
};

export type AccountApiRequestActivity = {
  id: string;
  label: string;
  detail?: string;
  ip: string | null;
  location: string | null;
  lastSeenAt: string | null;
  current: false;
  revocable: false;
  apiKeyId?: string;
  telemetryAge?: string;
};

export type AccountAccessResponse = {
  currentBrowser: CurrentBrowserTelemetry;
  apiKeys: AccountApiKeyAccess[];
  recentRequests: AccountApiRequestActivity[];
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
