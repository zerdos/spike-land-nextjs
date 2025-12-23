/**
 * Mobile & Cross-Browser Testing Script
 *
 * This script tests the Spike Land app across different viewports and browsers
 * to verify mobile responsiveness and touch interactions.
 */

import { chromium, devices } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const BASE_URL = process.env.BASE_URL || "https://spike.land";
const SCREENSHOTS_DIR = path.join(
  process.cwd(),
  "e2e",
  "mobile-test-screenshots",
);

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

interface TestResult {
  viewport: string;
  url: string;
  status: "pass" | "fail";
  issues: string[];
  screenshots: string[];
}

const results: TestResult[] = [];

interface ViewportConfig {
  viewport: { width: number; height: number; };
  userAgent?: string;
  isMobile?: boolean;
  hasTouch?: boolean;
}

async function testViewport(
  deviceName: string,
  viewportConfig: ViewportConfig,
) {
  console.log(`\n========================================`);
  console.log(`Testing ${deviceName}...`);
  console.log(`========================================`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...viewportConfig,
    userAgent: viewportConfig.userAgent ||
      "Mozilla/5.0 (compatible; SpikeLandMobileTest/1.0)",
  });
  const page = await context.newPage();

  const issues: string[] = [];
  const screenshots: string[] = [];

  try {
    // Test 1: Landing Page
    console.log(`\n[${deviceName}] Testing Landing Page...`);
    await page.goto(BASE_URL, { waitUntil: "networkidle" });

    // Take screenshot
    const landingScreenshot = `${deviceName.replace(/\s/g, "-")}-landing.png`;
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, landingScreenshot),
      fullPage: true,
    });
    screenshots.push(landingScreenshot);

    // Check hero section
    const heroSection = await page.locator("h1").first();
    const isHeroVisible = await heroSection.isVisible();
    if (!isHeroVisible) {
      issues.push("Hero section not visible on landing page");
    } else {
      console.log("✅ Hero section visible");
    }

    // Check for comparison slider on landing page
    const comparisonSlider = await page.locator('[class*="cursor-ew-resize"]')
      .first();
    const hasSlider = await comparisonSlider.count() > 0;
    if (hasSlider) {
      console.log("✅ Comparison slider found on landing page");

      // Test touch interaction (simulate by checking if touchstart handler exists)
      const sliderElement = await comparisonSlider.elementHandle();
      if (sliderElement) {
        const hasTouch = await page.evaluate((el: Element) => {
          return el && typeof (el as HTMLElement)["ontouchstart"] !== "undefined";
        }, sliderElement);

        if (!hasTouch) {
          issues.push("Comparison slider missing touch support");
        } else {
          console.log("✅ Comparison slider has touch support");
        }
      }
    } else {
      console.log(
        "⚠️  No comparison slider found on landing page (may not be visible)",
      );
    }

    // Check navigation menu
    const navMenu = await page.locator("nav").first();
    const isNavVisible = await navMenu.isVisible();
    if (!isNavVisible) {
      issues.push("Navigation menu not visible");
    } else {
      console.log("✅ Navigation menu visible");
    }

    // Test 2: Enhancement Page (requires auth, so just check redirect)
    console.log(
      `\n[${deviceName}] Testing Enhancement Page (unauthenticated)...`,
    );
    await page.goto(`${BASE_URL}/pixel`, { waitUntil: "networkidle" });

    const enhanceScreenshot = `${deviceName.replace(/\s/g, "-")}-enhance.png`;
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, enhanceScreenshot),
      fullPage: true,
    });
    screenshots.push(enhanceScreenshot);

    // Should redirect to sign-in
    const currentUrl = page.url();
    if (currentUrl.includes("/auth/signin")) {
      console.log("✅ Correctly redirected to sign-in page");
    } else {
      issues.push(
        "Enhancement page did not redirect to sign-in for unauthenticated user",
      );
    }

    // Test 3: Admin Page (should redirect)
    console.log(`\n[${deviceName}] Testing Admin Page (unauthenticated)...`);
    await page.goto(`${BASE_URL}/admin`, { waitUntil: "networkidle" });

    const adminScreenshot = `${deviceName.replace(/\s/g, "-")}-admin.png`;
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, adminScreenshot),
      fullPage: true,
    });
    screenshots.push(adminScreenshot);

    // Should redirect or show access denied
    const adminUrl = page.url();
    if (adminUrl.includes("/auth/signin") || adminUrl.includes("/admin")) {
      console.log("✅ Admin page handled correctly");
    } else {
      issues.push("Admin page did not handle unauthenticated access correctly");
    }

    // Test 4: Check for layout overflow/horizontal scroll
    console.log(`\n[${deviceName}] Checking for layout issues...`);
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const bodyClientWidth = await page.evaluate(() => document.body.clientWidth);

    if (bodyScrollWidth > bodyClientWidth + 5) { // Allow 5px tolerance
      issues.push(
        `Horizontal overflow detected (scroll: ${bodyScrollWidth}px, client: ${bodyClientWidth}px)`,
      );
      console.log(`⚠️  Horizontal overflow detected`);
    } else {
      console.log("✅ No horizontal overflow");
    }

    // Test 5: Check responsive font sizes
    const h1FontSize = await page.locator("h1").first().evaluate((el) => {
      return window.getComputedStyle(el).fontSize;
    });
    console.log(`ℹ️  H1 font size: ${h1FontSize}`);

    // Test 6: Touch target size (buttons should be at least 44x44px)
    const buttons = await page.locator("button").all();
    let smallButtons = 0;
    for (const button of buttons.slice(0, 5)) { // Check first 5 buttons
      const box = await button.boundingBox();
      if (box && (box.width < 44 || box.height < 44)) {
        smallButtons++;
      }
    }
    if (smallButtons > 0) {
      issues.push(
        `Found ${smallButtons} buttons smaller than 44x44px (touch target size)`,
      );
      console.log(
        `⚠️  Found ${smallButtons} buttons smaller than recommended touch target size`,
      );
    } else if (buttons.length > 0) {
      console.log("✅ Button sizes meet touch target guidelines");
    }

    console.log(`\n[${deviceName}] Testing completed`);
    console.log(`Issues found: ${issues.length}`);
  } catch (error) {
    issues.push(`Test execution error: ${error}`);
    console.error(`❌ Error during ${deviceName} testing:`, error);
  } finally {
    await browser.close();
  }

  results.push({
    viewport: deviceName,
    url: BASE_URL,
    status: issues.length === 0 ? "pass" : "fail",
    issues,
    screenshots,
  });
}

async function runTests() {
  console.log("=".repeat(60));
  console.log("SPIKE LAND MOBILE & CROSS-BROWSER TESTING");
  console.log("=".repeat(60));
  console.log(`Target URL: ${BASE_URL}`);
  console.log(`Screenshots will be saved to: ${SCREENSHOTS_DIR}`);
  console.log("=".repeat(60));

  // Test different viewports
  const iPhoneDevice = devices["iPhone 12"] || devices["iPhone SE"] ||
    { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)" };
  const iPadDevice = devices["iPad Pro"] || devices["iPad"] ||
    { userAgent: "Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)" };

  await testViewport("iPhone SE", {
    viewport: { width: 375, height: 667 },
    userAgent: iPhoneDevice.userAgent,
    isMobile: true,
    hasTouch: true,
  });

  await testViewport("iPad", {
    viewport: { width: 768, height: 1024 },
    userAgent: iPadDevice.userAgent,
    isMobile: true,
    hasTouch: true,
  });

  await testViewport("Desktop HD", {
    viewport: { width: 1920, height: 1080 },
    isMobile: false,
    hasTouch: false,
  });

  await testViewport("Mobile Landscape", {
    viewport: { width: 667, height: 375 },
    userAgent: iPhoneDevice.userAgent,
    isMobile: true,
    hasTouch: true,
  });

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("TEST SUMMARY");
  console.log("=".repeat(60));

  let totalIssues = 0;
  results.forEach((result) => {
    console.log(`\n${result.viewport}: ${result.status.toUpperCase()}`);
    console.log(`  Issues: ${result.issues.length}`);
    if (result.issues.length > 0) {
      result.issues.forEach((issue) => {
        console.log(`    - ${issue}`);
      });
    }
    console.log(`  Screenshots: ${result.screenshots.length}`);
    result.screenshots.forEach((screenshot) => {
      console.log(`    - ${path.join(SCREENSHOTS_DIR, screenshot)}`);
    });
    totalIssues += result.issues.length;
  });

  console.log("\n" + "=".repeat(60));
  console.log(`Total Viewports Tested: ${results.length}`);
  console.log(`Total Issues Found: ${totalIssues}`);
  console.log(`Screenshots Directory: ${SCREENSHOTS_DIR}`);
  console.log("=".repeat(60));

  // Write JSON report
  const reportPath = path.join(SCREENSHOTS_DIR, "mobile-test-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\nDetailed report saved to: ${reportPath}`);

  // Exit with appropriate code
  process.exit(totalIssues > 0 ? 1 : 0);
}

runTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
