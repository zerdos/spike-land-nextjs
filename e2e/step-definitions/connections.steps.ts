import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { mockSession } from "../support/helpers/auth-helper";
import type { CustomWorld } from "../support/world";

Given("I am logged in to Orbit", async function(this: CustomWorld) {
  await mockSession(this.page!, {
    email: "orbit-user@example.com",
    name: "Orbit User",
  });
});

Given("I am in a workspace", async function(this: CustomWorld) {
  this.workspaceSlug = "test-workspace";
});

Given("I have a connection {string}", async function(this: CustomWorld, name: string) {
  // Mock the connections API to include this connection
  await this.page!.route("**/api/orbit/*/connections*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        connections: [{
          id: "e2e-connection-1",
          name,
          createdAt: new Date().toISOString(),
          status: "ACTIVE",
        }],
      }),
    });
  });
});

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

When(
  "I create a reminder {string} for {string} due tomorrow",
  async function(this: CustomWorld, reminderText: string, _connectionName: string) {
    await this.page!.getByRole("button", { name: /Add Reminder|Create Reminder/i }).click();
    await this.page!.getByPlaceholder(/reminder|title/i).fill(reminderText);
    // Set due date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateInput = this.page!.locator('input[type="date"]').or(
      this.page!.getByLabel(/due date/i),
    );
    if (await dateInput.count() > 0) {
      await dateInput.fill(tomorrow.toISOString().split("T")[0] ?? "");
    }
    await this.page!.getByRole("button", { name: /Create|Save/i }).click();
  },
);

Then(
  "I should see {string} in the upcoming reminders",
  async function(this: CustomWorld, reminderText: string) {
    await expect(this.page!.getByText(reminderText)).toBeVisible();
  },
);

When(
  "I snooze the reminder {string} for 1 hour",
  async function(this: CustomWorld, reminderText: string) {
    const reminderRow = this.page!.locator("li, tr, [data-testid]").filter({ hasText: reminderText });
    await reminderRow.getByRole("button", { name: /Snooze/i }).click();
    // Select 1 hour option if a dropdown appears
    const hourOption = this.page!.getByRole("option", { name: /1 hour/i }).or(
      this.page!.getByText(/1 hour/i),
    );
    if (await hourOption.count() > 0) {
      await hourOption.click();
    }
  },
);

Then(
  "the reminder {string} should be snoozed",
  async function(this: CustomWorld, reminderText: string) {
    const reminderRow = this.page!.locator("li, tr, [data-testid]").filter({ hasText: reminderText });
    await expect(reminderRow.getByText(/snoozed/i)).toBeVisible();
  },
);

When(
  "I complete the reminder {string}",
  async function(this: CustomWorld, reminderText: string) {
    const reminderRow = this.page!.locator("li, tr, [data-testid]").filter({ hasText: reminderText });
    await reminderRow.getByRole("button", { name: /Complete|Done/i }).or(
      reminderRow.getByRole("checkbox"),
    ).click();
  },
);

Then(
  "the reminder {string} should be marked as completed",
  async function(this: CustomWorld, reminderText: string) {
    const reminderRow = this.page!.locator("li, tr, [data-testid]").filter({ hasText: reminderText });
    await expect(
      reminderRow.getByText(/completed/i).or(reminderRow.locator('[data-completed="true"]')),
    ).toBeVisible();
  },
);
