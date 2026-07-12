import type { CountOnlyDailyUsageTrend, DailyUsageTrend } from "@/types/usage";

export type ApiKeyType = "development" | "production";
export type ApiKeyDailyTrend = Array<CountOnlyDailyUsageTrend | DailyUsageTrend>;

export type ApiKey = {
  id: string;
  name: string;
  key_value: string;
  type: ApiKeyType;
  usage_count: number;
  monthly_limit: number | null;
  createdAt: string;
  is_active: boolean;
  alert_threshold: number | null;
  alert_channels: string[] | null;
  dailyTrend?: ApiKeyDailyTrend;
};

export type ApiKeyApiResponse = {
  id: string;
  name: string;
  key_value: string;
  key_type: ApiKeyType;
  usage_count: number;
  monthly_limit: number | null;
  created_at: string;
  is_active: boolean;
  alert_threshold: number | null;
  alert_channels: string[] | null;
  dailyTrend?: ApiKeyDailyTrend;
};

export type ApiKeyRow = ApiKeyApiResponse & {
  user_id: string;
};

export type ApiKeyMutationData = {
  name?: string;
  keyType?: ApiKeyType;
  monthlyLimit?: number | null;
  alertThreshold?: number | null;
  alertChannels?: string[];
  isActive?: boolean;
};

export type ValidatedApiKeyData = {
  id: string;
  name: string;
  usage_count: number;
  monthly_limit: number | null;
  user_id: string;
  key_type: ApiKeyType;
  plan?: string;
  is_active?: boolean;
  alert_threshold?: number | null;
  alert_channels?: string[] | null;
  email?: string | null;
  browserUserId?: string;
};
