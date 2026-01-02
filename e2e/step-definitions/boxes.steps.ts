import { Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import type { CustomWorld } from "../support/world";

When(
  "I select the {string} tier",
  async function(this: CustomWorld, tierName: string) {
    // Wait for tier cards to load
    await this.page.waitForSelector(`text=${tierName}`, { timeout: 10000 });

    // Find the clickable card containing the tier name heading
    const tierCard = this.page.locator('[class*="cursor-pointer"]', {
      has: this.page.getByRole("heading", { name: tierName }),
    }).first();

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
