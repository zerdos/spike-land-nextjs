import { Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import type { CustomWorld } from "../support/world";

When(
  "I select the {string} tier",
  async function(this: CustomWorld, tierName: string) {
    // Wait for tier cards to load
    await this.page.waitForSelector(`text=${tierName}`, { timeout: 10000 });

    // Find the clickable card containing the tier name
    // Try multiple selector strategies for robustness:
    // 1. Card with data-testid (preferred)
    // 2. Card with cursor-pointer class and containing the tier name text
    // 3. Any clickable element containing the tier name
    const cardByTestId = this.page.locator(
      `[data-testid="tier-card-${tierName.toLowerCase()}"]`,
    );
    const cardByClass = this.page.locator(".cursor-pointer").filter({
      has: this.page.getByText(tierName, { exact: true }),
    });
    const cardByHeading = this.page.locator('[class*="cursor-pointer"]').filter({
      has: this.page.getByRole("heading", { name: tierName }),
    });

    const tierCard = cardByTestId.or(cardByClass).or(cardByHeading).first();

    await expect(tierCard).toBeVisible({ timeout: 5000 });
    await tierCard.click();
  },
);

When(
  "I enter {string} into the box name field",
  async function(this: CustomWorld, name: string) {
    await this.page.getByLabel("Box Name").fill(name);
  },
);

Then(
  "I should see {string} Tier text",
  async function(this: CustomWorld, text: string) {
    await expect(this.page.getByText(text)).toBeVisible();
  },
);
