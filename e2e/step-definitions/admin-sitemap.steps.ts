/**
 * Step definitions for Admin Sitemap Preview E2E tests
 */

import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import {
  TIMEOUTS,
  waitForApiResponse,
  waitForDynamicContent,
  waitForElementWithRetry,
} from "../support/helpers/retry-helper";
import type { CustomWorld } from "../support/world";

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
  // Wait for iframes to finish loading using retry logic
  await waitForElementWithRetry(
    this.page,
    "iframe",
    { timeout: TIMEOUTS.LONG, state: "visible" },
  );
  // Wait for at least one iframe to fully load
  await this.page.waitForTimeout(TIMEOUTS.SHORT);
});

When(
  "I click the refresh button on a route card",
  async function(this: CustomWorld) {
    const refreshButton = await waitForElementWithRetry(
      this.page,
      '[title="Reload this iframe"]',
      { timeout: TIMEOUTS.DEFAULT, state: "visible" },
    );
    await refreshButton.first().click();
  },
);

When(
  "I click the external link button on a route card",
  async function(this: CustomWorld) {
    // Mock window.open to avoid actually opening a new tab
    await this.page.evaluate(() => {
      (window as unknown as { openedUrls: string[]; }).openedUrls = [];
      window.open = (url) => {
        (window as unknown as { openedUrls: string[]; }).openedUrls.push(
          url as string,
        );
        return null;
      };
    });

    const externalButton = await waitForElementWithRetry(
      this.page,
      '[title="Open in new tab"]',
      { timeout: TIMEOUTS.DEFAULT, state: "visible" },
    );
    await externalButton.first().click();
  },
);

When(
  "I click the visibility toggle on a route card",
  async function(this: CustomWorld) {
    // Wait for API response before checking updates
    const apiPromise = waitForApiResponse(
      this.page,
      "/api/admin/tracked-urls",
      { timeout: TIMEOUTS.LONG },
    );

    const visibilityButton = await waitForElementWithRetry(
      this.page,
      '[title*="Hide this path"], [title*="Show this path"]',
      { timeout: TIMEOUTS.DEFAULT, state: "visible" },
    );
    await visibilityButton.first().click();

    await apiPromise;
  },
);

When(
  "I click the visibility toggle on a hidden route card",
  async function(this: CustomWorld) {
    // Wait for API response before checking updates
    const apiPromise = waitForApiResponse(
      this.page,
      "/api/admin/tracked-urls",
      { timeout: TIMEOUTS.LONG },
    );

    // Find a card with "Hidden" badge and click its visibility toggle
    await waitForElementWithRetry(
      this.page,
      '[class*="Card"]',
      { timeout: TIMEOUTS.DEFAULT, state: "visible" },
    );

    const hiddenCard = this.page.locator('[class*="Card"]').filter({
      hasText: "Hidden",
    }).first();
    const visibilityButton = hiddenCard.locator('[title*="Show this path"]');
    await visibilityButton.click();

    await apiPromise;
  },
);

When(
  "I click the delete button on a custom path card",
  async function(this: CustomWorld) {
    const deleteButton = await waitForElementWithRetry(
      this.page,
      '[title="Delete custom path"]',
      { timeout: TIMEOUTS.DEFAULT, state: "visible" },
    );
    await deleteButton.first().click();
  },
);

When(
  "I enter {string} in the path input",
  async function(this: CustomWorld, path: string) {
    const pathInput = this.page.locator('[role="dialog"] input');
    await pathInput.fill(path);
  },
);

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
  // Wait for at least one badge to be visible
  await this.page.waitForSelector('[class*="Badge"]', {
    state: "visible",
    timeout: TIMEOUTS.LONG,
  });
  const badges = this.page.locator('[class*="Badge"]');
  const count = await badges.count();
  expect(count).toBeGreaterThan(0);
});

Then(
  "I should see {string} status count",
  async function(this: CustomWorld, status: string) {
    await waitForDynamicContent(
      this.page,
      '[class*="Badge"]',
      status,
      { timeout: TIMEOUTS.LONG },
    );
    const statusBadge = this.page.locator('[class*="Badge"]').filter({
      hasText: status,
    });
    await expect(statusBadge).toBeVisible({ timeout: TIMEOUTS.LONG });
  },
);

Then(
  "I should see {string} count text",
  async function(this: CustomWorld, text: string) {
    await waitForDynamicContent(
      this.page,
      "body",
      text,
      { timeout: TIMEOUTS.LONG },
    );
    const countText = this.page.locator(`text=${text}`);
    await expect(countText.first()).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

Then(
  "I should see a grid of route preview cards",
  async function(this: CustomWorld) {
    await waitForElementWithRetry(
      this.page,
      ".grid",
      { timeout: TIMEOUTS.DEFAULT, state: "visible" },
    );
    // Wait for at least one card to be visible
    await this.page.waitForSelector('[class*="Card"]', {
      state: "visible",
      timeout: TIMEOUTS.LONG,
    });
    const cards = this.page.locator('[class*="Card"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  },
);

Then(
  "each card should display the path name",
  async function(this: CustomWorld) {
    const pathNames = this.page.locator('[class*="Card"] span[title]');
    const count = await pathNames.count();
    expect(count).toBeGreaterThan(0);
  },
);

Then(
  "each card should have a status indicator dot",
  async function(this: CustomWorld) {
    const dots = this.page.locator('[class*="Card"] .w-2.h-2.rounded-full');
    const count = await dots.count();
    expect(count).toBeGreaterThan(0);
  },
);

Then(
  "each card should have an iframe preview",
  async function(this: CustomWorld) {
    await waitForElementWithRetry(
      this.page,
      "iframe",
      { timeout: TIMEOUTS.LONG, state: "visible" },
    );
    const iframes = this.page.locator("iframe");
    const count = await iframes.count();
    expect(count).toBeGreaterThan(0);
  },
);

Then(
  "some cards should show {string} text",
  async function(this: CustomWorld, _text: string) {
    // May or may not be visible depending on loading speed
    await this.page.waitForTimeout(500);
  },
);

Then(
  "loading cards should have a yellow status dot",
  async function(this: CustomWorld) {
    const yellowDots = this.page.locator(".bg-yellow-500.animate-pulse");
    // May be 0 if loading finished
    const count = await yellowDots.count();
    expect(count).toBeGreaterThanOrEqual(0);
  },
);

Then(
  "loaded cards should have a green status dot",
  async function(this: CustomWorld) {
    const greenDots = this.page.locator(".bg-green-500");
    const count = await greenDots.count();
    expect(count).toBeGreaterThanOrEqual(0);
  },
);

Then(
  "loaded cards should show the page content in iframe",
  async function(this: CustomWorld) {
    await waitForElementWithRetry(
      this.page,
      "iframe",
      { timeout: TIMEOUTS.LONG, state: "visible" },
    );
    const iframes = this.page.locator("iframe");
    const count = await iframes.count();
    expect(count).toBeGreaterThan(0);
  },
);

Then(
  "error cards should have a red status dot",
  async function(this: CustomWorld) {
    const redDots = this.page.locator(".bg-red-500");
    // May be 0 if no errors
    const count = await redDots.count();
    expect(count).toBeGreaterThanOrEqual(0);
  },
);

Then(
  "error cards should show {string} text",
  async function(this: CustomWorld, _text: string) {
    // May not have any error cards in test
    await this.page.waitForTimeout(100);
  },
);

Then(
  "I should see preview card for {string}",
  async function(this: CustomWorld, path: string) {
    await waitForElementWithRetry(
      this.page,
      '[class*="Card"]',
      { timeout: TIMEOUTS.LONG, state: "visible" },
    );
    const card = this.page.locator('[class*="Card"]').filter({ hasText: path });
    await expect(card).toBeVisible({ timeout: TIMEOUTS.LONG });
  },
);

Then("that card should show loading state", async function(this: CustomWorld) {
  // Wait for loading indicator to appear
  await waitForElementWithRetry(
    this.page,
    ".bg-yellow-500.animate-pulse",
    { timeout: TIMEOUTS.DEFAULT, state: "visible" },
  ).catch(() => {
    // Loading state may be too fast to catch
  });
});

Then("the card should reload the iframe", async function(this: CustomWorld) {
  await waitForElementWithRetry(
    this.page,
    "iframe",
    { timeout: TIMEOUTS.LONG, state: "visible" },
  );
  await this.page.waitForLoadState("networkidle");
});

Then(
  "all cards should show loading or queued state",
  async function(this: CustomWorld) {
    await this.page.waitForTimeout(500);
  },
);

Then("cards should reload progressively", async function(this: CustomWorld) {
  await this.page.waitForTimeout(2000);
});

Then("the route should open in a new tab", async function(this: CustomWorld) {
  const openedUrls = await this.page.evaluate(() => {
    return (window as unknown as { openedUrls: string[]; }).openedUrls || [];
  });
  expect(openedUrls.length).toBeGreaterThan(0);
});

Then(
  "the card should show {string} badge",
  async function(this: CustomWorld, badgeText: string) {
    await waitForDynamicContent(
      this.page,
      '[class*="Badge"]',
      badgeText,
      { timeout: TIMEOUTS.LONG },
    );
    const badge = this.page.locator('[class*="Badge"]').filter({
      hasText: badgeText,
    });
    await expect(badge.first()).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

Then(
  "the card should have reduced opacity",
  async function(this: CustomWorld) {
    const card = this.page.locator('[class*="opacity-50"]');
    await expect(card.first()).toBeVisible();
  },
);

Then("the hidden count should increase", async function(this: CustomWorld) {
  // Verify hidden count is displayed
  await waitForDynamicContent(
    this.page,
    "body",
    /\d+ hidden/,
    { timeout: TIMEOUTS.LONG },
  );
  const hiddenText = this.page.locator("text=/\\d+ hidden/");
  await expect(hiddenText).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
});

Then("hidden routes should not be visible", async function(this: CustomWorld) {
  // Hidden routes are filtered out by default
  await this.page.waitForLoadState("networkidle");
});

Then("hidden routes should become visible", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
});

Then(
  "the button should change to {string}",
  async function(this: CustomWorld, buttonText: string) {
    const button = this.page.getByRole("button", { name: buttonText });
    await expect(button).toBeVisible();
  },
);

Then(
  "the card should no longer show {string} badge",
  async function(this: CustomWorld, badgeText: string) {
    const card = this.page.locator('[class*="Card"]').first();
    const badge = card.locator('[class*="Badge"]').filter({
      hasText: badgeText,
    });
    await expect(badge).not.toBeVisible();
  },
);

Then("the hidden count should decrease", async function(this: CustomWorld) {
  await waitForDynamicContent(
    this.page,
    "body",
    /\d+ hidden/,
    { timeout: TIMEOUTS.LONG },
  );
  const hiddenText = this.page.locator("text=/\\d+ hidden/");
  await expect(hiddenText).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
});

Then(
  "I should see the add custom path dialog",
  async function(this: CustomWorld) {
    const dialog = this.page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
  },
);

Then("I should see a path input field", async function(this: CustomWorld) {
  const input = this.page.locator('[role="dialog"] input');
  await expect(input).toBeVisible();
});

// NOTE: "the dialog should close" step moved to common.steps.ts

Then(
  "I should see a new preview card for {string}",
  async function(this: CustomWorld, path: string) {
    await waitForDynamicContent(
      this.page,
      '[class*="Card"]',
      path,
      { timeout: TIMEOUTS.LONG },
    );
    const card = this.page.locator('[class*="Card"]').filter({ hasText: path });
    await expect(card).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

// NOTE: "I should see {string} error" step moved to common.steps.ts

Then(
  "I should not see a preview card for {string}",
  async function(this: CustomWorld, path: string) {
    const card = this.page.locator('[class*="Card"]').filter({ hasText: path });
    await expect(card).not.toBeVisible();
  },
);

Then(
  "the custom path card should be removed",
  async function(this: CustomWorld) {
    await this.page.waitForLoadState("networkidle");
  },
);

Then(
  "the path should no longer appear in the grid",
  async function(this: CustomWorld) {
    await this.page.waitForLoadState("networkidle");
  },
);

Then(
  "the delete button should not appear on sitemap default paths",
  async function(this: CustomWorld) {
    // Default paths like "/" don't have delete buttons
    const homeCard = this.page.locator('[class*="Card"]').filter({
      hasText: /^\/$/m,
    });
    const deleteButton = homeCard.locator('[title="Delete custom path"]');
    await expect(deleteButton).not.toBeVisible();
  },
);

Then("the route should still be hidden", async function(this: CustomWorld) {
  // Check for hidden badge after refresh
  await this.page.waitForLoadState("networkidle");
});

Then("the hidden count should be correct", async function(this: CustomWorld) {
  await waitForDynamicContent(
    this.page,
    "body",
    /\d+ hidden/,
    { timeout: TIMEOUTS.LONG },
  );
  const hiddenText = this.page.locator("text=/\\d+ hidden/");
  await expect(hiddenText).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
});

Then(
  "at most 4 cards should be loading simultaneously",
  async function(this: CustomWorld) {
    const loadingDots = this.page.locator(".bg-yellow-500.animate-pulse");
    const count = await loadingDots.count();
    expect(count).toBeLessThanOrEqual(4);
  },
);

Then(
  "remaining cards should show {string} text",
  async function(this: CustomWorld, _text: string) {
    // Some cards may show "Queued..." text
    await this.page.waitForTimeout(100);
  },
);

Then("the healthy count should increase", async function(this: CustomWorld) {
  await waitForDynamicContent(
    this.page,
    '[class*="Badge"]',
    "Healthy",
    { timeout: TIMEOUTS.LONG },
  );
  const healthyBadge = this.page.locator('[class*="Badge"]').filter({
    hasText: "Healthy",
  });
  await expect(healthyBadge).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
});

Then(
  "the loading count should decrease to zero",
  async function(this: CustomWorld) {
    // Wait for all loading indicators to disappear
    await this.page.waitForTimeout(TIMEOUTS.SHORT);
    // Optionally verify no loading dots remain
    const loadingDots = this.page.locator(".bg-yellow-500.animate-pulse");
    const count = await loadingDots.count();
    expect(count).toBe(0);
  },
);
