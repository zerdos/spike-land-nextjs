#!/usr/bin/env node
/**
 * Publish PR from Jules session via browser automation
 *
 * Usage: node scripts/ralph/publish-jules-pr.mjs <session_id>
 *
 * Requires: Playwright installed and browser session logged into jules.google.com
 *
 * Returns JSON: { success: boolean, pr_number?: number, pr_url?: string, error?: string }
 */

import { chromium } from "playwright";

const SESSION_ID = process.argv[2];

if (!SESSION_ID) {
  console.error(
    JSON.stringify({ success: false, error: "Usage: publish-jules-pr.mjs <session_id>" }),
  );
  process.exit(1);
}

async function publishPR() {
  // Connect to existing browser instance or launch new one
  const browser = await chromium.launch({
    headless: false,
    channel: "chrome", // Use system Chrome which has Jules cookies
  });

  const context = await browser.newContext({
    storageState: process.env.JULES_STORAGE_STATE || undefined,
  });

  const page = await context.newPage();

  try {
    // Navigate to Jules session
    await page.goto(`https://jules.google.com/session/${SESSION_ID}`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    // Wait for page to load
    await page.waitForTimeout(3000);

    // Check if we need to login
    const loginNeeded = await page.locator("text=Sign in").isVisible().catch(() => false);
    if (loginNeeded) {
      console.error(JSON.stringify({
        success: false,
        error: "Login required. Please login to jules.google.com first.",
      }));
      await browser.close();
      process.exit(1);
    }

    // Check if "Publish PR" button exists
    const publishButton = page.getByRole("button", { name: "Publish PR" });
    const hasPublishButton = await publishButton.isVisible().catch(() => false);

    if (!hasPublishButton) {
      // Check if PR already exists (View PR button)
      const viewPRButton = page.getByRole("button", { name: "View PR" });
      const hasViewPR = await viewPRButton.isVisible().catch(() => false);

      if (hasViewPR) {
        // Extract PR URL from page
        await viewPRButton.click();
        await page.waitForTimeout(2000);

        // Look for GitHub PR tab
        const pages = context.pages();
        for (const p of pages) {
          const url = p.url();
          if (url.includes("github.com") && url.includes("/pull/")) {
            const prMatch = url.match(/\/pull\/(\d+)/);
            if (prMatch) {
              console.log(JSON.stringify({
                success: true,
                pr_number: parseInt(prMatch[1]),
                pr_url: url,
                note: "PR already exists",
              }));
              await browser.close();
              return;
            }
          }
        }

        console.error(JSON.stringify({
          success: false,
          error: "PR exists but could not extract URL",
        }));
        await browser.close();
        process.exit(1);
      }

      console.error(JSON.stringify({
        success: false,
        error: "No Publish PR button found. Session may not be ready for PR creation.",
      }));
      await browser.close();
      process.exit(1);
    }

    // Click Publish PR button
    await publishButton.click();

    // Wait for publishing to complete (button changes to "View PR" or shows "Publishing")
    await page.waitForFunction(() => {
      const btn = document.querySelector("button");
      const buttons = Array.from(document.querySelectorAll("button"));
      return buttons.some(b => b.textContent?.includes("View PR"));
    }, { timeout: 60000 });

    // Wait a bit for the PR tab to open
    await page.waitForTimeout(3000);

    // Find the GitHub PR URL
    const pages = context.pages();
    for (const p of pages) {
      const url = p.url();
      if (url.includes("github.com") && url.includes("/pull/")) {
        const prMatch = url.match(/\/pull\/(\d+)/);
        if (prMatch) {
          console.log(JSON.stringify({
            success: true,
            pr_number: parseInt(prMatch[1]),
            pr_url: url,
          }));
          await browser.close();
          return;
        }
      }
    }

    // Fallback: click View PR and get URL
    const viewPRButton = page.getByRole("button", { name: "View PR" });
    if (await viewPRButton.isVisible()) {
      await viewPRButton.click();
      await page.waitForTimeout(3000);

      const allPages = context.pages();
      for (const p of allPages) {
        const url = p.url();
        if (url.includes("github.com") && url.includes("/pull/")) {
          const prMatch = url.match(/\/pull\/(\d+)/);
          if (prMatch) {
            console.log(JSON.stringify({
              success: true,
              pr_number: parseInt(prMatch[1]),
              pr_url: url,
            }));
            await browser.close();
            return;
          }
        }
      }
    }

    console.log(JSON.stringify({
      success: true,
      note: "PR published but could not extract PR number",
    }));
  } catch (error) {
    console.error(JSON.stringify({
      success: false,
      error: error.message,
    }));
    await browser.close();
    process.exit(1);
  }

  await browser.close();
}

publishPR();
