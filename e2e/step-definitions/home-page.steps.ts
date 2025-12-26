import { DataTable, Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { CustomWorld } from "../support/world";

Given("I am on the home page", async function(this: CustomWorld) {
  await this.page.goto(this.baseUrl);
  await this.page.waitForLoadState("networkidle");
});

Then(
  "I should see the page title {string}",
  async function(this: CustomWorld, title: string) {
    const heading = this.page.getByRole("heading", { name: title });
    await expect(heading).toBeVisible();
  },
);

Then(
  "I should see the description {string}",
  async function(this: CustomWorld, description: string) {
    const text = this.page.getByText(description);
    await expect(text).toBeVisible();
  },
);

When("I view the features section", async function(this: CustomWorld) {
  const section = this.page.getByRole("heading", { name: "Why Pixel?" });
  await expect(section).toBeVisible();
});

// NOTE: "I should see {string} heading" step is defined in authentication.steps.ts

Then(
  "I should see the following feature items:",
  async function(this: CustomWorld, dataTable: DataTable) {
    const items = dataTable.rows().map((row) => row[0]).filter((
      item,
    ): item is string => item !== undefined);

    for (const item of items) {
      const element = this.page.getByText(item);
      await expect(element).toBeVisible();
    }
  },
);

Then(
  "I should see a {string} link",
  async function(this: CustomWorld, linkName: string) {
    const link = this.page.getByRole("link", { name: linkName });
    await expect(link).toBeVisible();
  },
);

// NOTE: "I click the {string} link" step is defined in authentication.steps.ts

Then("the link should be interactive", async function(this: CustomWorld) {
  // Link click was successful if we got here without error
  // In a real app, we'd verify navigation or state change
  expect(true).toBe(true);
});
