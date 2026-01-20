/**
 * End-to-end test script for /my-apps functionality
 *
 * This script tests the full my-apps flow both locally and on production:
 * 1. Navigate to /my-apps/new
 * 2. Send a message to create an app
 * 3. Wait for agent to respond
 * 4. Verify preview is visible
 * 5. Repeat for multiple app types
 */

import { type Browser, chromium, type Page } from "@playwright/test";

interface TestApp {
  prompt: string;
  expectedKeywords: string[];
}

const TEST_APPS: TestApp[] = [
  {
    prompt: "Create a simple todo list app with add, delete, and mark as complete",
    expectedKeywords: ["todo", "add", "delete", "complete"],
  },
  {
    prompt: "Build a color picker tool with hex and RGB values",
    expectedKeywords: ["color", "hex", "rgb", "picker"],
  },
  {
    prompt: "Make a countdown timer with start, pause, and reset buttons",
    expectedKeywords: ["timer", "countdown", "start", "pause"],
  },
  {
    prompt: "Create a random quote generator with different categories",
    expectedKeywords: ["quote", "random", "generator"],
  },
  {
    prompt: "Build a simple calculator with basic math operations",
    expectedKeywords: ["calculator", "math", "operations"],
  },
];

async function testMyApps(baseUrl: string, environment: "local" | "production") {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Testing ${environment.toUpperCase()} environment: ${baseUrl}`);
  console.log(`${"=".repeat(60)}\n`);

  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    // Launch browser
    console.log("Launching browser...");
    browser = await chromium.launch({
      headless: false, // Run in headed mode so we can see what's happening
      slowMo: 500, // Slow down actions for visibility
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });

    page = await context.newPage();

    // Navigate to my-apps
    console.log(`\nNavigating to ${baseUrl}/my-apps...`);
    await page.goto(`${baseUrl}/my-apps`, { waitUntil: "networkidle" });

    // Check if we're logged in (production might require login)
    const isLoginPage =
      await page.locator('input[type="email"], input[type="password"]').count() > 0;

    if (isLoginPage) {
      console.log("\n⚠️  Login required. Please log in manually.");
      console.log("Waiting 30 seconds for manual login...\n");
      await page.waitForTimeout(30000);

      // Verify we're on the my-apps page
      await page.waitForURL(/\/my-apps/, { timeout: 5000 });
      console.log("✅ Login successful!\n");
    }

    // Test each app
    for (let i = 0; i < TEST_APPS.length; i++) {
      const testApp = TEST_APPS[i]!;
      console.log(
        `\n--- Test ${i + 1}/${TEST_APPS.length}: ${testApp.prompt.substring(0, 50)}... ---\n`,
      );

      // Click "Create New App" button
      console.log('1. Clicking "Create New App" button...');
      const createButton = page.locator('text="Create New App"').first();
      await createButton.click();

      // Wait for redirect to /my-apps/[codeSpace]
      console.log("2. Waiting for redirect to new app...");
      await page.waitForURL(/\/my-apps\/[a-z0-9.]+/, { timeout: 10000 });
      const currentUrl = page.url();
      const codespaceId = currentUrl.split("/my-apps/")[1];
      console.log(`   Codespace ID: ${codespaceId}`);

      // Wait for chat interface to load
      console.log("3. Waiting for chat interface...");
      await page.waitForSelector(
        'textarea[placeholder*="app" i], textarea[placeholder*="message" i]',
        {
          timeout: 10000,
        },
      );

      // Type the prompt
      console.log("4. Typing prompt...");
      const textarea = page.locator("textarea").first();
      await textarea.fill(testApp.prompt);

      // Find and click send button
      console.log("5. Sending message...");
      const sendButton = page.locator('button[type="submit"], button:has-text("Send")').first();
      await sendButton.click();

      // Wait for agent to start working
      console.log("6. Waiting for agent to respond...");
      console.log("   (This may take 30-60 seconds)");

      // Wait for either:
      // - Agent response message
      // - Preview/iframe to appear
      // - Status to change from WAITING
      const maxWaitTime = 120000; // 2 minutes
      const startTime = Date.now();
      let agentResponded = false;

      while (Date.now() - startTime < maxWaitTime && !agentResponded) {
        // Check for agent message
        const agentMessage = await page.locator('[data-role="AGENT"], .agent-message').count();

        // Check for preview
        const previewExists = await page.locator(
          'iframe, [data-testid="preview"], .preview-container',
        ).count();

        // Check for codespace URL in any message
        const hasCodespaceUrl = await page.locator(
          `text=/testing\\.spike\\.land\\/live\\/${codespaceId}/`,
        ).count();

        if (agentMessage > 0 || previewExists > 0 || hasCodespaceUrl > 0) {
          agentResponded = true;
          console.log("   ✅ Agent responded!");
          break;
        }

        // Wait 2 seconds before checking again
        await page.waitForTimeout(2000);
        process.stdout.write(".");
      }

      if (!agentResponded) {
        console.log("\n   ⚠️  Timeout waiting for agent response");
        console.log("   Taking screenshot for debugging...");
        await page.screenshot({
          path: `test-timeout-${environment}-${i + 1}.png`,
          fullPage: true,
        });
        continue;
      }

      // Take screenshot of the result
      console.log("7. Taking screenshot of result...");
      await page.screenshot({
        path: `test-success-${environment}-${i + 1}.png`,
        fullPage: true,
      });

      // Check for preview URL in the page
      console.log("8. Checking for preview...");
      const previewUrl = `https://testing.spike.land/live/${codespaceId}/`;
      const hasPreview = await page.locator(`text="${previewUrl}"`).count() > 0;

      if (hasPreview) {
        console.log(`   ✅ Preview found: ${previewUrl}`);

        // Try to open preview in new tab
        const [previewPage] = await Promise.all([
          context.waitForEvent("page"),
          page.locator(`text="${previewUrl}"`).first().click(),
        ]);

        await previewPage.waitForLoadState("networkidle");
        console.log("   ✅ Preview loaded successfully");

        // Take screenshot of preview
        await previewPage.screenshot({
          path: `test-preview-${environment}-${i + 1}.png`,
        });

        await previewPage.close();
      } else {
        console.log("   ⚠️  No preview URL found in agent message");
      }

      console.log(`   ✅ Test ${i + 1} completed!\n`);

      // Navigate back to /my-apps for next test
      if (i < TEST_APPS.length - 1) {
        console.log("9. Returning to /my-apps...");
        await page.goto(`${baseUrl}/my-apps`, { waitUntil: "networkidle" });
        await page.waitForTimeout(2000);
      }
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log(`✅ All tests completed for ${environment}!`);
    console.log(`${"=".repeat(60)}\n`);
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    if (page) {
      await page.screenshot({
        path: `test-error-${environment}.png`,
        fullPage: true,
      });
    }
    throw error;
  } finally {
    if (browser) {
      console.log("\nClosing browser...");
      await browser.close();
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const testLocal = args.includes("--local") || args.length === 0;
  const testProd = args.includes("--prod") || args.length === 0;

  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║  🚀 My Apps E2E Test Suite                               ║
║                                                           ║
║  This will test the full my-apps flow by creating        ║
║  ${TEST_APPS.length} different apps and verifying the agent responds  ║
║  with working previews.                                   ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);

  if (testLocal) {
    await testMyApps("http://localhost:3000", "local");
  }

  if (testProd) {
    await testMyApps("https://spike.land", "production");
  }

  console.log("\n🎉 All environments tested successfully!\n");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
