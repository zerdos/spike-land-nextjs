/**
 * Manual My-Apps Test with Mocked Auth
 *
 * This script tests /my-apps locally and on production with mocked authentication.
 * It creates 5 different apps and verifies the agent responds with previews.
 */

import { type Browser, type BrowserContext, chromium, type Page } from "@playwright/test";

interface TestApp {
  prompt: string;
  expectedKeywords: string[];
}

const TEST_APPS: TestApp[] = [
  {
    prompt: "Create a colorful todo list with add, delete, and mark complete features",
    expectedKeywords: ["todo", "add", "delete", "complete"],
  },
  {
    prompt: "Build a color picker showing hex, RGB, and HSL values",
    expectedKeywords: ["color", "hex", "rgb", "hsl"],
  },
  {
    prompt: "Make a countdown timer with start, pause, and reset buttons",
    expectedKeywords: ["timer", "countdown", "start", "pause"],
  },
  {
    prompt: "Create a random quote generator with categories like wisdom, humor, inspiration",
    expectedKeywords: ["quote", "random", "generator"],
  },
  {
    prompt: "Build a simple calculator with +, -, *, / operations",
    expectedKeywords: ["calculator", "math", "operations"],
  },
];

async function testMyAppsWithMockAuth(baseUrl: string, environment: "local" | "production") {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Testing ${environment.toUpperCase()} environment: ${baseUrl}`);
  console.log(`${"=".repeat(60)}\n`);

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    // Launch browser
    console.log("Launching browser...");
    browser = await chromium.launch({
      headless: false, // Keep browser visible
      slowMo: 300, // Slow down for visibility
    });

    // Set up E2E auth bypass header
    const e2eBypassSecret = process.env.E2E_BYPASS_SECRET ||
      "kfewLnKg5R93PKj9L+SUqBjnUk29nwLi4Wx9tXiQ8gY=";

    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      extraHTTPHeaders: {
        "x-e2e-auth-bypass": e2eBypassSecret,
      },
    });

    page = await context.newPage();

    console.log("Using E2E auth bypass header for authentication...");

    // Navigate to my-apps
    console.log(`\nNavigating to ${baseUrl}/my-apps...`);
    await page.goto(`${baseUrl}/my-apps`, { waitUntil: "networkidle" });

    // Verify we're on the my-apps page
    const url = page.url();
    if (url.includes("/auth/signin")) {
      console.error("❌ Still on sign-in page! Auth mocking failed.");
      console.error("Current URL:", url);

      // Take screenshot for debugging
      await page.screenshot({ path: `auth-failed-${environment}.png`, fullPage: true });

      // For production, we might need actual credentials
      if (environment === "production") {
        console.log("\n⚠️  Production requires real authentication.");
        console.log("Please ensure you have valid credentials or use a test account.");
      }

      return;
    }

    console.log("✅ Successfully accessed /my-apps\n");

    // Test each app
    for (let i = 0; i < TEST_APPS.length; i++) {
      const testApp = TEST_APPS[i]!;
      console.log(
        `\n--- Test ${i + 1}/${TEST_APPS.length}: ${testApp.prompt.substring(0, 60)}... ---\n`,
      );

      try {
        // Click "Create New App" button
        console.log('1. Clicking "Create New App" button...');
        const createButton = page.locator('text=/create.*app/i, button:has-text("Create")').first();
        await createButton.waitFor({ timeout: 10000 });
        await createButton.click();

        // Wait for redirect to /my-apps/[codespace]
        console.log("2. Waiting for redirect to new app...");
        await page.waitForURL(/\/my-apps\/[a-z0-9._-]+/, { timeout: 15000 });
        const currentUrl = page.url();
        const match = currentUrl.match(/\/my-apps\/([a-z0-9._-]+)/);
        const codespaceId = match ? match[1] : null;

        if (!codespaceId) {
          console.error("❌ Failed to extract codespace ID from URL:", currentUrl);
          continue;
        }

        console.log(`   Codespace ID: ${codespaceId}`);

        // Wait for chat interface to load
        console.log("3. Waiting for chat interface...");
        const textarea = page.locator("textarea").first();
        await textarea.waitFor({ timeout: 10000 });

        // Type the prompt
        console.log("4. Typing prompt...");
        await textarea.fill(testApp.prompt);
        await page.waitForTimeout(500); // Brief pause for UI stability

        // Find and click send button
        console.log("5. Sending message...");
        const sendButton = page.locator('button[type="submit"], button:has-text("Send")').first();
        await sendButton.click();

        // Wait for agent to respond
        console.log("6. Waiting for agent to respond...");
        console.log("   (This may take 30-90 seconds)");

        // Look for agent activity indicators
        const maxWaitTime = 120000; // 2 minutes
        const startTime = Date.now();
        let agentResponded = false;

        while (Date.now() - startTime < maxWaitTime && !agentResponded) {
          // Check for various indicators of agent response:
          // 1. Agent message in chat
          const agentMessage = await page.locator(
            '[data-role="AGENT"], .agent-message, [class*="agent"]',
          ).count();

          // 2. Preview iframe
          const previewIframe = await page.locator('iframe[src*="spike.land"]').count();

          // 3. Codespace URL mentioned in page
          const hasCodespaceUrl = await page.locator(
            `text=/testing\\.spike\\.land\\/live\\/${codespaceId}/`,
          ).count();

          // 4. "View Live" or similar buttons
          const viewLiveButton = await page.locator('text=/view.*live/i, a:has-text("Live")')
            .count();

          if (agentMessage > 0 || previewIframe > 0 || hasCodespaceUrl > 0 || viewLiveButton > 0) {
            agentResponded = true;
            console.log("   ✅ Agent responded!");
            break;
          }

          // Wait before checking again
          await page.waitForTimeout(3000);
          process.stdout.write(".");
        }

        if (!agentResponded) {
          console.log("\n   ⚠️  Timeout waiting for agent response");
          console.log("   Taking screenshot for debugging...");
          await page.screenshot({
            path: `test-timeout-${environment}-app${i + 1}.png`,
            fullPage: true,
          });

          // Continue to next test
          continue;
        }

        // Take screenshot of the successful result
        console.log("\n7. Taking screenshot of result...");
        await page.screenshot({
          path: `test-success-${environment}-app${i + 1}.png`,
          fullPage: true,
        });

        // Check for preview
        console.log("8. Verifying preview is visible...");
        const previewUrl = `https://testing.spike.land/live/${codespaceId}/`;

        // Look for preview iframe
        const iframeCount = await page.locator('iframe[src*="testing.spike.land"]').count();
        if (iframeCount > 0) {
          console.log("   ✅ Preview iframe found and visible");
        } else {
          console.log("   ℹ️  No iframe found, checking for preview link...");

          // Check for link to preview
          const linkCount = await page.locator(`a[href*="${codespaceId}"]`).count();
          if (linkCount > 0) {
            console.log("   ✅ Preview link found");
          } else {
            console.log("   ⚠️  No preview visible in UI");
          }
        }

        console.log(`   Expected URL: ${previewUrl}`);
        console.log(`\n   ✅ Test ${i + 1} completed!\n`);

        // Navigate back to /my-apps for next test
        if (i < TEST_APPS.length - 1) {
          console.log("9. Returning to /my-apps for next test...");
          await page.goto(`${baseUrl}/my-apps`, { waitUntil: "networkidle" });
          await page.waitForTimeout(2000);
        }
      } catch (testError) {
        console.error(`\n   ❌ Test ${i + 1} failed:`, testError);
        await page.screenshot({
          path: `test-error-${environment}-app${i + 1}.png`,
          fullPage: true,
        });

        // Try to return to my-apps for next test
        try {
          await page.goto(`${baseUrl}/my-apps`, { waitUntil: "networkidle", timeout: 10000 });
        } catch {
          console.error("   Failed to return to /my-apps - aborting remaining tests");
          break;
        }
      }
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log(`✅ Test suite completed for ${environment}!`);
    console.log(`${"=".repeat(60)}\n`);
  } catch (error) {
    console.error("\n❌ Test suite failed:", error);
    if (page) {
      await page.screenshot({
        path: `test-suite-error-${environment}.png`,
        fullPage: true,
      });
    }
  } finally {
    if (browser) {
      console.log("\nPress Enter to close browser and exit...");

      // Keep browser open for inspection
      await new Promise((resolve) => {
        process.stdin.once("data", resolve);
      });

      console.log("Closing browser...");
      await browser.close();
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const testLocal = args.includes("--local") || args.length === 0;
  const testProd = args.includes("--prod");

  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║  🚀 Manual My-Apps Test Suite                            ║
║                                                           ║
║  This will test /my-apps by creating ${TEST_APPS.length} different apps     ║
║  and verifying the agent responds with working previews.  ║
║                                                           ║
║  Using mocked authentication for seamless testing.       ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);

  if (testLocal) {
    console.log("\n📍 Testing LOCAL environment first...");
    console.log("⚠️  Make sure these are running:");
    console.log("   1. yarn dev (Next.js on port 3000)");
    console.log("   2. yarn agent:poll (Agent polling for local)");
    console.log("\nPress Enter to continue...");

    await new Promise((resolve) => {
      process.stdin.once("data", resolve);
    });

    await testMyAppsWithMockAuth("http://localhost:3000", "local");
  }

  if (testProd) {
    console.log("\n📍 Testing PRODUCTION environment...");
    console.log("⚠️  Make sure yarn agent:poll:prod is running");
    console.log("\nPress Enter to continue...");

    await new Promise((resolve) => {
      process.stdin.once("data", resolve);
    });

    await testMyAppsWithMockAuth("https://spike.land", "production");
  }

  console.log("\n🎉 All tests completed!\n");
  process.exit(0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
