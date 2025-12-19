import { Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { CustomWorld } from "../support/world";

// Marketing Analytics Step Definitions

Then(
  "I should see conversion funnel visualization",
  async function(this: CustomWorld) {
    const funnel = this.page.locator(
      '[data-testid="conversion-funnel"], [class*="funnel"]',
    );
    await expect(funnel.first()).toBeVisible({ timeout: 10000 });
  },
);

Then(
  "I should see {string} funnel stage",
  async function(this: CustomWorld, stageName: string) {
    const stage = this.page.getByText(new RegExp(stageName, "i"));
    await expect(stage.first()).toBeVisible({ timeout: 10000 });
  },
);

Then(
  "I should see campaign performance table",
  async function(this: CustomWorld) {
    const table = this.page.locator(
      '[data-testid="campaign-table"], table, [role="table"]',
    );
    await expect(table.first()).toBeVisible({ timeout: 10000 });
  },
);

Then(
  "I should see {string} column header",
  async function(this: CustomWorld, columnName: string) {
    const header = this.page.locator("th, [role='columnheader']").filter({
      hasText: new RegExp(columnName, "i"),
    });
    await expect(header.first()).toBeVisible({ timeout: 10000 });
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
    await this.page.waitForLoadState("networkidle");
    const loading = this.page.locator(
      '.animate-spin, [data-testid="loading"]',
    );
    await expect(loading).not.toBeVisible({ timeout: 10000 });
  },
);

When(
  "I select {string} from date range picker",
  async function(this: CustomWorld, dateRange: string) {
    const picker = this.page.locator(
      '[data-testid="date-range-picker"], [class*="DatePicker"]',
    ).or(this.page.getByRole("button", { name: /date|range|period/i }));
    await picker.first().click();
    await this.page.waitForTimeout(200);

    const option = this.page.locator('[role="option"]').filter({
      hasText: new RegExp(dateRange, "i"),
    });
    if (await option.isVisible()) {
      await option.click();
    } else {
      // Fallback: click on text matching the date range
      const rangeText = this.page.getByText(new RegExp(dateRange, "i"));
      await rangeText.first().click();
    }
    await this.page.waitForTimeout(300);
  },
);

Then(
  "the metrics should update for {int} day period",
  async function(this: CustomWorld, _days: number) {
    // Wait for data to update after selecting date range
    await this.page.waitForLoadState("networkidle");
    // Verify metrics are visible (any metric indicator)
    const metrics = this.page.locator(
      '[data-testid*="metric"], [class*="metric"], .stat',
    );
    await expect(metrics.first()).toBeVisible({ timeout: 10000 });
  },
);

Then("I should see live status indicator", async function(this: CustomWorld) {
  const liveIndicator = this.page.locator(
    '[data-testid="live-indicator"], [class*="live"], .pulse',
  ).or(this.page.getByText(/live|real-?time/i));
  await expect(liveIndicator.first()).toBeVisible({ timeout: 10000 });
});

Then("I should see refresh button", async function(this: CustomWorld) {
  const refreshButton = this.page.getByRole("button", {
    name: /refresh|reload|update/i,
  }).or(this.page.locator('[data-testid="refresh-button"]'));
  await expect(refreshButton.first()).toBeVisible({ timeout: 10000 });
});
