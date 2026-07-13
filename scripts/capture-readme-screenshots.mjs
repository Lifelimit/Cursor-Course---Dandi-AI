#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  confirmPortfolioAccount,
  createPortfolioUserViaAdmin,
  ensurePortfolioCredentials,
  portfolioProfileDir,
} from "./portfolio-auth.mjs";

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const outputDir = path.join(repoRoot, "public", "readme");
const authProfileDir = path.join(repoRoot, ".playwright-auth");
const baseUrl = (process.env.DANDI_SCREENSHOT_URL || "https://dandi-orcin.vercel.app").replace(/\/$/, "");
const headed = process.env.DANDI_SCREENSHOT_HEADED !== "0";
const portfolioMode = process.env.DANDI_PORTFOLIO_MODE === "1";
const forceNewAccount = process.env.DANDI_PORTFOLIO_FORCE_NEW === "1";
const viewport = { width: 1440, height: 900 };

const staticTargets = [
  {
    name: "dandi-dashboard.png",
    path: "/dashboards",
    ready: /Dashboard|Workspace|repository/i,
  },
  {
    name: "dandi-usage-dashboard.png",
    path: "/usage",
    ready: /Usage|Quota|requests/i,
  },
  {
    name: "dandi-billing.png",
    path: "/billing",
    ready: /Billing|Plan|subscription/i,
  },
  {
    name: "dandi-account-integrations.png",
    path: "/account?tab=integrations",
    ready: /GitHub|integration|Workspace settings/i,
  },
  {
    name: "dandi-account-api.png",
    path: "/account?tab=api",
    ready: /API key|Create key|Vault/i,
  },
];

function resolveProfileDir() {
  if (portfolioMode) {
    return portfolioProfileDir;
  }
  return authProfileDir;
}

async function waitForAuthenticated(page, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!page.url().includes("/login") && !page.url().includes("/signup")) {
      return;
    }
    await page.waitForTimeout(1000);
  }
  throw new Error("Timed out waiting for authenticated session.");
}

async function signUpFromScratch(page, credentials) {
  console.log(`Creating portfolio account for ${credentials.email}`);
  await page.goto(`${baseUrl}/signup`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.getByLabel("Full name").fill(credentials.fullName);
  await page.getByLabel("Email address").fill(credentials.email);
  await page.locator('input[name="password"]').fill(credentials.password);
  await page.getByRole("button", { name: /Create workspace/i }).click();

  try {
    await Promise.race([
      page.waitForURL((url) => !url.pathname.includes("/signup"), { timeout: 20000 }),
      page.getByText(/Check your inbox|Account created/i).waitFor({ state: "visible", timeout: 20000 }),
    ]);
  } catch {
    // Fall through to confirmation/login handling.
  }

  if (!page.url().includes("/login") && !page.url().includes("/signup")) {
    console.log("Signup returned an active session.");
    return;
  }

  const hasInboxMessage = await page
    .getByText(/Check your inbox|Account created/i)
    .isVisible()
    .catch(() => false);
  const hasAuthError = await page
    .getByText(/AUTH_REQUEST_FAILED|could not complete sign-in/i)
    .isVisible()
    .catch(() => false);

  if (hasInboxMessage) {
    console.log("Confirming portfolio account email via Supabase admin.");
    await confirmPortfolioAccount(credentials);
  } else if (hasAuthError) {
    console.log("Signup failed in production auth flow; creating confirmed portfolio user via admin.");
    await createPortfolioUserViaAdmin(credentials);
  } else {
    console.log("Signup did not return a session; ensuring portfolio account exists via admin.");
    await createPortfolioUserViaAdmin(credentials);
  }

  console.log("Signing in with the new portfolio account.");
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.getByLabel("Email address").fill(credentials.email);
  await page.locator('input[name="password"]').fill(credentials.password);
  await page.getByRole("button", { name: /Sign in/i }).click();
  await waitForAuthenticated(page);
}

async function ensureAuthenticated(page) {
  const probeUrl = `${baseUrl}/dashboards`;
  await page.goto(probeUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  if (!page.url().includes("/login") && !page.url().includes("/signup")) {
    return;
  }

  if (portfolioMode) {
    const credentials = await ensurePortfolioCredentials({ forceNew: forceNewAccount });
    await signUpFromScratch(page, credentials);
    return;
  }

  console.log("Authentication required. Complete sign-in in the opened browser window.");
  console.log(`Waiting up to 3 minutes on ${probeUrl}`);
  await waitForAuthenticated(page, 180_000);
}

async function captureTarget(page, target) {
  const url = `${baseUrl}${target.path}`;
  console.log(`Capturing ${target.name} from ${url}`);
  await page.setViewportSize(viewport);
  await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });

  if (page.url().includes("/login") || page.url().includes("/signup")) {
    throw new Error(`Redirected to auth while capturing ${target.name}.`);
  }

  await page.waitForTimeout(1200);
  await page.getByText(target.ready).first().waitFor({ state: "visible", timeout: 45000 });
  await page.screenshot({
    path: path.join(outputDir, target.name),
    fullPage: false,
  });
}

async function capturePlaygroundScreenshots(page) {
  await page.setViewportSize(viewport);
  await page.goto(`${baseUrl}/playground?mode=summary`, {
    waitUntil: "networkidle",
    timeout: 90000,
  });
  await page.getByText(/Summarize a repository|Summarizer/i).first().waitFor({
    state: "visible",
    timeout: 45000,
  });
  await page.screenshot({
    path: path.join(outputDir, "dandi-playground-summarize.png"),
    fullPage: false,
  });

  await page.getByRole("button", { name: /Try Sample Repository/i }).click();
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(outputDir, "dandi-repository-summary.png"),
    fullPage: false,
  });

  const summarizeButton = page.getByRole("button", { name: /Summarize Repository/i });
  if (await summarizeButton.isVisible().catch(() => false)) {
    await summarizeButton.click();
    await page.getByText(/Repository summary|Generating|Overview|facebook\/react/i).first().waitFor({
      state: "visible",
      timeout: 120000,
    });
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: path.join(outputDir, "dandi-repository-summary-result.png"),
      fullPage: false,
    });
  }

  await page.goto(`${baseUrl}/playground?mode=ask`, {
    waitUntil: "networkidle",
    timeout: 90000,
  });
  await page.getByRole("button", { name: /Try Sample Repository/i }).click();
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(outputDir, "dandi-rag-chat.png"),
    fullPage: false,
  });
}

async function captureScreenshots() {
  const profileDir = resolveProfileDir();
  const context = await chromium.launchPersistentContext(profileDir, {
    headless: !headed,
    viewport,
    args: ["--disable-dev-shm-usage"],
  });

  const page = context.pages()[0] || (await context.newPage());
  const results = [];

  try {
    await ensureAuthenticated(page);

    for (const target of staticTargets) {
      await captureTarget(page, target);
      results.push(target.name);
    }

    await capturePlaygroundScreenshots(page);
    results.push(
      "dandi-playground-summarize.png",
      "dandi-repository-summary.png",
      "dandi-repository-summary-result.png",
      "dandi-rag-chat.png",
    );
  } finally {
    await context.close();
  }

  console.log(`Saved ${results.length} screenshots to ${outputDir}`);
  for (const name of results) {
    console.log(`- ${name}`);
  }
}

captureScreenshots().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
