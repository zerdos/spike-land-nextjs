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

Then("I should NOT see the desktop sidebar", async function(this: CustomWorld) {
  // On mobile, the aside should not be visible (hidden via lg:flex)
  const sidebar = this.page.locator("aside");
  // The element exists but should be hidden
  const isVisible = await sidebar.isVisible().catch(() => false);
  expect(isVisible).toBe(false);
});

Then(
  "I should see {string} in the sidebar navigation",
  async function(this: CustomWorld, linkText: string) {
    const sidebar = this.page.locator("aside");
    const link = sidebar.getByRole("link", { name: new RegExp(linkText, "i") });
    await expect(link.first()).toBeVisible({ timeout: 10000 });
  },
);

Then(
  "{string} should be highlighted in the sidebar",
  async function(this: CustomWorld, sectionName: string) {
    // Active links have class bg-primary/10 text-primary
    const activeLink = this.page.locator(
      `aside a:has-text("${sectionName}")`,
    ).first();
    await expect(activeLink).toBeVisible();

    // Check that it has the active styling class
    const classes = await activeLink.getAttribute("class");
    expect(classes).toContain("bg-primary");
  },
);

When(
  "I click {string} in the sidebar",
  async function(this: CustomWorld, linkText: string) {
    const sidebar = this.page.locator("aside");
    const link = sidebar.getByRole("link", { name: new RegExp(linkText, "i") });
    await expect(link.first()).toBeVisible();
    await link.first().click();
    await this.page.waitForLoadState("networkidle");
  },
);

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
  // Wait for drawer animation
  await this.page.waitForTimeout(300);
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
    // Wait for animation
    await this.page.waitForTimeout(500);
    const drawer = this.page.getByRole("dialog");
    await expect(drawer).not.toBeVisible({ timeout: 5000 });
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
    // Sheet has a close button with X icon
    const closeButton = this.page.getByRole("button", { name: /close/i });
    if (await closeButton.isVisible()) {
      await closeButton.click();
    } else {
      // Fallback: press Escape to close
      await this.page.keyboard.press("Escape");
    }
  },
);

// Responsive resize steps
When("I resize the viewport to mobile", async function(this: CustomWorld) {
  await this.page.setViewportSize({
    width: MOBILE_WIDTH,
    height: MOBILE_HEIGHT,
  });
  // Wait for layout to adjust
  await this.page.waitForTimeout(200);
});

When("I resize the viewport to desktop", async function(this: CustomWorld) {
  await this.page.setViewportSize({
    width: DESKTOP_WIDTH,
    height: DESKTOP_HEIGHT,
  });
  // Wait for layout to adjust
  await this.page.waitForTimeout(200);
});
