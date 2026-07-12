#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const envFile = path.resolve(process.env.DANDI_ENV_FILE || path.join(repoRoot, ".env.local"));
const shouldProbe = process.argv.includes("--probe") || process.env.DANDI_RUN_EXTERNAL_PROBES === "1";

function parseEnvFile(filename) {
  if (!fs.existsSync(filename)) return new Map();

  const values = new Map();
  for (const rawLine of fs.readFileSync(filename, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = line.match(/^(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;

    let value = match[2].trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values.set(match[1], value);
  }
  return values;
}

const fileValues = parseEnvFile(envFile);
const values = new Map([...fileValues, ...Object.entries(process.env).filter(([, value]) => value).map(([key, value]) => [key, value])]);

function getValue(key) {
  return values.get(key)?.trim() || "";
}

function isPlaceholder(value) {
  return !value || /your[-_]|placeholder|mock|example\.|\.\.\.|replace[-_]?me/i.test(value);
}

function hasValue(key) {
  return !isPlaceholder(getValue(key));
}

function hasGoogleKey() {
  if (hasValue("GOOGLE_API_KEY")) return true;
  if (hasValue("GOOGLE_GENERATIVE_AI_API_KEY")) return true;
  return getValue("GOOGLE_API_KEYS").split(",").some((key) => !isPlaceholder(key.trim()));
}

function statusFor(key) {
  const value = getValue(key);
  return !value ? "missing" : isPlaceholder(value) ? "placeholder" : "configured";
}

function printStatus(label, status) {
  console.log(`${status === "configured" ? "[ok]" : "[--]"} ${label}: ${status}`);
}

console.log(`Dandi external validation readiness (${envFile})`);
printStatus("Supabase URL", statusFor("NEXT_PUBLIC_SUPABASE_URL"));
printStatus("Supabase anon key", statusFor("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
printStatus("Supabase service role", statusFor("SUPABASE_SERVICE_ROLE_KEY"));
printStatus("Stripe secret key", statusFor("STRIPE_SECRET_KEY"));
printStatus("Stripe webhook secret", statusFor("STRIPE_WEBHOOK_SECRET"));
printStatus("Google API key set", hasGoogleKey() ? "configured" : "missing");
printStatus("GitHub token (private-flow validation)", statusFor("GITHUB_TOKEN"));
printStatus("SMTP password (email-flow validation)", statusFor("SMTP_PASS"));
printStatus("Cron secret (delivery-worker validation)", statusFor("CRON_SECRET"));
printStatus("Webhook receiver target", statusFor("DANDI_WEBHOOK_RECEIVER_URL"));

const readOnlyPrerequisites = [
  ["NEXT_PUBLIC_SUPABASE_URL", hasValue("NEXT_PUBLIC_SUPABASE_URL")],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", hasValue("NEXT_PUBLIC_SUPABASE_ANON_KEY")],
  ["STRIPE_SECRET_KEY", hasValue("STRIPE_SECRET_KEY")],
  ["GOOGLE_API_KEYS / GOOGLE_API_KEY", hasGoogleKey()],
];
const missingReadOnly = readOnlyPrerequisites.filter(([, ready]) => !ready).map(([key]) => key);

const probeValue = (key) => getValue(key);
async function probe(name, url, options = {}, expectedStatuses = []) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const ok = (response.status >= 200 && response.status < 300) || expectedStatuses.includes(response.status);
    console.log(`[${ok ? "ok" : "!!"}] ${name}: HTTP ${response.status}`);
    if (!ok) probeFailures += 1;
    return ok;
  } catch (error) {
    console.log(`[!!] ${name}: ${error instanceof Error ? error.name : "request failed"}`);
    probeFailures += 1;
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

let probeFailures = 0;

if (shouldProbe) {
  console.log("\nRead-only probes enabled; no customer, payment, email, AI-generation, or webhook-delivery mutations are attempted.");

  if (hasValue("STRIPE_SECRET_KEY")) {
    await probe("Stripe account metadata", "https://api.stripe.com/v1/account", {
      headers: { Authorization: `Bearer ${probeValue("STRIPE_SECRET_KEY")}` },
    });
  }

  if (hasGoogleKey()) {
    const googleKey = hasValue("GOOGLE_API_KEY")
      ? probeValue("GOOGLE_API_KEY")
      : hasValue("GOOGLE_GENERATIVE_AI_API_KEY")
        ? probeValue("GOOGLE_GENERATIVE_AI_API_KEY")
        : probeValue("GOOGLE_API_KEYS").split(",").find((key) => !isPlaceholder(key.trim()))?.trim();
    await probe("Google model catalog", `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(googleKey)}`);
  }

  if (hasValue("NEXT_PUBLIC_SUPABASE_URL") && hasValue("NEXT_PUBLIC_SUPABASE_ANON_KEY")) {
    const supabaseUrl = new URL("/auth/v1/settings", probeValue("NEXT_PUBLIC_SUPABASE_URL")).toString();
    await probe("Supabase Auth settings", supabaseUrl, {
      headers: {
        apikey: probeValue("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
        Authorization: `Bearer ${probeValue("NEXT_PUBLIC_SUPABASE_ANON_KEY")}`,
      },
    });
  }

  await probe("GitHub public README", "https://api.github.com/repos/facebook/react/readme", {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "dandi-external-validation" },
  });

  const baseUrl = probeValue("DANDI_BASE_URL");
  if (baseUrl && /^https?:\/\//i.test(baseUrl)) {
    await probe("Dandi CSP response", new URL("/", baseUrl).toString());
    const expectedWorkerStatuses = hasValue("CRON_SECRET") ? [401] : [503];
    await probe(
      "Webhook worker auth boundary",
      new URL("/api/internal/webhook-delivery", baseUrl).toString(),
      {},
      expectedWorkerStatuses,
    );
  }
} else {
  console.log("\nRead-only probes not run. Pass --probe or DANDI_RUN_EXTERNAL_PROBES=1 to opt in.");
}

if (missingReadOnly.length > 0) {
  console.log(`\nRead-only probe prerequisites missing: ${missingReadOnly.join(", ")}`);
  process.exitCode = 2;
} else if (probeFailures > 0) {
  console.log(`\nRead-only probes failed: ${probeFailures}`);
  process.exitCode = 1;
} else {
  console.log("\nRead-only probe prerequisites are configured.");
}

console.log("\nStill intentionally gated: authenticated journeys, private GitHub, live AI/RAG generation, email delivery, Stripe mutations, and real webhook receivers.");
