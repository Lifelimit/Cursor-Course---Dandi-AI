import type { StatusPillProps } from "@/components/command/StatusPill";
import type { ApiKeyType } from "@/types/api-keys";
import type { IngestionJobStatus } from "@/types/rag";

export type StatusTone = NonNullable<StatusPillProps["tone"]>;

export function getInvoiceStatusTone(status: string | null | undefined): StatusTone {
  if (status === "paid") return "success";
  if (status === "failed" || status === "uncollectible") return "danger";
  if (status === "pending" || status === "unpaid" || status === "open") return "warning";
  return "neutral";
}

export function getHttpStatusTone(status: number | null | undefined): StatusTone {
  if (typeof status !== "number" || !Number.isFinite(status)) return "neutral";
  if (status >= 200 && status < 300) return "success";
  return "danger";
}

export function getWebhookDeliveryStatusTone(status: number | null | undefined): StatusTone {
  return getHttpStatusTone(status);
}

export function getIngestionStatusTone(status: IngestionJobStatus | string | null | undefined): StatusTone {
  if (status === "completed") return "success";
  if (status === "failed") return "danger";
  if (status === "running") return "warning";
  if (status === "queued") return "info";
  return "neutral";
}

export function getApiKeyStatusTone(isActive: boolean | null | undefined): "success" | "warning" {
  return isActive ? "success" : "warning";
}

export function getApiKeyTypeTone(type: ApiKeyType | string | null | undefined): StatusTone {
  if (type === "production") return "info";
  if (type === "development") return "warning";
  return "neutral";
}

export function getBrowserSessionStatusTone(isCurrent: boolean | null | undefined): StatusTone {
  return isCurrent ? "success" : "neutral";
}

export function getNetworkLogStatusTone(status: string | null | undefined): StatusTone {
  if (status === "success") return "success";
  if (status === "error") return "danger";
  if (status === "pending" || status === "running") return "warning";
  if (status === "idle") return "neutral";
  return "neutral";
}
