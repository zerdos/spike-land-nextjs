import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import type { CustomWorld } from "../support/world";

When("I navigate to the Allocator Audit page", async function (this: CustomWorld) {
  await this.page.goto(`/orbit/${this.workspaceSlug}/allocator/audit`);
});

Then(
  "I should see an audit log entry for {string}",
  async function (this: CustomWorld, type: string) {
    // Retry finding the text as it might take time to load or appear
    await expect(this.page.getByText(type)).toBeVisible({ timeout: 10000 });
  },
);

Then(
  "the audit log trigger should be {string}",
  async function (this: CustomWorld, trigger: string) {
    await expect(this.page.getByText(trigger)).toBeVisible();
  },
);

Then(
  "the audit log outcome should be {string}",
  async function (this: CustomWorld, outcome: string) {
    await expect(this.page.getByText(outcome)).toBeVisible();
  },
);

Given("I see the audit log table", async function (this: CustomWorld) {
  await expect(this.page.locator("table")).toBeVisible();
});

When("I search for {string}", async function (this: CustomWorld, query: string) {
  const searchInput = this.page.getByPlaceholder("Search by Execution ID...");
  await searchInput.fill(query);
  await searchInput.press("Enter");
  // Waiting for network idle or results update is handled by the next assertion's retry mechanism
});

Then("I should see {string} in the results", async function (this: CustomWorld, content: string) {
  await expect(this.page.getByText(content)).toBeVisible();
});
