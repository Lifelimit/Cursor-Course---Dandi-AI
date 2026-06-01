import { PLAN_DETAILS } from "@/lib/constants";
import {
  AlertChannel,
  clampInteger,
  isStripePaymentMethodId,
  isUuid,
  normalizeAlertChannels,
  normalizeGitHubRepoUrl,
} from "@/lib/security-core";

export type ApiKeySettings = {
  name?: string;
  keyType?: "development" | "production";
  monthlyLimit?: number | null;
  alertThreshold?: number | null;
  alertChannels?: AlertChannel[];
  alertPhone?: string | null;
  isActive?: boolean;
};

export function getJsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function getPlanLimit(plan: string) {
  return PLAN_DETAILS[plan as keyof typeof PLAN_DETAILS]?.monthlyLimit ?? PLAN_DETAILS.Hobby.monthlyLimit;
}

export function validateMonthlyLimit(value: unknown, plan: string) {
  if (value === null) return null;
  if (value === undefined) return undefined;

  const planLimit = getPlanLimit(plan);
  const parsed = clampInteger(value, { min: 1, max: planLimit ?? undefined });
  if (parsed === null) {
    throw new Error(planLimit === null ? "Monthly limit must be a positive integer." : `Monthly limit must be between 1 and ${planLimit}.`);
  }
  return parsed;
}

export function parseApiKeySettings(
  body: Record<string, unknown>,
  options: { plan: string; requireName?: boolean; partial?: boolean }
): ApiKeySettings {
  const settings: ApiKeySettings = {};
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if ((options.requireName || body.name !== undefined) && !name) {
    throw new Error("Name is required.");
  }

  if (name) {
    if (name.length > 100) throw new Error("Name must be 100 characters or less.");
    settings.name = name;
  } else if (!options.partial && !options.requireName) {
    settings.name = "";
  }

  if (body.keyType !== undefined) {
    settings.keyType = body.keyType === "production" ? "production" : "development";
  }

  if (body.monthlyLimit !== undefined) {
    settings.monthlyLimit = validateMonthlyLimit(body.monthlyLimit, options.plan);
  }

  const threshold = body.alert_threshold ?? body.alertThreshold;
  if (threshold !== undefined) {
    if (threshold === null) {
      settings.alertThreshold = null;
    } else {
      const parsed = clampInteger(threshold, { min: 0, max: 100 });
      if (parsed === null) throw new Error("Alert threshold must be an integer between 0 and 100.");
      settings.alertThreshold = parsed;
    }
  }

  const channels = body.alert_channels ?? body.alertChannels;
  if (channels !== undefined) {
    settings.alertChannels = normalizeAlertChannels(channels);
  }

  const phone = body.alert_phone ?? body.phone;
  if (phone !== undefined) {
    if (phone === null || phone === "") {
      settings.alertPhone = null;
    } else if (typeof phone === "string" && phone.trim().length <= 32) {
      settings.alertPhone = phone.trim();
    } else {
      throw new Error("Alert phone must be 32 characters or less.");
    }
  }

  const active = body.is_active ?? body.isActive;
  if (active !== undefined) {
    if (typeof active !== "boolean") throw new Error("isActive must be a boolean.");
    settings.isActive = active;
  }

  return settings;
}

export function validateUuidList(value: unknown, options: { min?: number; max: number }) {
  if (!Array.isArray(value) || value.length < (options.min ?? 0) || value.length > options.max) {
    throw new Error(`Expected between ${options.min ?? 0} and ${options.max} IDs.`);
  }

  if (!value.every(isUuid)) {
    throw new Error("All IDs must be valid UUIDs.");
  }

  return Array.from(new Set(value));
}

export function validatePaymentMethodId(value: unknown) {
  if (!isStripePaymentMethodId(value)) {
    throw new Error("Invalid payment method ID.");
  }
  return value;
}

export function validateGitHubRepoUrl(value: unknown) {
  const normalized = normalizeGitHubRepoUrl(value);
  if (!normalized) {
    throw new Error("Invalid GitHub repository URL.");
  }
  return normalized;
}
