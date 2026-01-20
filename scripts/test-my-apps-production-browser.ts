/**
 * Production /my-apps Browser Test Script
 *
 * This script uses Playwright to test the /my-apps functionality on production:
 * 1. Opens https://spike.land/my-apps in Chrome
 * 2. Creates 5 different apps using the agent
 * 3. Verifies that previews are rendered correctly
 * 4. Captures screenshots and logs for debugging
 *
 * Usage: yarn tsx scripts/test-my-apps-production-browser.ts
 */

import { type Browser, chromium, type Page } from "@playwright/test";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

const PROD_URL = "https://spike.land";
const TEST_APPS = [
  {
    name: "Todo App",
    prompt: "Create a simple todo list app with add, delete, and mark complete functionality",
  },
  {
    name: "Counter App",
    prompt: "Create a counter app with increment, decrement, and reset buttons",
  },
  {
    name: "Color Picker",
    prompt: "Create a color picker app that shows the selected color in a large preview",
  },
  {
    name: "Random Quote",
    prompt:
      "Create an app that displays random inspirational quotes with a button to get new quotes",
  },
  {
    name: "Calculator",
    prompt: "Create a simple calculator with basic operations: +, -, *, /",
  },
];

interface TestResult {
  appName: string;
  prompt: string;
  success: boolean;
  error?: string;
  screenshotPath?: string;
  appUrl?: string;
  agentResponseTime?: number;
  previewVisible?: boolean;
}

async function waitForAgentResponse(page: Page, timeoutMs = 120000): Promise<boolean> {
  try {
    // Wait for the agent response to appear (look for the preview iframe or success message)
    await page.waitForSelector('iframe[src*="testing.spike.land/live"]', {
      timeout: timeoutMs,
      state: "visible",
    });
    return true;
  } catch (error) {
    console.error("Timeout waiting for agent response:", error);
    return false;
  }
}

async function takeScreenshot(page: Page, name: string): Promise<string> {
  const screenshotsDir = join(process.cwd(), "test-screenshots");
  await mkdir(screenshotsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${name}-${timestamp}.png`;
  const filepath = join(screenshotsDir, filename);

  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 Screenshot saved: ${filepath}`);

  return filepath;
}

async function createApp(
  page: Page,
  testApp: typeof TEST_APPS[0],
  index: number,
): Promise<TestResult> {
  const startTime = Date.now();
  const result: TestResult = {
    appName: testApp.name,
    prompt: testApp.prompt,
    success: false,
  };

  try {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Test ${index + 1}/${TEST_APPS.length}: ${testApp.name}`);
    console.log(`Prompt: ${testApp.prompt}`);
    console.log(`${"=".repeat(60)}\n`);

    // Navigate to /my-apps/new to create a new app
    console.log("🌐 Navigating to /my-apps/new...");
    await page.goto(`${PROD_URL}/my-apps/new`, { waitUntil: "networkidle" });

    // Wait for redirect to the codespace page (e.g., /my-apps/swift.forge.launch.abc1)
    await page.waitForURL(/\/my-apps\/[^\/]+$/, { timeout: 10000 });
    const currentUrl = page.url();
    result.appUrl = currentUrl;
    console.log(`✅ Redirected to: ${currentUrl}`);

    // Take initial screenshot
    result.screenshotPath = await takeScreenshot(
      page,
      `${index + 1}-${testApp.name.toLowerCase().replace(/\s+/g, "-")}-initial`,
    );

    // Find the chat input and type the prompt
    console.log("💬 Finding chat input...");
    const chatInput = page.locator(
      'textarea[placeholder*="message"], input[placeholder*="message"], textarea[name="message"]',
    ).first();
    await chatInput.waitFor({ state: "visible", timeout: 10000 });

    console.log(`⌨️  Typing prompt: ${testApp.prompt}`);
    await chatInput.fill(testApp.prompt);

    // Submit the message (look for send button or press Enter)
    console.log("📤 Sending message...");
    const sendButton = page.locator('button[type="submit"], button:has-text("Send")').first();

    if (await sendButton.isVisible()) {
      await sendButton.click();
    } else {
      await chatInput.press("Enter");
    }

    // Wait for agent response
    console.log("⏳ Waiting for agent response (max 2 minutes)...");
    const responseReceived = await waitForAgentResponse(page, 120000);

    if (!responseReceived) {
      throw new Error("Agent did not respond within timeout");
    }

    result.agentResponseTime = Date.now() - startTime;
    console.log(`✅ Agent responded in ${(result.agentResponseTime / 1000).toFixed(1)}s`);

    // Check if preview iframe is visible
    const previewIframe = page.locator('iframe[src*="testing.spike.land/live"]').first();
    result.previewVisible = await previewIframe.isVisible();

    if (result.previewVisible) {
      console.log("✅ Preview is visible");

      // Get the preview URL from iframe src
      const previewSrc = await previewIframe.getAttribute("src");
      console.log(`🔗 Preview URL: ${previewSrc}`);
    } else {
      console.log("❌ Preview is NOT visible");
    }

    // Take final screenshot
    await takeScreenshot(
      page,
      `${index + 1}-${testApp.name.toLowerCase().replace(/\s+/g, "-")}-final`,
    );

    // Wait a bit to ensure everything is rendered
    await page.waitForTimeout(2000);

    result.success = true;
    console.log(`✅ Test completed successfully for: ${testApp.name}`);
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    console.error(`❌ Test failed for ${testApp.name}:`, result.error);

    // Take error screenshot
    try {
      await takeScreenshot(
        page,
        `${index + 1}-${testApp.name.toLowerCase().replace(/\s+/g, "-")}-error`,
      );
    } catch (screenshotError) {
      console.error("Failed to take error screenshot:", screenshotError);
    }
  }

  return result;
}

async function runTests() {
  let browser: Browser | null = null;
  const results: TestResult[] = [];

  try {
    console.log("🚀 Starting production /my-apps browser tests...\n");
    console.log(`Target URL: ${PROD_URL}/my-apps`);
    console.log(`Total tests: ${TEST_APPS.length}\n`);

    // Launch browser
    console.log("🌐 Launching Chrome browser...");
    browser = await chromium.launch({
      headless: false, // Run in headed mode so we can see what's happening
      slowMo: 100, // Slow down actions for better visibility
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    });

    const page = await context.newPage();

    // Enable console logging from the browser
    page.on("console", (msg) => {
      console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
    });

    // Check if we need to log in first
    console.log("🔐 Checking authentication...");
    await page.goto(`${PROD_URL}/my-apps`, { waitUntil: "networkidle" });

    // If redirected to login, we need to handle auth
    if (page.url().includes("/login") || page.url().includes("/signin")) {
      console.log("⚠️  Authentication required!");
      console.log("Please log in manually in the browser window...");
      console.log("Waiting 60 seconds for manual login...");

      await page.waitForURL(/\/my-apps/, { timeout: 60000 });
      console.log("✅ Login successful!");
    }

    // Run tests sequentially
    for (let i = 0; i < TEST_APPS.length; i++) {
      const result = await createApp(page, TEST_APPS[i]!, i);
      results.push(result);

      // Wait between tests to avoid rate limiting
      if (i < TEST_APPS.length - 1) {
        console.log("\n⏸️  Waiting 5 seconds before next test...\n");
        await page.waitForTimeout(5000);
      }
    }

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("TEST SUMMARY");
    console.log("=".repeat(60) + "\n");

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`✅ Successful: ${successful}/${TEST_APPS.length}`);
    console.log(`❌ Failed: ${failed}/${TEST_APPS.length}`);
    console.log("");

    results.forEach((result, i) => {
      const status = result.success ? "✅" : "❌";
      console.log(`${status} ${i + 1}. ${result.appName}`);
      if (result.success) {
        console.log(`   Response time: ${(result.agentResponseTime! / 1000).toFixed(1)}s`);
        console.log(`   Preview visible: ${result.previewVisible ? "Yes" : "No"}`);
        console.log(`   URL: ${result.appUrl}`);
      } else {
        console.log(`   Error: ${result.error}`);
      }
      console.log("");
    });

    // Save results to JSON
    const resultsPath = join(process.cwd(), "test-screenshots", "test-results.json");
    await writeFile(resultsPath, JSON.stringify(results, null, 2));
    console.log(`📊 Detailed results saved to: ${resultsPath}`);
  } catch (error) {
    console.error("❌ Fatal error during tests:", error);
    throw error;
  } finally {
    if (browser) {
      console.log("\n🔚 Closing browser...");
      await browser.close();
    }
  }

  // Exit with error code if any tests failed
  const anyFailed = results.some(r => !r.success);
  process.exit(anyFailed ? 1 : 0);
}

// Run the tests
runTests().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
