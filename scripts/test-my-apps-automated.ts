#!/usr/bin/env tsx
/**
 * Automated testing script for /my-apps functionality
 * Uses Playwright to test app creation flow
 */

import { type Browser, chromium, type Page } from "@playwright/test";
import { setTimeout } from "timers/promises";

const APP_TESTS = [
  {
    name: "Click Counter",
    prompt: "Create a simple click counter with a button and display showing the current count",
    verifyText: "count",
  },
  {
    name: "Todo List",
    prompt: "Build a todo list app with add, delete, and toggle complete functionality",
    verifyText: "todo",
  },
  {
    name: "Color Picker",
    prompt: "Create a color picker app that shows the selected color in hex, rgb, and hsl formats",
    verifyText: "color",
  },
  {
    name: "Calculator",
    prompt: "Build a simple calculator app with basic operations: add, subtract, multiply, divide",
    verifyText: "calculator",
  },
  {
    name: "Weather Dashboard",
    prompt:
      "Create a weather dashboard showing temperature, conditions, and a 5-day forecast with mock data",
    verifyText: "weather",
  },
];

interface TestResult {
  appName: string;
  success: boolean;
  agentResponded: boolean;
  previewVisible: boolean;
  previewUrlFound: boolean;
  errors: string[];
  duration: number;
}

async function testMyApps(baseUrl: string, environment: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Testing /my-apps on ${environment}`);
  console.log(`URL: ${baseUrl}/my-apps`);
  console.log("=".repeat(60));

  let browser: Browser | null = null;
  let page: Page | null = null;
  const results: TestResult[] = [];

  try {
    // Launch browser
    console.log("\n🚀 Launching browser...");
    browser = await chromium.launch({
      headless: false, // Show browser for debugging
      args: ["--start-maximized"],
    });

    const context = await browser.newContext({
      viewport: null, // Use full screen
      bypassCSP: true,
    });

    page = await context.newPage();

    // Setup console monitoring
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.error(`❌ Console Error: ${msg.text()}`);
      }
    });

    // Navigate to /my-apps
    console.log(`\n📍 Navigating to ${baseUrl}/my-apps...`);
    await page.goto(`${baseUrl}/my-apps`, { waitUntil: "networkidle" });
    await setTimeout(2000);

    // Check if we need to login
    const needsLogin = await page.locator("text=Login").isVisible().catch(() => false);
    if (needsLogin) {
      console.log("⚠️  Login required - please login manually");
      console.log("Waiting 30 seconds for manual login...");
      await setTimeout(30000);
    }

    // Test each app
    for (let i = 0; i < APP_TESTS.length; i++) {
      const test = APP_TESTS[i]!;
      const startTime = Date.now();
      const result: TestResult = {
        appName: test.name,
        success: false,
        agentResponded: false,
        previewVisible: false,
        previewUrlFound: false,
        errors: [],
        duration: 0,
      };

      try {
        console.log(`\n${"─".repeat(60)}`);
        console.log(`📱 Test ${i + 1}/${APP_TESTS.length}: ${test.name}`);
        console.log(`─${"─".repeat(59)}`);

        // Click "Create New App" or navigate to new app
        console.log("➕ Creating new app...");
        const createButton = page.locator('button:has-text("Create New App")').first();
        if (await createButton.isVisible().catch(() => false)) {
          await createButton.click();
          await setTimeout(2000);
        } else {
          // Navigate directly
          await page.goto(`${baseUrl}/my-apps/new`, { waitUntil: "networkidle" });
          await setTimeout(2000);
        }

        // Enter app name if prompted
        const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
        if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await nameInput.fill(`Test App - ${test.name}`);
          await setTimeout(500);

          // Click next/continue if there's a button
          const nextButton = page.locator(
            'button:has-text("Next"), button:has-text("Continue"), button:has-text("Create")',
          ).first();
          if (await nextButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await nextButton.click();
            await setTimeout(2000);
          }
        }

        // Find the chat input
        console.log("💬 Finding chat input...");
        const chatInput = page.locator('textarea, input[type="text"]').last();
        await chatInput.waitFor({ state: "visible", timeout: 10000 });

        // Type the prompt
        console.log(`📝 Sending prompt: "${test.prompt.substring(0, 50)}..."`);
        await chatInput.fill(test.prompt);
        await setTimeout(1000);

        // Send message (Enter or button)
        const sendButton = page.locator('button:has-text("Send"), button[type="submit"]').first();
        if (await sendButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await sendButton.click();
        } else {
          await chatInput.press("Enter");
        }

        // Wait for agent to start working
        console.log("⏳ Waiting for agent response...");
        await setTimeout(3000);

        // Check for agent working indicator
        const workingIndicator = page.locator(
          '[data-testid="agent-working"], .agent-working, text=/working/i',
        ).first();
        const isWorking = await workingIndicator.isVisible({ timeout: 5000 }).catch(() => false);
        if (isWorking) {
          console.log("✓ Agent working indicator visible");
        }

        // Wait for agent response (up to 120 seconds)
        console.log("⏳ Waiting for agent response (max 120s)...");
        let agentResponseFound = false;
        for (let attempt = 0; attempt < 24; attempt++) {
          await setTimeout(5000);

          // Look for agent message
          const agentMessage = page.locator('[role="agent"], .agent-message, .message-agent')
            .last();
          if (await agentMessage.isVisible().catch(() => false)) {
            const messageText = await agentMessage.textContent();
            if (messageText && messageText.length > 50) {
              agentResponseFound = true;
              result.agentResponded = true;
              console.log("✅ Agent responded!");
              break;
            }
          }

          // Check if working indicator is gone (response complete)
          const stillWorking = await workingIndicator.isVisible().catch(() => false);
          if (!stillWorking && agentResponseFound) {
            break;
          }

          console.log(`   Still waiting... (${(attempt + 1) * 5}s / 120s)`);
        }

        if (!agentResponseFound) {
          result.errors.push("Agent did not respond within 120 seconds");
          console.log("❌ Agent did not respond in time");
        }

        // Check for preview iframe
        console.log("🖼️  Checking for preview iframe...");
        await setTimeout(2000);
        const iframe = page.locator('iframe[src*="testing.spike.land"], iframe[src*="spike.land"]')
          .first();
        result.previewVisible = await iframe.isVisible({ timeout: 5000 }).catch(() => false);

        if (result.previewVisible) {
          console.log("✅ Preview iframe is visible!");
          const iframeSrc = await iframe.getAttribute("src");
          console.log(`   Preview URL: ${iframeSrc}`);
        } else {
          result.errors.push("Preview iframe not found");
          console.log("❌ Preview iframe not visible");
        }

        // Check for preview URL in message
        const messageContent = await page.textContent("body");
        result.previewUrlFound = messageContent?.includes("testing.spike.land/live/") || false;

        if (result.previewUrlFound) {
          console.log("✅ Preview URL found in message");
        }

        // Overall success
        result.success = result.agentResponded && result.previewVisible;

        // Take screenshot
        const screenshotPath = `/tmp/my-apps-test-${environment}-${i + 1}-${
          test.name.replace(/\s/g, "-")
        }.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`📸 Screenshot saved: ${screenshotPath}`);
      } catch (error) {
        result.errors.push(error instanceof Error ? error.message : String(error));
        console.error(`❌ Error during test: ${error}`);
      }

      result.duration = Date.now() - startTime;
      results.push(result);

      // Navigate back to my-apps for next test
      if (i < APP_TESTS.length - 1) {
        console.log("\n↩️  Returning to /my-apps...");
        await page.goto(`${baseUrl}/my-apps`, { waitUntil: "networkidle" });
        await setTimeout(2000);
      }
    }
  } catch (error) {
    console.error(`\n❌ Fatal error: ${error}`);
  } finally {
    // Print summary
    console.log(`\n${"=".repeat(60)}`);
    console.log(`TEST SUMMARY - ${environment}`);
    console.log("=".repeat(60));

    let successCount = 0;
    results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.appName}`);
      console.log(`   Success: ${result.success ? "✅" : "❌"}`);
      console.log(`   Agent Responded: ${result.agentResponded ? "✅" : "❌"}`);
      console.log(`   Preview Visible: ${result.previewVisible ? "✅" : "❌"}`);
      console.log(`   Duration: ${(result.duration / 1000).toFixed(1)}s`);
      if (result.errors.length > 0) {
        console.log(`   Errors: ${result.errors.join(", ")}`);
      }
      if (result.success) successCount++;
    });

    console.log(`\n${"=".repeat(60)}`);
    console.log(`Overall: ${successCount}/${results.length} tests passed`);
    console.log("=".repeat(60));

    // Cleanup
    if (browser) {
      console.log("\n🔒 Closing browser...");
      await browser.close();
    }
  }

  return results;
}

// Main execution
const args = process.argv.slice(2);
const isProd = args.includes("--prod");
const baseUrl = isProd ? "https://spike.land" : "http://localhost:3000";
const environment = isProd ? "PRODUCTION" : "LOCAL";

console.log(`
╔════════════════════════════════════════════════════════════╗
║  AUTOMATED /MY-APPS TESTING                                ║
║  Environment: ${environment.padEnd(44)} ║
║  URL: ${baseUrl.padEnd(51)} ║
╚════════════════════════════════════════════════════════════╝
`);

testMyApps(baseUrl, environment)
  .then(() => {
    console.log("\n✅ Testing complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Testing failed:", error);
    process.exit(1);
  });
