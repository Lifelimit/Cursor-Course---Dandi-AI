export type ApiKey = {
  id: string;
  name: string;
  key_value: string;
  type: "development" | "production";
  usage_count: number;
  monthly_limit: number | null;
  createdAt: string;
  is_active: boolean;
  alert_threshold: number | null;
  alert_channels: string[] | null;
  alert_phone: string | null;
};

export type ApiKeyApiResponse = {
  id: string;
  name: string;
  key_value: string;
  key_type: "development" | "production";
  usage_count: number;
  monthly_limit: number | null;
  created_at: string;
  is_active: boolean;
  alert_threshold: number | null;
  alert_channels: string[] | null;
  alert_phone: string | null;
};

export function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function mapApiKey(row: ApiKeyApiResponse): ApiKey {
  return {
    id: row.id,
    name: row.name,
    key_value: row.key_value,
    type: row.key_type,
    usage_count: row.usage_count ?? 0,
    monthly_limit: row.monthly_limit ?? null,
    createdAt: row.created_at ? formatDate(new Date(row.created_at)) : formatDate(new Date()),
    is_active: row.is_active ?? true,
    alert_threshold: row.alert_threshold ?? null,
    alert_channels: row.alert_channels ?? null,
    alert_phone: row.alert_phone ?? null,
  };
}
