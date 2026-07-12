import "server-only";
import nodemailer from "nodemailer";
import { getServerEnv } from "@/lib/env";
import { getURL } from "@/lib/utils/url-helper";

export type EmailDeliveryResult =
  | { status: "sent"; messageId?: string }
  | { status: "not_configured" }
  | { status: "failed" };

function getEmailConfiguration() {
  const env = getServerEnv();
  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_USER || !env.SMTP_PASS || !env.SMTP_FROM) {
    return null;
  }

  return {
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT),
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.SMTP_FROM,
  };
}

export function isEmailDeliveryConfigured() {
  try {
    return getEmailConfiguration() !== null;
  } catch {
    return false;
  }
}

async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<EmailDeliveryResult> {
  const config = getEmailConfiguration();
  if (!config) return { status: "not_configured" };

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.user, pass: config.pass },
    });
    const info = await transporter.sendMail({
      from: config.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
    });

    return {
      status: "sent",
      messageId: typeof info.messageId === "string" ? info.messageId : undefined,
    };
  } catch {
    console.error("Application email delivery failed.");
    return { status: "failed" };
  }
}

export async function sendAlertEmail(
  to: string,
  keyName: string,
  usagePct: number,
  threshold: number,
): Promise<EmailDeliveryResult> {
  const safeKeyName = keyName.replace(/[\r\n]+/g, " ").slice(0, 100);
  return sendEmail({
    to,
    subject: `Dandi API key usage alert (${safeKeyName})`,
    text: [
      `Your API key "${safeKeyName}" crossed its ${threshold}% alert threshold.`,
      `Current usage is ${Math.round(usagePct)}%.`,
      `Manage API keys: ${new URL("/account?tab=api", getURL()).toString()}`,
    ].join("\n\n"),
  });
}

export async function sendPlanChangeScheduledEmail(
  to: string,
  currentPlanName: string,
  newPlanName: string,
  effectiveDate: string,
): Promise<EmailDeliveryResult> {
  return sendEmail({
    to,
    subject: `Dandi plan change scheduled: ${currentPlanName} to ${newPlanName}`,
    text: [
      `Your plan change from ${currentPlanName} to ${newPlanName} is scheduled for ${effectiveDate}.`,
      `Review billing: ${new URL("/billing", getURL()).toString()}`,
    ].join("\n\n"),
  });
}
