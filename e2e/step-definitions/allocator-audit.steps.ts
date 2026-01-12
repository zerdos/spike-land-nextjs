import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import type { CustomWorld } from "../support/world";

Given("I navigate to the Allocator Audit page", async function(this: CustomWorld) {
  // Assuming the URL structure
  await this.page.goto(`/orbit/${this.workspaceSlug}/allocator/audit`);
});

Then(
  "I should see an audit log entry for {string}",
  async function(this: CustomWorld, type: string) {
    // Refresh until found or timeout (simple check for now)
    await expect(this.page.getByText(type)).toBeVisible({ timeout: 10000 });
  },
);

Then(
  "the audit log trigger should be {string}",
  async function(this: CustomWorld, trigger: string) {
    await expect(this.page.getByText(trigger)).toBeVisible();
  },
);

Then(
  "the audit log outcome should be {string}",
  async function(this: CustomWorld, outcome: string) {
    await expect(this.page.getByText(outcome)).toBeVisible();
  },
);

Then("I should see the audit log table", async function(this: CustomWorld) {
  await expect(this.page.locator("table")).toBeVisible();
});

When("I search for {string}", async function(this: CustomWorld, query: string) {
  const searchInput = this.page.getByPlaceholder("Search by Execution ID or content...");
  await searchInput.fill(query);
  await searchInput.press("Enter"); // Or wait for debounce
  await this.page.waitForTimeout(1000); // Wait for fetch
});

Then("I should see {string} in the results", async function(this: CustomWorld, content: string) {
  await expect(this.page.getByText(content)).toBeVisible();
});
