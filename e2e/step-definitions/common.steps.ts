import { Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { CustomWorld } from "../support/world";

// Common button click step used across multiple features
When("I click {string} button", async function(this: CustomWorld, buttonText: string) {
  const button = this.page.getByRole("button", { name: new RegExp(buttonText, "i") });
  await button.click();
});

// Common success message check
Then("I should see a success message", async function(this: CustomWorld) {
  const successMessage = this.page.locator('[role="status"], .success, .toast, [class*="success"]');
  await expect(successMessage).toBeVisible({ timeout: 10000 });
});

// Common error message check
Then("I should see an error message", async function(this: CustomWorld) {
  const errorMessage = this.page.locator('[role="alert"], .error, .toast, [class*="error"]');
  await expect(errorMessage).toBeVisible({ timeout: 10000 });
});

// Common modal close check
Then("the modal should close", async function(this: CustomWorld) {
  const modal = this.page.locator('[role="dialog"], [class*="modal"]');
  await expect(modal).not.toBeVisible();
});

// Common cancel deletion step
When("I cancel the deletion confirmation", async function(this: CustomWorld) {
  const cancelButton = this.page.getByRole("button", { name: /cancel/i });
  await cancelButton.click();
});

// Common button visibility check
Then("I should see {string} button", async function(this: CustomWorld, buttonText: string) {
  const button = this.page.getByRole("button", { name: new RegExp(buttonText, "i") });
  await expect(button).toBeVisible();
});

// Common Stripe redirect check
Then("I should be redirected to Stripe checkout", async function(this: CustomWorld) {
  await this.page.waitForURL(/checkout\.stripe\.com/, { timeout: 15000 });
  expect(this.page.url()).toContain("stripe.com");
});
