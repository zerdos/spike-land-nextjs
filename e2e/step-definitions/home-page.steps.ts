import { Given, Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import type { CustomWorld } from "../support/world";

Given("I am on the home page", async function(this: CustomWorld) {
  await this.page.goto(this.baseUrl);
  await this.page.waitForLoadState("networkidle");
});

Then(
  "I should see a link to {string}",
  async function(this: CustomWorld, href: string) {
    const link = this.page.locator(`a[href="${href}"], a[href^="${href}"]`);
    await expect(link.first()).toBeVisible();
  },
);
