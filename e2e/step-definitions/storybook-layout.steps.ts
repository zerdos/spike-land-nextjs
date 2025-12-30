import { Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { CustomWorld } from "../support/world";

// Viewport sizes
const MOBILE_WIDTH = 375;
const MOBILE_HEIGHT = 667;
const DESKTOP_WIDTH = 1280;
const DESKTOP_HEIGHT = 800;

// Desktop viewport steps
When(
  "I visit {string} on a desktop viewport",
  async function(this: CustomWorld, path: string) {
    await this.page.setViewportSize({
      width: DESKTOP_WIDTH,
      height: DESKTOP_HEIGHT,
    });
    await this.page.goto(`${this.baseUrl}${path}`);
    await this.page.waitForLoadState("networkidle");
  },
);

// Desktop sidebar steps
Then("I should see the desktop sidebar", async function(this: CustomWorld) {
  // Desktop sidebar is the aside element that's visible on lg screens
  const sidebar = this.page.locator("aside").first();
  await expect(sidebar).toBeVisible({ timeout: 10000 });
});

Then(
  "I should NOT see the desktop sidebar",
  async function(this: CustomWorld) {
    // On mobile, the aside should not be visible (hidden via lg:flex)
    const sidebar = this.page.locator("aside");
    // The element exists but should be hidden
    const isVisible = await sidebar.isVisible().catch(() => false);
    expect(isVisible).toBe(false);
  },
);

Then(
  "I should see {string} in the sidebar navigation",
  async function(this: CustomWorld, linkText: string) {
    const sidebar = this.page.locator("aside");
    // Use exact match to avoid matching partial text (e.g., "Brand" in "Pixel Brand Guidelines")
    const link = sidebar.getByRole("link", { name: linkText, exact: true });
    await expect(link).toBeVisible({ timeout: 10000 });
  },
);

Then(
  "{string} should be highlighted in the sidebar",
  async function(this: CustomWorld, sectionName: string) {
    // Active links have class bg-primary/10 text-primary
    // Use exact match to find the specific navigation link
    const sidebar = this.page.locator("aside");
    const activeLink = sidebar.getByRole("link", {
      name: sectionName,
      exact: true,
    });
    await expect(activeLink).toBeVisible();

    // Check that it has the active styling class using Playwright's assertion
    await expect(activeLink).toHaveClass(/bg-primary/);
  },
);

// NOTE: "I click {string} in the sidebar" is defined in admin.steps.ts

// Mobile menu steps
Then("I should see the mobile menu button", async function(this: CustomWorld) {
  // Mobile menu button has aria-label "Toggle menu" or contains Menu icon
  const menuButton = this.page.getByRole("button", { name: /toggle menu/i });
  await expect(menuButton).toBeVisible({ timeout: 10000 });
});

When("I click the mobile menu button", async function(this: CustomWorld) {
  const menuButton = this.page.getByRole("button", { name: /toggle menu/i });
  await expect(menuButton).toBeVisible();
  await menuButton.click();
  // Wait for drawer to appear using Playwright's built-in waiting
  const drawer = this.page.getByRole("dialog");
  await expect(drawer).toBeVisible({ timeout: 5000 });
});

Then(
  "I should see the mobile navigation drawer",
  async function(this: CustomWorld) {
    // Sheet content is rendered with role="dialog"
    const drawer = this.page.getByRole("dialog");
    await expect(drawer).toBeVisible({ timeout: 10000 });
  },
);

Then(
  "the mobile navigation drawer should close",
  async function(this: CustomWorld) {
    // Use Playwright's built-in waiting for element to be hidden/detached
    const drawer = this.page.getByRole("dialog");
    await expect(drawer).toBeHidden({ timeout: 5000 });
  },
);

Then(
  "I should see {string} in the navigation drawer",
  async function(this: CustomWorld, linkText: string) {
    const drawer = this.page.getByRole("dialog");
    const link = drawer.getByRole("link", { name: new RegExp(linkText, "i") });
    await expect(link.first()).toBeVisible({ timeout: 10000 });
  },
);

When(
  "I click {string} in the navigation drawer",
  async function(this: CustomWorld, linkText: string) {
    const drawer = this.page.getByRole("dialog");
    const link = drawer.getByRole("link", { name: new RegExp(linkText, "i") });
    await expect(link.first()).toBeVisible();
    await link.first().click();
    await this.page.waitForLoadState("networkidle");
  },
);

When(
  "I close the mobile navigation drawer",
  async function(this: CustomWorld) {
    // Use Escape key as primary method - more reliable than finding close button
    await this.page.keyboard.press("Escape");
    // Wait for animation to complete
    await this.page.waitForTimeout(500);
  },
);

// Responsive resize steps
When("I resize the viewport to mobile", async function(this: CustomWorld) {
  await this.page.setViewportSize({
    width: MOBILE_WIDTH,
    height: MOBILE_HEIGHT,
  });
  // Wait for mobile menu button to appear (confirms responsive layout applied)
  const menuButton = this.page.getByRole("button", { name: /toggle menu/i });
  await expect(menuButton).toBeVisible({ timeout: 5000 });
});

When("I resize the viewport to desktop", async function(this: CustomWorld) {
  await this.page.setViewportSize({
    width: DESKTOP_WIDTH,
    height: DESKTOP_HEIGHT,
  });
  // Wait for desktop sidebar to appear (confirms responsive layout applied)
  const sidebar = this.page.locator("aside").first();
  await expect(sidebar).toBeVisible({ timeout: 5000 });
});
