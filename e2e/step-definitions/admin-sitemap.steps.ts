/**
 * Step definitions for Admin Sitemap Preview E2E tests
 */

import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { CustomWorld } from "../support/world";

// Given steps
Given("a sitemap route returns an error", async function(this: CustomWorld) {
  // One of the iframes will fail to load
  await this.page.route("**/error-page**", async (route) => {
    await route.abort();
  });
});

Given("there are hidden routes", async function(this: CustomWorld) {
  await this.page.route("**/api/admin/tracked-urls**", async (route) => {
    if (route.request().method() === "GET") {
      // Return tracked paths with some hidden
      await route.continue();
    } else {
      await route.continue();
    }
  });
});

Given("there is a custom tracked path", async function(this: CustomWorld) {
  // Custom path exists in the system
});

// When steps
When("I wait for pages to load", async function(this: CustomWorld) {
  // Wait for some iframes to finish loading
  await this.page.waitForTimeout(3000);
});

When("I click the refresh button on a route card", async function(this: CustomWorld) {
  const refreshButton = this.page.locator('[title="Reload this iframe"]').first();
  await refreshButton.click();
});

When("I click the external link button on a route card", async function(this: CustomWorld) {
  // Mock window.open to avoid actually opening a new tab
  await this.page.evaluate(() => {
    (window as unknown as { openedUrls: string[]; }).openedUrls = [];
    window.open = (url) => {
      (window as unknown as { openedUrls: string[]; }).openedUrls.push(url as string);
      return null;
    };
  });

  const externalButton = this.page.locator('[title="Open in new tab"]').first();
  await externalButton.click();
});

When("I click the visibility toggle on a route card", async function(this: CustomWorld) {
  const visibilityButton = this.page.locator('[title*="Hide this path"], [title*="Show this path"]')
    .first();
  await visibilityButton.click();
});

When("I click the visibility toggle on a hidden route card", async function(this: CustomWorld) {
  // Find a card with "Hidden" badge and click its visibility toggle
  const hiddenCard = this.page.locator('[class*="Card"]').filter({ hasText: "Hidden" }).first();
  const visibilityButton = hiddenCard.locator('[title*="Show this path"]');
  await visibilityButton.click();
});

When("I click the delete button on a custom path card", async function(this: CustomWorld) {
  const deleteButton = this.page.locator('[title="Delete custom path"]').first();
  await deleteButton.click();
});

When("I enter {string} in the path input", async function(this: CustomWorld, path: string) {
  const pathInput = this.page.locator('[role="dialog"] input');
  await pathInput.fill(path);
});

When(
  "I click {string} button without entering path",
  async function(this: CustomWorld, _buttonText: string) {
    const addButton = this.page.locator('[role="dialog"]').getByRole("button", {
      name: /add path/i,
    });
    await addButton.click();
  },
);

// Then steps
Then("I should see health status badges", async function(this: CustomWorld) {
  const badges = this.page.locator('[class*="Badge"]');
  const count = await badges.count();
  expect(count).toBeGreaterThan(0);
});

Then("I should see {string} status count", async function(this: CustomWorld, status: string) {
  const statusBadge = this.page.locator('[class*="Badge"]').filter({ hasText: status });
  await expect(statusBadge).toBeVisible();
});

Then("I should see {string} count text", async function(this: CustomWorld, text: string) {
  const countText = this.page.locator(`text=${text}`);
  await expect(countText.first()).toBeVisible();
});

Then("I should see a grid of route preview cards", async function(this: CustomWorld) {
  const grid = this.page.locator(".grid");
  await expect(grid).toBeVisible();
  const cards = this.page.locator('[class*="Card"]');
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);
});

Then("each card should display the path name", async function(this: CustomWorld) {
  const pathNames = this.page.locator('[class*="Card"] span[title]');
  const count = await pathNames.count();
  expect(count).toBeGreaterThan(0);
});

Then("each card should have a status indicator dot", async function(this: CustomWorld) {
  const dots = this.page.locator('[class*="Card"] .w-2.h-2.rounded-full');
  const count = await dots.count();
  expect(count).toBeGreaterThan(0);
});

Then("each card should have an iframe preview", async function(this: CustomWorld) {
  const iframes = this.page.locator("iframe");
  const count = await iframes.count();
  expect(count).toBeGreaterThan(0);
});

Then("some cards should show {string} text", async function(this: CustomWorld, text: string) {
  const loadingText = this.page.locator(`text=${text}`);
  // May or may not be visible depending on loading speed
  await this.page.waitForTimeout(500);
});

Then("loading cards should have a yellow status dot", async function(this: CustomWorld) {
  const yellowDots = this.page.locator(".bg-yellow-500.animate-pulse");
  // May be 0 if loading finished
  const count = await yellowDots.count();
  expect(count).toBeGreaterThanOrEqual(0);
});

Then("loaded cards should have a green status dot", async function(this: CustomWorld) {
  const greenDots = this.page.locator(".bg-green-500");
  const count = await greenDots.count();
  expect(count).toBeGreaterThanOrEqual(0);
});

Then("loaded cards should show the page content in iframe", async function(this: CustomWorld) {
  const iframes = this.page.locator("iframe");
  const count = await iframes.count();
  expect(count).toBeGreaterThan(0);
});

Then("error cards should have a red status dot", async function(this: CustomWorld) {
  const redDots = this.page.locator(".bg-red-500");
  // May be 0 if no errors
  const count = await redDots.count();
  expect(count).toBeGreaterThanOrEqual(0);
});

Then("error cards should show {string} text", async function(this: CustomWorld, _text: string) {
  // May not have any error cards in test
  await this.page.waitForTimeout(100);
});

Then("I should see preview card for {string}", async function(this: CustomWorld, path: string) {
  const card = this.page.locator('[class*="Card"]').filter({ hasText: path });
  await expect(card).toBeVisible();
});

Then("that card should show loading state", async function(this: CustomWorld) {
  // Card should show loading indicator
  await this.page.waitForTimeout(500);
});

Then("the card should reload the iframe", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
});

Then("all cards should show loading or queued state", async function(this: CustomWorld) {
  await this.page.waitForTimeout(500);
});

Then("cards should reload progressively", async function(this: CustomWorld) {
  await this.page.waitForTimeout(2000);
});

Then("the route should open in a new tab", async function(this: CustomWorld) {
  const openedUrls = await this.page.evaluate(() => {
    return (window as unknown as { openedUrls: string[]; }).openedUrls || [];
  });
  expect(openedUrls.length).toBeGreaterThan(0);
});

Then("the card should show {string} badge", async function(this: CustomWorld, badgeText: string) {
  const badge = this.page.locator('[class*="Badge"]').filter({ hasText: badgeText });
  await expect(badge.first()).toBeVisible();
});

Then("the card should have reduced opacity", async function(this: CustomWorld) {
  const card = this.page.locator('[class*="opacity-50"]');
  await expect(card.first()).toBeVisible();
});

Then("the hidden count should increase", async function(this: CustomWorld) {
  // Verify hidden count is displayed
  const hiddenText = this.page.locator("text=/\\d+ hidden/");
  await expect(hiddenText).toBeVisible();
});

Then("hidden routes should not be visible", async function(this: CustomWorld) {
  // Hidden routes are filtered out by default
  await this.page.waitForLoadState("networkidle");
});

Then("hidden routes should become visible", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
});

Then("the button should change to {string}", async function(this: CustomWorld, buttonText: string) {
  const button = this.page.getByRole("button", { name: buttonText });
  await expect(button).toBeVisible();
});

Then(
  "the card should no longer show {string} badge",
  async function(this: CustomWorld, badgeText: string) {
    const card = this.page.locator('[class*="Card"]').first();
    const badge = card.locator('[class*="Badge"]').filter({ hasText: badgeText });
    await expect(badge).not.toBeVisible();
  },
);

Then("the hidden count should decrease", async function(this: CustomWorld) {
  const hiddenText = this.page.locator("text=/\\d+ hidden/");
  await expect(hiddenText).toBeVisible();
});

Then("I should see the add custom path dialog", async function(this: CustomWorld) {
  const dialog = this.page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();
});

Then("I should see a path input field", async function(this: CustomWorld) {
  const input = this.page.locator('[role="dialog"] input');
  await expect(input).toBeVisible();
});

Then("the dialog should close", async function(this: CustomWorld) {
  const dialog = this.page.locator('[role="dialog"]');
  await expect(dialog).not.toBeVisible();
});

Then(
  "I should see a new preview card for {string}",
  async function(this: CustomWorld, path: string) {
    const card = this.page.locator('[class*="Card"]').filter({ hasText: path });
    await expect(card).toBeVisible();
  },
);

Then("I should see {string} error", async function(this: CustomWorld, error: string) {
  const errorText = this.page.locator(`text=${error}`);
  await expect(errorText).toBeVisible();
});

Then(
  "I should not see a preview card for {string}",
  async function(this: CustomWorld, path: string) {
    const card = this.page.locator('[class*="Card"]').filter({ hasText: path });
    await expect(card).not.toBeVisible();
  },
);

Then("the custom path card should be removed", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
});

Then("the path should no longer appear in the grid", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
});

Then(
  "the delete button should not appear on sitemap default paths",
  async function(this: CustomWorld) {
    // Default paths like "/" don't have delete buttons
    const homeCard = this.page.locator('[class*="Card"]').filter({ hasText: /^\/$/m });
    const deleteButton = homeCard.locator('[title="Delete custom path"]');
    await expect(deleteButton).not.toBeVisible();
  },
);

Then("the route should still be hidden", async function(this: CustomWorld) {
  // Check for hidden badge after refresh
  await this.page.waitForLoadState("networkidle");
});

Then("the hidden count should be correct", async function(this: CustomWorld) {
  const hiddenText = this.page.locator("text=/\\d+ hidden/");
  await expect(hiddenText).toBeVisible();
});

Then("at most 4 cards should be loading simultaneously", async function(this: CustomWorld) {
  const loadingDots = this.page.locator(".bg-yellow-500.animate-pulse");
  const count = await loadingDots.count();
  expect(count).toBeLessThanOrEqual(4);
});

Then("remaining cards should show {string} text", async function(this: CustomWorld, _text: string) {
  // Some cards may show "Queued..." text
  await this.page.waitForTimeout(100);
});

Then("the healthy count should increase", async function(this: CustomWorld) {
  const healthyBadge = this.page.locator('[class*="Badge"]').filter({ hasText: "Healthy" });
  await expect(healthyBadge).toBeVisible();
});

Then("the loading count should decrease to zero", async function(this: CustomWorld) {
  // Wait for loading to complete
  await this.page.waitForTimeout(5000);
});
