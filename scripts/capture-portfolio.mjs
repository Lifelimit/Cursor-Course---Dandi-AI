import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  createPortfolioUserViaAdmin,
  ensurePortfolioCredentials,
} from "./portfolio-auth.mjs";

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const outputDir = path.join(repoRoot, "public", "readme");
const baseUrl = "https://dandi-orcin.vercel.app";
const viewport = { width: 1440, height: 900 };
const mobileViewport = { width: 390, height: 844 };

async function loginPortfolioUser(page) {
  const credentials = await ensurePortfolioCredentials();
  console.log(`[auth] Ensuring portfolio account exists for ${credentials.email}`);
  await createPortfolioUserViaAdmin(credentials);

  console.log("[auth] Navigating to login page...");
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  console.log("[auth] Clicking Use password instead...");
  await page.getByRole("button", { name: /Use password instead/i }).click();
  await page.waitForTimeout(500);
  await page.getByLabel("Email address").fill(credentials.email);
  await page.locator('input[name="password"]').fill(credentials.password);
  await page.getByRole("button", { name: /Sign in/i }).click();

  console.log("[auth] Waiting for redirect...");
  await page.waitForURL((url) => !url.pathname.includes("/login") && !url.pathname.includes("/signup"), { timeout: 30000 });
  console.log("[auth] Logged in successfully!");
}

async function run() {
  console.log("Launching Chromium browser...");
  const browser = await chromium.launch({ headless: true });

  try {
    // -------------------------------------------------------------
    // 1. Capture Product Overview / Homepage (dandi-overview.png)
    // -------------------------------------------------------------
    console.log("Creating unauthenticated context for homepage...");
    const anonContext = await browser.newContext({ viewport });
    const anonPage = await anonContext.newPage();
    console.log(`Navigating to ${baseUrl}/...`);
    await anonPage.goto(baseUrl, { waitUntil: "networkidle", timeout: 60000 });
    await anonPage.waitForTimeout(2000);
    const overviewPath = path.join(outputDir, "dandi-overview.png");
    await anonPage.screenshot({ path: overviewPath, fullPage: false });
    console.log(`Captured dandi-overview.png at ${overviewPath}`);
    await anonContext.close();

    // -------------------------------------------------------------
    // Authenticated Journey setup
    // -------------------------------------------------------------
    console.log("Creating authenticated context...");
    const authContext = await browser.newContext({ viewport });
    const page = await authContext.newPage();
    await loginPortfolioUser(page);

    // -------------------------------------------------------------
    // 2. Capture Repository Summary Workflow (dandi-repository-summary.png)
    // -------------------------------------------------------------
    const summaryUrl = `${baseUrl}/playground?mode=summary`;
    console.log(`Navigating to ${summaryUrl}...`);
    await page.goto(summaryUrl, { waitUntil: "networkidle", timeout: 60000 });
    console.log("Clicking Try Sample Repository...");
    await page.getByRole("button", { name: /Try Sample Repository/i }).click();
    await page.waitForTimeout(1000);

    console.log("Clicking Summarize Repository...");
    await page.getByRole("button", { name: /Summarize Repository/i }).click();
    console.log("Waiting for repository summary to complete...");
    await page.getByText(/Repository summary|Overview|facebook\/react/i).first().waitFor({
      state: "visible",
      timeout: 120000,
    });
    await page.waitForTimeout(3000);
    const summaryResultPath = path.join(outputDir, "dandi-repository-summary.png");
    await page.screenshot({ path: summaryResultPath, fullPage: false });
    console.log(`Captured dandi-repository-summary.png at ${summaryResultPath}`);

    // -------------------------------------------------------------
    // 3. Capture RAG chat (dandi-rag-chat.png) - SKIPPED AS REQUESTED
    // -------------------------------------------------------------
    console.log("Skipping RAG chat capture as requested.");

    // -------------------------------------------------------------
    // 4. Capture Usage Dashboard (dandi-usage-dashboard.png)
    // -------------------------------------------------------------
    const usageUrl = `${baseUrl}/usage`;
    console.log(`Navigating to ${usageUrl}...`);
    await page.goto(usageUrl, { waitUntil: "networkidle", timeout: 60000 });
    await page.getByText(/Usage|Quota/i).first().waitFor({ state: "visible", timeout: 30000 });
    await page.waitForTimeout(2000);
    const usagePath = path.join(outputDir, "dandi-usage-dashboard.png");
    await page.screenshot({ path: usagePath, fullPage: false });
    console.log(`Captured dandi-usage-dashboard.png at ${usagePath}`);

    // -------------------------------------------------------------
    // 5. Capture Account Integrations (dandi-account-integrations.png)
    // -------------------------------------------------------------
    const accountUrl = `${baseUrl}/account?tab=integrations`;
    console.log(`Navigating to ${accountUrl}...`);
    await page.goto(accountUrl, { waitUntil: "networkidle", timeout: 60000 });
    await page.getByText(/GitHub|integration|Workspace settings/i).first().waitFor({ state: "visible", timeout: 30000 });
    await page.waitForTimeout(2000);
    const accountPath = path.join(outputDir, "dandi-account-integrations.png");
    await page.screenshot({ path: accountPath, fullPage: false });
    console.log(`Captured dandi-account-integrations.png at ${accountPath}`);

    await authContext.close();

    // -------------------------------------------------------------
    // 6. Capture Mobile Screenshot (dandi-mobile.png)
    // -------------------------------------------------------------
    console.log("Creating mobile context for landing page...");
    const mobileContext = await browser.newContext({
      viewport: mobileViewport,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
    });
    const mobilePage = await mobileContext.newPage();
    console.log(`Navigating to mobile ${baseUrl}/...`);
    await mobilePage.goto(baseUrl, { waitUntil: "networkidle", timeout: 60000 });
    await mobilePage.waitForTimeout(2000);
    const mobilePath = path.join(outputDir, "dandi-mobile.png");
    await mobilePage.screenshot({ path: mobilePath, fullPage: false });
    console.log(`Captured dandi-mobile.png at ${mobilePath}`);
    await mobileContext.close();

  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
}

run().catch((error) => {
  console.error("Execution failed:", error.message || error);
  process.exit(1);
});
