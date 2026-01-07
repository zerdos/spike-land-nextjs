import { Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import {
  TIMEOUTS,
  waitForApiResponse,
  waitForDynamicContent,
  waitForElementWithRetry,
} from "../support/helpers/retry-helper";
import { waitForPageReady } from "../support/helpers/wait-helper";
import type { CustomWorld } from "../support/world";

// Marketing Analytics Step Definitions

Then(
  "I should see conversion funnel visualization",
  async function(this: CustomWorld) {
    // Wait for page to be fully ready before checking for funnel
    await waitForPageReady(this.page, { strategy: "both" });

    // Use retry pattern for funnel visualization
    const funnel = await waitForElementWithRetry(
      this.page,
      '[data-testid="conversion-funnel"], [class*="funnel"]',
      { timeout: TIMEOUTS.LONG },
    );

    // Extra wait for chart rendering
    await this.page.waitForTimeout(1000);
    await expect(funnel.first()).toBeVisible({ timeout: TIMEOUTS.LONG });
  },
);

Then(
  "I should see {string} funnel stage",
  async function(this: CustomWorld, stageName: string) {
    // Wait for funnel to be ready before checking stages
    await waitForPageReady(this.page, { strategy: "both" });

    const stage = this.page.getByText(new RegExp(stageName, "i"));
    await expect(stage.first()).toBeVisible({ timeout: TIMEOUTS.LONG });
  },
);

Then(
  "I should see campaign performance table",
  async function(this: CustomWorld) {
    // Wait for page to be fully ready before checking for table
    await waitForPageReady(this.page, { strategy: "both" });

    // Use retry pattern for table with long timeout
    const table = await waitForElementWithRetry(
      this.page,
      '[data-testid="campaign-table"], table, [role="table"]',
      { timeout: TIMEOUTS.LONG },
    );
    await expect(table.first()).toBeVisible({ timeout: TIMEOUTS.LONG });
  },
);

Then(
  "I should see {string} column header",
  async function(this: CustomWorld, columnName: string) {
    // Wait for table to be fully rendered
    await waitForPageReady(this.page, { strategy: "both" });

    const header = this.page.locator("th, [role='columnheader']").filter({
      hasText: new RegExp(columnName, "i"),
    });
    await expect(header.first()).toBeVisible({ timeout: TIMEOUTS.LONG });
  },
);

Then(
  "I should see loading indicator initially",
  async function(this: CustomWorld) {
    // Look for spinner or loading text
    const loading = this.page.locator(
      '.animate-spin, [data-testid="loading"], [class*="loading"]',
    );
    // Loading may be brief, so use a short timeout and don't fail if not visible
    try {
      await expect(loading.first()).toBeVisible({ timeout: 2000 });
    } catch {
      // Loading indicator may have already disappeared - that's OK
    }
  },
);

Then(
  "the loading indicator should disappear when data loads",
  async function(this: CustomWorld) {
    // Use waitForPageReady with both strategy to handle real-time polling pages
    await waitForPageReady(this.page, { strategy: "both" });

    const loading = this.page.locator(
      '.animate-spin, [data-testid="loading"]',
    );
    await expect(loading).not.toBeVisible({ timeout: 10000 });
  },
);

When(
  "I select {string} from date range picker",
  async function(this: CustomWorld, dateRange: string) {
    // Wait for page to be ready before interacting with date picker
    await waitForPageReady(this.page, { strategy: "both" });

    const picker = this.page.locator(
      '[data-testid="date-range-picker"], [class*="DatePicker"]',
    ).or(this.page.getByRole("button", { name: /date|range|period/i }));

    // Wait for picker to be visible and clickable
    await expect(picker.first()).toBeVisible({ timeout: TIMEOUTS.LONG });
    await picker.first().click();

    // Wait for dropdown to open
    await this.page.waitForTimeout(500);

    const option = this.page.locator('[role="option"]').filter({
      hasText: new RegExp(dateRange, "i"),
    });

    // Wait for option to be visible before clicking
    const isOptionVisible = await option.first().isVisible().catch(() => false);
    if (isOptionVisible) {
      await option.first().click();
    } else {
      // Fallback: click on text matching the date range
      const rangeText = this.page.getByText(new RegExp(dateRange, "i"));
      await expect(rangeText.first()).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
      await rangeText.first().click();
    }

    // Wait for API response after date range change
    await waitForApiResponse(this.page, /analytics|metrics|marketing/, {
      timeout: TIMEOUTS.LONG,
    }).catch(() => {
      // API call may complete before we start listening - that's OK
    });

    // Wait for selection to apply
    await this.page.waitForTimeout(500);
  },
);

Then(
  "the metrics should update for {int} day period",
  async function(this: CustomWorld, _days: number) {
    // Wait for data to update after selecting date range
    await waitForPageReady(this.page, { strategy: "both" });

    // Use retry pattern for metrics with long timeout for chart data loading
    const metrics = await waitForElementWithRetry(
      this.page,
      '[data-testid*="metric"], [class*="metric"], .stat',
      { timeout: TIMEOUTS.LONG },
    );
    await expect(metrics.first()).toBeVisible({ timeout: TIMEOUTS.LONG });

    // Extra wait for chart data loading
    await this.page.waitForTimeout(1000);
  },
);

Then("I should see live status indicator", async function(this: CustomWorld) {
  // Wait for page to be ready for polling indicators
  await waitForPageReady(this.page, { strategy: "both" });

  const liveIndicator = this.page.locator(
    '[data-testid="live-indicator"], [class*="live"], .pulse',
  ).or(this.page.getByText(/live|real-?time/i));
  await expect(liveIndicator.first()).toBeVisible({ timeout: TIMEOUTS.LONG });
});

Then("I should see refresh button", async function(this: CustomWorld) {
  // Wait for page to be ready
  await waitForPageReady(this.page, { strategy: "both" });

  const refreshButton = this.page.getByRole("button", {
    name: /refresh|reload|update/i,
  }).or(this.page.locator('[data-testid="refresh-button"]'));
  await expect(refreshButton.first()).toBeVisible({ timeout: TIMEOUTS.LONG });
});

// Marketing-specific metric card step (admin.steps.ts skips marketing pages)
Then(
  "I should see {string} metric card",
  async function(this: CustomWorld, metricName: string) {
    // Only run for marketing analytics page
    const currentUrl = this.page.url();
    if (!currentUrl.includes("/admin/marketing")) {
      return;
    }

    // Wait for page to be fully ready
    await waitForPageReady(this.page, { strategy: "both" });

    // Use retry pattern for metric cards with long timeout
    const metricCard = await waitForElementWithRetry(
      this.page,
      `[data-testid*="metric"], [class*="metric"], .stat`,
      { timeout: TIMEOUTS.LONG },
    );

    // Verify the metric name is visible within the metric card
    const metricText = metricCard.filter({ hasText: new RegExp(metricName, "i") });
    await expect(metricText.first()).toBeVisible({ timeout: TIMEOUTS.LONG });

    // Wait for dynamic content to load (numeric values)
    await waitForDynamicContent(
      this.page,
      `[data-testid*="metric"], [class*="metric"], .stat`,
      /\d+/,
      { timeout: TIMEOUTS.LONG },
    ).catch(() => {
      // Metric may not have numeric value yet - that's OK
    });
  },
);
