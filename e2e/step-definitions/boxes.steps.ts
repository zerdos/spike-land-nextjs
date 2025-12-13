import { Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { CustomWorld } from "../support/world";

When("I select the {string} tier", async function(this: CustomWorld, tierName: string) {
  // Find the card that contains the tier name and click it
  // The tier name is in a CardTitle
  const card = this.page.locator(".border", { has: this.page.getByText(tierName) }).first();
  await card.click();
});

When("I enter {string} into the box name field", async function(this: CustomWorld, name: string) {
  await this.page.getByLabel("Box Name").fill(name);
});

Then("I should see {string} Tier text", async function(this: CustomWorld, text: string) {
  await expect(this.page.getByText(text)).toBeVisible();
});
