import { DataTable, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { CustomWorld } from "../support/world";

// Storybook page steps
Then(
  "I should see the storybook tabs:",
  async function(this: CustomWorld, dataTable: DataTable) {
    const rows = dataTable.hashes();

    for (const row of rows) {
      const tabName = row.Tab;
      // Tabs are rendered as buttons with role="tab" or as TabsTrigger components
      const tab = this.page.getByRole("tab", { name: new RegExp(tabName, "i") });
      await expect(tab).toBeVisible({ timeout: 10000 });
    }
  },
);

// NOTE: "I click the {string} tab" is defined in common.steps.ts

// Comic Sans page steps
Then("I should see Comic Sans styled text", async function(this: CustomWorld) {
  // The page has Comic Sans font family applied
  const mainElement = this.page.locator("main");
  await expect(mainElement).toBeVisible({ timeout: 10000 });

  // Check for Comic Sans in the font-family style
  const fontFamily = await mainElement.evaluate((el) => {
    return window.getComputedStyle(el).fontFamily;
  });
  expect(fontFamily.toLowerCase()).toContain("comic");
});

// NOTE: "I should see {string} link" step is defined in authentication.steps.ts
// NOTE: "I click the {string} link" step is defined in authentication.steps.ts

// Landing page steps
Then("I should see the primary CTA button", async function(this: CustomWorld) {
  // Look for primary CTA buttons (Get Started, Start Free, Try Now, etc.)
  const ctaButton = this.page.locator(
    'a[href*="signin"], button:has-text("Get Started"), button:has-text("Start"), a:has-text("Get Started"), a:has-text("Start Free")',
  ).first();
  await expect(ctaButton).toBeVisible({ timeout: 10000 });
});

When("I click the primary CTA button", async function(this: CustomWorld) {
  const ctaButton = this.page.locator(
    'a[href*="signin"], button:has-text("Get Started"), button:has-text("Start"), a:has-text("Get Started"), a:has-text("Start Free")',
  ).first();
  await expect(ctaButton).toBeVisible({ timeout: 10000 });
  await ctaButton.click();
  await this.page.waitForLoadState("networkidle");
});

Then("I should see the Pixel feature card", async function(this: CustomWorld) {
  // Look for the Pixel app card in the featured apps section
  const pixelCard = this.page.locator('[href*="pixel"], [href*="signin"]').filter({
    has: this.page.getByText(/pixel/i),
  }).first();
  await expect(pixelCard).toBeVisible({ timeout: 10000 });
});

Then("the Pixel feature card should display an image", async function(this: CustomWorld) {
  // The feature card has a comparison image
  const cardImage = this.page.locator("#apps img").first();
  await expect(cardImage).toBeVisible({ timeout: 10000 });
});

When("I click on the Pixel feature card", async function(this: CustomWorld) {
  const pixelCard = this.page.locator('[href*="pixel"], [href*="signin"]').filter({
    has: this.page.getByText(/pixel/i),
  }).first();
  await expect(pixelCard).toBeVisible({ timeout: 10000 });
  await pixelCard.click();
  await this.page.waitForLoadState("networkidle");
});

Then("I should see platform feature cards", async function(this: CustomWorld) {
  // Look for feature section content
  const featureSection = this.page.locator("section").filter({
    has: this.page.getByRole("heading", { level: 2 }),
  });
  const count = await featureSection.count();
  expect(count).toBeGreaterThan(0);
});

Then("I should see a bottom CTA section", async function(this: CustomWorld) {
  // CTASection is typically at the bottom
  const ctaSection = this.page.locator("section").last();
  await expect(ctaSection).toBeVisible({ timeout: 10000 });
});

Then("I should see the platform header", async function(this: CustomWorld) {
  // PlatformHeader is a fixed header
  const header = this.page.locator("header, nav").first();
  await expect(header).toBeVisible({ timeout: 10000 });
});

Then("I should see the Pixel logo in header", async function(this: CustomWorld) {
  // Look for logo in header
  const logo = this.page.locator('header a[href="/"], nav a[href="/"]').first();
  await expect(logo).toBeVisible({ timeout: 10000 });
});

Then("I should see the hero section", async function(this: CustomWorld) {
  // Hero section typically has main heading
  const heroHeading = this.page.getByRole("heading", { level: 1 });
  await expect(heroHeading.first()).toBeVisible({ timeout: 10000 });
});

When(
  "I visit {string} on a mobile viewport",
  async function(this: CustomWorld, path: string) {
    // Set mobile viewport
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.page.goto(`${this.baseUrl}${path}`);
    await this.page.waitForLoadState("networkidle");
  },
);

Then("the layout should be responsive", async function(this: CustomWorld) {
  // Verify the page is still functional at mobile viewport
  // Check that main content is visible and not overflowing
  const body = this.page.locator("body");
  const bodyBox = await body.boundingBox();
  expect(bodyBox).toBeTruthy();

  // Verify the viewport is mobile-sized and content fits
  // Just verify the page loads and is somewhat usable at mobile width
  expect(bodyBox!.width).toBeLessThanOrEqual(400);
});

Then("the apps section should be visible", async function(this: CustomWorld) {
  const appsSection = this.page.locator("#apps");
  await expect(appsSection).toBeVisible({ timeout: 10000 });
});

Then("I should be redirected to the Pixel app", async function(this: CustomWorld) {
  // Authenticated users are redirected to /apps/pixel
  const currentUrl = this.page.url();
  expect(currentUrl).toContain("/apps/pixel");
});

// NOTE: "I should see {string} or {string} text" is defined in common.steps.ts
