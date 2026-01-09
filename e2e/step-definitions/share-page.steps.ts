import { Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import type { CustomWorld } from "../support/world";

// E2E seeded test data - must match prisma/seed-e2e.ts
// Share token used in feature files: e2e-share-token-123

// Share page navigation steps
When(
  "I visit the share page with token {string}",
  async function(this: CustomWorld, token: string) {
    await this.page.goto(`${this.baseUrl}/share/${token}`);
    await this.page.waitForLoadState("networkidle");
  },
);

// Image comparison slider steps
Then(
  "I should see the image comparison slider",
  async function(this: CustomWorld) {
    // The ImageComparisonSlider has multiple identifying features:
    // 1. cursor-ew-resize class on the container
    // 2. Before/After or Original/Enhanced labels
    // 3. select-none class for drag behavior
    const sliderByCursor = this.page.locator(".cursor-ew-resize");
    const sliderBySelectNone = this.page.locator(".select-none").filter({
      has: this.page.getByText(/Before|After|Original|Enhanced/i),
    });

    // Wait for either selector to be visible
    const slider = sliderByCursor.or(sliderBySelectNone).first();
    await expect(slider).toBeVisible({ timeout: 15000 });
  },
);

// NOTE: "I should see {string} label" is defined in common.steps.ts

Then(
  "I should see the image name displayed",
  async function(this: CustomWorld) {
    // The image name is displayed in an h1 element
    const imageName = this.page.locator("h1");
    await expect(imageName).toBeVisible({ timeout: 10000 });
    const text = await imageName.textContent();
    expect(text).toBeTruthy();
    expect(text!.length).toBeGreaterThan(0);
  },
);

Then("I should see a tier badge", async function(this: CustomWorld) {
  // Tier badges show 1K, 2K, or 4K
  const tierBadge = this.page.locator("span").filter({
    hasText: /^(1K|2K|4K)$/,
  });
  await expect(tierBadge).toBeVisible({ timeout: 10000 });
});

// NOTE: "I should see {string} button" step is defined in common.steps.ts

Then(
  "I should see the Pixel logo linking to home",
  async function(this: CustomWorld) {
    // First verify we're on the share page (not 404)
    const currentUrl = this.page.url();
    if (!currentUrl.includes("/share/")) {
      throw new Error(
        `Expected to be on share page but was on: ${currentUrl}. The share token may not exist in the database.`,
      );
    }

    // The logo is in the header as a link to /
    const logoLink = this.page.locator("header a[href='/']");
    await expect(logoLink).toBeVisible({ timeout: 10000 });

    // Verify it contains "pixel" text or the Pixel logo aria-label
    const pixelLogo = logoLink.locator('[aria-label*="Pixel" i], span');
    const hasPixelBranding = await pixelLogo.first().isVisible().catch(() => false);

    if (hasPixelBranding) {
      const logoText = await logoLink.textContent();
      // Allow either "pixel" or check aria-label
      const containsPixel = logoText?.toLowerCase().includes("pixel");
      const hasPixelAriaLabel = await logoLink.locator('[aria-label*="Pixel" i]').count() > 0;
      expect(containsPixel || hasPixelAriaLabel).toBe(true);
    } else {
      // Fallback: check text content
      const logoText = await logoLink.textContent();
      expect(logoText?.toLowerCase()).toContain("pixel");
    }
  },
);

Then(
  "I should see {string} link in footer",
  async function(this: CustomWorld, linkText: string) {
    const footer = this.page.locator("footer");
    const link = footer.getByRole("link", { name: new RegExp(linkText, "i") });
    await expect(link).toBeVisible({ timeout: 10000 });
  },
);

Then(
  "the comparison slider should have cursor ew-resize style",
  async function(this: CustomWorld) {
    // Try multiple selectors for robustness
    const sliderByCursor = this.page.locator(".cursor-ew-resize");
    const sliderBySelectNone = this.page.locator(".select-none").filter({
      has: this.page.getByText(/Before|After|Original|Enhanced/i),
    });
    const slider = sliderByCursor.or(sliderBySelectNone).first();
    await expect(slider).toBeVisible({ timeout: 15000 });

    // Verify the cursor style
    const cursor = await slider.evaluate((el) => {
      return window.getComputedStyle(el).cursor;
    });
    expect(cursor).toBe("ew-resize");
  },
);

Then(
  "the slider divider should be visible",
  async function(this: CustomWorld) {
    // The divider is a white line in the middle of the slider
    const divider = this.page.locator(".bg-white.shadow-lg").first();
    await expect(divider).toBeVisible({ timeout: 10000 });
  },
);

Then(
  "I should NOT be redirected to sign-in page",
  async function(this: CustomWorld) {
    const currentUrl = this.page.url();
    expect(currentUrl).not.toContain("/auth/signin");
  },
);
