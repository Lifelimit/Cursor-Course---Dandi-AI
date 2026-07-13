#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const outputDir = path.join(repoRoot, "public", "readme");
const authProfileDir = path.join(repoRoot, ".playwright-auth");
const baseUrl = (process.env.DANDI_SCREENSHOT_URL || "https://dandi-orcin.vercel.app").replace(/\/$/, "");
const headed = process.env.DANDI_SCREENSHOT_HEADED !== "0";
const cursorProfile = path.join(
  process.env.HOME || "",
  "Library/Application Support/Cursor/Partitions/cursor-browser",
);

const targets = [
  {
    name: "dandi-rag-chat.png",
    path: "/playground?mode=ask",
    ready: /Prepare|Ask|Repository/i,
    viewport: { width: 1440, height: 900 },
  },
  {
    name: "dandi-usage-dashboard.png",
    path: "/usage",
    ready: /Usage|Quota|requests/i,
    viewport: { width: 1440, height: 900 },
  },
  {
    name: "dandi-billing.png",
    path: "/billing",
    ready: /Billing|Plan|subscription/i,
    viewport: { width: 1440, height: 900 },
  },
  {
    name: "dandi-account-integrations.png",
    path: "/account?tab=integrations",
    ready: /GitHub|integration|Workspace settings/i,
    viewport: { width: 1440, height: 900 },
  },
];

function resolveProfileDir() {
  if (process.env.DANDI_USE_LIVE_CURSOR_PROFILE === "1") {
    return cursorProfile;
  }
  return authProfileDir;
}

async function ensureAuthenticated(page) {
  const probeUrl = `${baseUrl}/playground`;
  await page.goto(probeUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  if (!page.url().includes("/login")) {
    return;
  }

  console.log("Authentication required. Complete sign-in in the opened browser window.");
  console.log(`Waiting up to 3 minutes on ${probeUrl}`);

  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    await page.waitForTimeout(1000);
    if (!page.url().includes("/login")) {
      console.log("Authenticated session detected.");
      return;
    }
  }

  throw new Error("Timed out waiting for authentication.");
}

async function captureScreenshots() {
  const profileDir = resolveProfileDir();
  const context = await chromium.launchPersistentContext(profileDir, {
    headless: !headed,
    viewport: { width: 1440, height: 900 },
    args: ["--disable-dev-shm-usage"],
  });

  const page = context.pages()[0] || (await context.newPage());
  const results = [];

  try {
    await ensureAuthenticated(page);

    for (const target of targets) {
      const url = `${baseUrl}${target.path}`;
      console.log(`Capturing ${target.name} from ${url}`);
      await page.setViewportSize(target.viewport);
      await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });

      if (page.url().includes("/login")) {
        throw new Error(`Redirected to login while capturing ${target.name}.`);
      }

      await page.waitForTimeout(1200);
      await page.getByText(target.ready).first().waitFor({ state: "visible", timeout: 30000 });
      await page.screenshot({
        path: path.join(outputDir, target.name),
        fullPage: false,
      });
      results.push(target.name);
    }
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
