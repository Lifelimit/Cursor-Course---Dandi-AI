export type ApiKey = {
  id: string;
  name: string;
  key_value: string;
  type: "development" | "production";
  usage_count: number;
  monthly_limit: number | null;
  createdAt: string;
};

export type ApiKeyApiResponse = {
  id: string;
  name: string;
  key_value: string;
  key_type: "development" | "production";
  usage_count: number;
  monthly_limit: number | null;
  created_at: string;
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
  };
}
