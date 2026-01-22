import { Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import type { CustomWorld } from "../support/world";

When("I navigate to the Connections page", async function(this: CustomWorld) {
  await this.page!.goto(`/orbit/${this.workspaceSlug}/connections`);
});

Then("I should see the connections list header", async function(this: CustomWorld) {
  await expect(this.page!.getByRole("heading", { name: "Connections" })).toBeVisible();
});

When("I create a new connection {string}", async function(this: CustomWorld, name: string) {
  await this.page!.getByRole("button", { name: "Add Connection" }).click();
  await this.page!.getByPlaceholder("Name").fill(name);
  await this.page!.getByRole("button", { name: "Create" }).click();
});

Then("I should see {string} in the list", async function(this: CustomWorld, name: string) {
  await expect(this.page!.getByText(name)).toBeVisible();
});

When("I click on {string} connection", async function(this: CustomWorld, name: string) {
  await this.page!.getByText(name).click();
});

Then(
  "I should see the connection details for {string}",
  async function(this: CustomWorld, name: string) {
    await expect(this.page!.getByRole("heading", { name: name })).toBeVisible();
  },
);

When("I update the meetup status to {string}", async function(this: CustomWorld, status: string) {
  await this.page!.getByRole("combobox", { name: "Pipeline" }).click();
  await this.page!.getByRole("option", { name: status }).click();
});

Then(
  "I should see the status {string} on the page",
  async function(this: CustomWorld, status: string) {
    await expect(this.page!.getByText(status)).toBeVisible();
  },
);

When("I navigate to the Reminders page", async function(this: CustomWorld) {
  await this.page!.goto(`/orbit/${this.workspaceSlug}/reminders`);
});

Then("I should see the reminders list header", async function(this: CustomWorld) {
  await expect(this.page!.getByRole("heading", { name: "Reminders" })).toBeVisible();
});

// ... implementations for other steps would follow similar pattern
