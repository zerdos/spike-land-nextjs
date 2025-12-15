import { Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { CustomWorld } from "../support/world";

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
Then("I should see the image comparison slider", async function(this: CustomWorld) {
  // The slider has cursor-ew-resize class and contains Before/After labels
  const slider = this.page.locator(".cursor-ew-resize");
  await expect(slider).toBeVisible({ timeout: 10000 });
});

Then("I should see {string} label", async function(this: CustomWorld, label: string) {
  const labelElement = this.page.getByText(label);
  await expect(labelElement.first()).toBeVisible({ timeout: 10000 });
});

Then("I should see the image name displayed", async function(this: CustomWorld) {
  // The image name is displayed in an h1 element
  const imageName = this.page.locator("h1");
  await expect(imageName).toBeVisible({ timeout: 10000 });
  const text = await imageName.textContent();
  expect(text).toBeTruthy();
  expect(text!.length).toBeGreaterThan(0);
});

Then("I should see a tier badge", async function(this: CustomWorld) {
  // Tier badges show 1K, 2K, or 4K
  const tierBadge = this.page.locator("span").filter({
    hasText: /^(1K|2K|4K)$/,
  });
  await expect(tierBadge).toBeVisible({ timeout: 10000 });
});

// NOTE: "I should see {string} button" step is defined in common.steps.ts

Then("I should see the Pixel logo linking to home", async function(this: CustomWorld) {
  // The logo is in the header as a link to /
  const logoLink = this.page.locator("header a[href='/']");
  await expect(logoLink).toBeVisible({ timeout: 10000 });

  // Verify it contains "pixel" text
  const logoText = await logoLink.textContent();
  expect(logoText?.toLowerCase()).toContain("pixel");
});

Then(
  "I should see {string} link in footer",
  async function(this: CustomWorld, linkText: string) {
    const footer = this.page.locator("footer");
    const link = footer.getByRole("link", { name: new RegExp(linkText, "i") });
    await expect(link).toBeVisible({ timeout: 10000 });
  },
);

Then("the comparison slider should have cursor ew-resize style", async function(this: CustomWorld) {
  const slider = this.page.locator(".cursor-ew-resize");
  await expect(slider).toBeVisible({ timeout: 10000 });

  // Verify the cursor style
  const cursor = await slider.evaluate((el) => {
    return window.getComputedStyle(el).cursor;
  });
  expect(cursor).toBe("ew-resize");
});

Then("the slider divider should be visible", async function(this: CustomWorld) {
  // The divider is a white line in the middle of the slider
  const divider = this.page.locator(".bg-white.shadow-lg").first();
  await expect(divider).toBeVisible({ timeout: 10000 });
});

Then("I should NOT be redirected to sign-in page", async function(this: CustomWorld) {
  const currentUrl = this.page.url();
  expect(currentUrl).not.toContain("/auth/signin");
});
