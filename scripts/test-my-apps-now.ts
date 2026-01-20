/**
 * Real-time My-Apps Testing Script
 *
 * Opens Chrome in headed mode and tests creating 5 different apps
 * with real user interaction simulation
 */

import { type Browser, chromium, type Page } from "@playwright/test";
import { writeFileSync } from "fs";

interface TestApp {
  name: string;
  prompt: string;
  verifyText: string[];
}

const TEST_APPS: TestApp[] = [
  {
    name: "Counter App",
    prompt:
      "Create a simple counter with big + and - buttons. Make it colorful with a gradient background.",
    verifyText: ["counter", "+", "-"],
  },
  {
    name: "Todo List",
    prompt:
      "Create a todo list where I can add tasks, check them off, and delete them. Use Tailwind for modern styling.",
    verifyText: ["todo", "add", "task"],
  },
  {
    name: "Calculator",
    prompt:
      "Build a calculator with buttons for 0-9, +, -, *, /, =, and clear. Make it visually appealing with a nice color scheme.",
    verifyText: ["calculator", "=", "clear"],
  },
  {
    name: "Color Picker",
    prompt:
      "Make a color picker that shows the selected color in a large preview box with the hex code displayed.",
    verifyText: ["color", "hex", "picker"],
  },
  {
    name: "Quote Generator",
    prompt:
      "Create a random inspirational quote generator with a 'New Quote' button. Include a nice background and typography.",
    verifyText: ["quote", "random"],
  },
];

interface TestResult {
  app: string;
  success: boolean;
  responseTime?: number;
  previewVisible?: boolean;
  codespaceId?: string;
  error?: string;
  screenshotPath?: string;
}

async function waitForAgentResponse(
  page: Page,
  codespaceId: string,
  maxWait: number = 180000,
): Promise<boolean> {
  const startTime = Date.now();

  console.log("   Waiting for agent response (max 3 minutes)...");

  while (Date.now() - startTime < maxWait) {
    // Check for agent message
    const agentMessages = await page.locator(
      '[data-role="AGENT"], [data-message-role="AGENT"], .agent-message, .message-agent',
    ).count();

    // Check for preview iframe
    const iframeCount = await page.locator('iframe[src*="testing.spike.land"]').count();

    // Check for codespace URL in text
    const hasCodespaceUrl = await page.locator(
      `text=/testing\\.spike\\.land\\/live\\/${codespaceId}/`,
    ).count();

    if (agentMessages > 0 || iframeCount > 0 || hasCodespaceUrl > 0) {
      console.log(`   ✅ Agent responded in ${Math.round((Date.now() - startTime) / 1000)}s`);
      return true;
    }

    // Check every 2 seconds
    await page.waitForTimeout(2000);
    process.stdout.write(".");
  }

  console.log(`\n   ❌ Timeout after ${Math.round(maxWait / 1000)}s`);
  return false;
}

async function testApp(
  browser: Browser,
  baseUrl: string,
  testApp: TestApp,
  testNumber: number,
): Promise<TestResult> {
  const result: TestResult = {
    app: testApp.name,
    success: false,
  };

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Test ${testNumber}/5: ${testApp.name}`);
  console.log(`${"=".repeat(60)}\n`);

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();

  try {
    const startTime = Date.now();

    // 1. Navigate to my-apps
    console.log("1. Navigating to /my-apps...");
    await page.goto(`${baseUrl}/my-apps`, { waitUntil: "networkidle", timeout: 30000 });

    // 2. Click "Create New App"
    console.log('2. Clicking "Create New App"...');
    await page.waitForSelector('text="Create New App", a[href*="/my-apps/new"]', {
      timeout: 10000,
    });
    await page.click('text="Create New App"');

    // 3. Wait for redirect to new codespace
    console.log("3. Waiting for new codespace...");
    await page.waitForURL(/\/my-apps\/[a-z0-9.-]+/, { timeout: 10000 });
    const url = page.url();
    const codespaceId = url.split("/my-apps/")[1]!;
    result.codespaceId = codespaceId;
    console.log(`   Codespace ID: ${codespaceId}`);

    // 4. Wait for chat interface
    console.log("4. Waiting for chat interface...");
    await page.waitForSelector('textarea, input[type="text"]', { timeout: 15000 });

    // 5. Type the prompt
    console.log("5. Typing prompt...");
    const textarea = page.locator("textarea").first();
    await textarea.fill(testApp.prompt);
    await page.waitForTimeout(500);

    // 6. Submit the message
    console.log("6. Sending message...");
    // Try different selectors for the send button
    const sendButton = page.locator(
      'button[type="submit"], button:has-text("Send"), button:has-text("Start"), button[aria-label*="Send"]',
    ).first();
    await sendButton.click();

    // 7. Wait for agent response
    const gotResponse = await waitForAgentResponse(page, codespaceId);

    if (!gotResponse) {
      result.error = "Agent did not respond within timeout";
      result.screenshotPath = `test-timeout-${testNumber}.png`;
      await page.screenshot({ path: result.screenshotPath, fullPage: true });
      return result;
    }

    result.responseTime = Date.now() - startTime;

    // 8. Check for preview
    console.log("7. Checking for preview...");
    const iframeCount = await page.locator('iframe[src*="testing.spike.land"]').count();
    result.previewVisible = iframeCount > 0;

    if (result.previewVisible) {
      console.log(`   ✅ Preview visible (${iframeCount} iframe(s))`);
    } else {
      console.log("   ⚠️  No preview iframe found");
    }

    // 9. Take success screenshot
    result.screenshotPath = `test-success-${testNumber}-${
      testApp.name.toLowerCase().replace(/\s+/g, "-")
    }.png`;
    await page.screenshot({ path: result.screenshotPath, fullPage: true });

    result.success = true;
    console.log(`\n✅ ${testApp.name} completed successfully!`);
    console.log(`   Response time: ${Math.round(result.responseTime / 1000)}s`);
    console.log(`   Preview: ${result.previewVisible ? "YES" : "NO"}`);
    console.log(`   Screenshot: ${result.screenshotPath}`);
  } catch (error) {
    console.error(`\n❌ ${testApp.name} failed:`, error);
    result.error = error instanceof Error ? error.message : String(error);
    result.screenshotPath = `test-error-${testNumber}.png`;
    await page.screenshot({ path: result.screenshotPath, fullPage: true });
  } finally {
    await context.close();
  }

  return result;
}

async function runTests(baseUrl: string, environment: "local" | "production") {
  console.log(`\n${"#".repeat(70)}`);
  console.log(`#${" ".repeat(68)}#`);
  console.log(`#  Testing My-Apps: ${environment.toUpperCase().padEnd(52)} #`);
  console.log(`#  URL: ${baseUrl.padEnd(60)} #`);
  console.log(`#${" ".repeat(68)}#`);
  console.log(`${"#".repeat(70)}\n`);

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300, // Slow down for visibility
  });

  const results: TestResult[] = [];

  try {
    for (let i = 0; i < TEST_APPS.length; i++) {
      const result = await testApp(browser, baseUrl, TEST_APPS[i]!, i + 1);
      results.push(result);

      // Wait between tests
      if (i < TEST_APPS.length - 1) {
        console.log("\n⏳ Waiting 3 seconds before next test...\n");
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  } finally {
    await browser.close();
  }

  // Print summary
  console.log(`\n${"#".repeat(70)}`);
  console.log(`#${" ".repeat(68)}#`);
  console.log(`#  TEST SUMMARY - ${environment.toUpperCase().padEnd(52)} #`);
  console.log(`#${" ".repeat(68)}#`);
  console.log(`${"#".repeat(70)}\n`);

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${successCount} (${Math.round(successCount / results.length * 100)}%)`);
  console.log(`❌ Failed: ${failCount} (${Math.round(failCount / results.length * 100)}%)`);

  if (successCount > 0) {
    const avgTime = results
      .filter(r => r.success && r.responseTime)
      .reduce((sum, r) => sum + (r.responseTime || 0), 0) / successCount;
    console.log(`📊 Average Response Time: ${Math.round(avgTime / 1000)}s`);
  }

  console.log("\nDetailed Results:");
  console.log("─".repeat(70));

  results.forEach((r, i) => {
    const status = r.success ? "✅ PASS" : "❌ FAIL";
    const time = r.responseTime ? `${Math.round(r.responseTime / 1000)}s` : "N/A";
    const preview = r.previewVisible ? "✓" : "✗";

    console.log(
      `${i + 1}. ${status} ${r.app.padEnd(20)} | Time: ${time.padStart(5)} | Preview: ${preview}`,
    );
    if (r.error) {
      console.log(`   Error: ${r.error}`);
    }
    if (r.screenshotPath) {
      console.log(`   Screenshot: ${r.screenshotPath}`);
    }
  });

  console.log("─".repeat(70));

  return {
    environment,
    totalTests: results.length,
    passed: successCount,
    failed: failCount,
    successRate: Math.round(successCount / results.length * 100),
    results,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const testProd = args.includes("--prod");

  if (testProd) {
    console.log("\n⚠️  Production testing requires yarn agent:poll:prod to be running!");
    console.log("   Please ensure it is started in another terminal.\n");
    await new Promise(resolve => setTimeout(resolve, 5000));

    const prodResults = await runTests("https://spike.land", "production");

    // Save results
    writeFileSync(
      "my-apps-prod-test-results.json",
      JSON.stringify(prodResults, null, 2),
    );
  } else {
    const localResults = await runTests("http://localhost:3000", "local");

    // Save results
    writeFileSync(
      "my-apps-local-test-results.json",
      JSON.stringify(localResults, null, 2),
    );
  }

  console.log("\n🎉 Testing complete!\n");
}

main().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});
