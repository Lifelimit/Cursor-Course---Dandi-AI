import type { ApiKey, ApiKeyApiResponse, ApiKeyType } from "@/types/api-keys";
import type { UsageKeySummary } from "@/types/usage";
import { formatIsoDate } from "@/lib/format";

export type { ApiKey, ApiKeyApiResponse } from "@/types/api-keys";
export type { DailyUsageTrend } from "@/types/usage";

type ApiKeyMapperRow = ApiKeyApiResponse | UsageKeySummary;

export const formatDate = formatIsoDate;

// Dashboard SSR usage summaries intentionally omit `key_value`; normalize that
// response shape before it reaches components that render or search key values.
export function mapApiKey(row: ApiKeyMapperRow): ApiKey {
  return {
    id: row.id,
    name: row.name,
    key_value: row.key_value ?? "",
    type: row.key_type as ApiKeyType,
    usage_count: row.usage_count ?? 0,
    monthly_limit: row.monthly_limit ?? null,
    createdAt: row.created_at ? formatDate(new Date(row.created_at)) : formatDate(new Date()),
    is_active: row.is_active ?? true,
    alert_threshold: row.alert_threshold ?? null,
    alert_channels: row.alert_channels ?? null,
    dailyTrend: row.dailyTrend,
  };
}
