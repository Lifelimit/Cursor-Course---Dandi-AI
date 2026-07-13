#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
export const portfolioProfileDir = path.join(repoRoot, ".playwright-auth-portfolio");
export const credentialsPath = path.join(portfolioProfileDir, "credentials.json");

function loadEnvLocal() {
  const envPath = path.join(repoRoot, ".env.local");
  if (!existsSync(envPath)) {
    throw new Error("Missing .env.local with Supabase credentials.");
  }

  const env = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function createAdminClient() {
  const env = loadEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function generatePortfolioCredentials() {
  const suffix = Date.now().toString(36);
  return {
    fullName: "Portfolio Demo",
    email: `portfolio-demo-${suffix}@example.com`,
    password: `Dandi${randomBytes(12).toString("base64url")}1!`,
  };
}

export function readPortfolioCredentials() {
  if (!existsSync(credentialsPath)) {
    return null;
  }
  return JSON.parse(readFileSync(credentialsPath, "utf8"));
}

export function writePortfolioCredentials(credentials) {
  mkdirSync(portfolioProfileDir, { recursive: true });
  writeFileSync(
    credentialsPath,
    JSON.stringify(
      {
        ...credentials,
        savedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
}

export async function confirmPortfolioUserEmail(admin, email) {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;

  const user = data.users.find((entry) => entry.email === email);
  if (!user) {
    throw new Error(`Portfolio user not found for ${email}`);
  }

  if (user.email_confirmed_at) {
    return user;
  }

  const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    email_confirm: true,
  });
  if (updateError) throw updateError;
  return updated.user;
}

export async function ensurePortfolioCredentials({ forceNew = false } = {}) {
  if (!forceNew) {
    const existing = readPortfolioCredentials();
    if (existing?.email && existing?.password) {
      return existing;
    }
  }

  const credentials = generatePortfolioCredentials();
  writePortfolioCredentials(credentials);
  return credentials;
}

export async function confirmPortfolioAccount(credentials) {
  const admin = createAdminClient();
  const user = await confirmPortfolioUserEmail(admin, credentials.email);
  return {
    ...credentials,
    userId: user.id,
    confirmed: Boolean(user.email_confirmed_at),
  };
}

export async function createPortfolioUserViaAdmin(credentials) {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: credentials.email,
    password: credentials.password,
    email_confirm: true,
    user_metadata: { full_name: credentials.fullName },
  });

  if (error) {
    if (/already|registered|exists/i.test(error.message)) {
      return confirmPortfolioAccount(credentials);
    }
    throw error;
  }

  return {
    ...credentials,
    userId: data.user.id,
    confirmed: true,
    createdVia: "admin",
  };
}
