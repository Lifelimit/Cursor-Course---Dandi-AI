import { formatGitHubRepoLabel, getGitHubRepoPath } from "@/lib/github-url";

type DateInput = string | number | Date;

export const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

export const shortDateWithYearFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export const longDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

export const longDateWithoutYearFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
});

export const jobDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export const webhookTimeFormatter = new Intl.DateTimeFormat([], {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export const requestCountFormatter = new Intl.NumberFormat("en-US");

export function formatIsoDate(value: DateInput) {
  return new Date(value).toISOString().slice(0, 10);
}

export const formatDate = formatIsoDate;

export function formatIsoDatePart(value: string) {
  return value.split("T")[0];
}

export function formatLocalDate(value: DateInput) {
  return new Date(value).toLocaleDateString();
}

export function formatLocalTime(value: DateInput) {
  return new Date(value).toLocaleTimeString();
}

export function formatLocalDateTime(value: DateInput) {
  return new Date(value).toLocaleString();
}

export function formatShortDate(value: DateInput) {
  return shortDateFormatter.format(new Date(value));
}

export function formatShortDateWithYear(value: DateInput) {
  return shortDateWithYearFormatter.format(new Date(value));
}

export function formatLongDate(value: DateInput) {
  return longDateFormatter.format(new Date(value));
}

export function formatLongDateWithoutYear(value: DateInput) {
  return longDateWithoutYearFormatter.format(new Date(value));
}

export function formatJobDateTime(value: DateInput) {
  return jobDateTimeFormatter.format(new Date(value));
}

export function formatWebhookTime(value: DateInput) {
  return webhookTimeFormatter.format(new Date(value));
}

export function formatRequestCount(value: number) {
  return requestCountFormatter.format(value);
}

export function formatRequestLimit(value: number | null | undefined, unlimitedLabel = "∞") {
  return typeof value === "number" ? formatRequestCount(value) : unlimitedLabel;
}

export function formatMaskedApiKey(value: string | null | undefined) {
  if (!value) return "Hidden";
  if (value.length <= 12) return "Hidden";
  return `${value.slice(0, 8)} ... ${value.slice(-4)}`;
}

export function formatCurrency(value: number, options: { fromCents?: boolean } = {}) {
  const displayValue = options.fromCents ? value / 100 : value;
  const amount = `$${Math.abs(displayValue).toFixed(2)}`;
  return displayValue < 0 ? `-${amount}` : amount;
}

export function formatCurrencyFromCents(value: number) {
  return formatCurrency(value, { fromCents: true });
}

export function formatPercentage(value: number, fractionDigits?: number) {
  const displayValue = typeof fractionDigits === "number" ? value.toFixed(fractionDigits) : String(value);
  return `${displayValue}%`;
}

export function formatDuration(valueMs: number) {
  return valueMs >= 1000 ? `${(valueMs / 1000).toFixed(1)}s` : `${valueMs}ms`;
}

export function formatRelativeTime(
  value: DateInput | null | undefined,
  options: {
    current?: boolean;
    currentLabel?: string;
    emptyLabel?: string;
    futureLabel?: string;
    now?: DateInput;
  } = {}
) {
  if (options.current) return options.currentLabel ?? "Active now";
  if (!value) return options.emptyLabel ?? "No activity";

  const nowMs = options.now === undefined ? Date.now() : new Date(options.now).getTime();
  const diffMs = nowMs - new Date(value).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return options.futureLabel ?? "Recently";

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatRepositoryLabel(value: string, options: { trimTrailingSlash?: boolean } = {}) {
  return formatGitHubRepoLabel(value, options);
}

export function formatGitHubRepo(value: string, fallback = "unknown/repository") {
  return getGitHubRepoPath(value, fallback);
}
