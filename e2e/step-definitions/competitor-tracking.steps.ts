import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import type { CustomWorld } from "../support/world";

const TIMEOUTS = { DEFAULT: 10000, LONG: 30000 };

Given('I am on the "/competitors" page', async function(this: CustomWorld) {
  await this.page.goto(`${this.baseUrl}/competitors`);
  await this.page.waitForLoadState("networkidle");
});

When(
  'I fill in "{string}" with "{string}"',
  async function(this: CustomWorld, name: string, value: string) {
    const field = this.page.locator(`[name="${name}"]`);
    await expect(field).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
    await field.fill(value);
  },
);

When(
  'I click the "{string}" button',
  async function(this: CustomWorld, buttonText: string) {
    const button = this.page.getByRole("button", { name: new RegExp(buttonText, "i") });
    await expect(button.first()).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
    await button.first().click();
  },
);

Then(
  'I should see "{string}" in the table',
  async function(this: CustomWorld, text: string) {
    const table = this.page.locator("table");
    await expect(table).toBeVisible({ timeout: TIMEOUTS.LONG });
    await expect(table).toContainText(text, { timeout: TIMEOUTS.DEFAULT });
  },
);

When(
  'I click the "{string}" button for "{string}"',
  async function(
    this: CustomWorld,
    buttonText: string,
    competitorName: string,
  ) {
    const row = this.page.locator("tr", { hasText: competitorName });
    await expect(row).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
    const button = row.getByRole("button", { name: new RegExp(buttonText, "i") });
    await expect(button).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
    await button.click();
  },
);

Then(
  'I should not see "{string}" in the table',
  async function(this: CustomWorld, text: string) {
    const table = this.page.locator("table");
    await expect(table).toBeVisible({ timeout: TIMEOUTS.LONG });
    await expect(table).not.toContainText(text, { timeout: TIMEOUTS.DEFAULT });
  },
);
