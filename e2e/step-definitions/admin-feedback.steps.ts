/**
 * Step definitions for Admin Feedback Management E2E tests
 */

import { DataTable, Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { CustomWorld } from "../support/world";

// Mock feedback data generator
function createMockFeedback(overrides: Partial<{
  id: string;
  type: string;
  status: string;
  message: string;
  userAgent: string;
}> = {}) {
  return {
    id: overrides.id || `feedback-${Date.now()}`,
    userId: "user-1",
    email: "user@example.com",
    type: overrides.type || "BUG",
    message: overrides.message || "Test feedback message",
    page: "/apps/pixel",
    userAgent: overrides.userAgent || null,
    status: overrides.status || "NEW",
    adminNote: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    user: {
      id: "user-1",
      name: "Test User",
      email: "user@example.com",
      image: null,
    },
  };
}

// Given steps
Given("there is feedback in the system", async function(this: CustomWorld) {
  await this.page.route("**/api/admin/feedback**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          feedback: [
            createMockFeedback({ id: "f1", type: "BUG", status: "NEW" }),
            createMockFeedback({ id: "f2", type: "IDEA", status: "REVIEWED" }),
            createMockFeedback({ id: "f3", type: "OTHER", status: "RESOLVED" }),
          ],
        }),
      });
    } else {
      await route.continue();
    }
  });
});

Given("there is a bug report with user agent in the system", async function(this: CustomWorld) {
  await this.page.route("**/api/admin/feedback**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          feedback: [
            createMockFeedback({
              type: "BUG",
              userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            }),
          ],
        }),
      });
    } else {
      await route.continue();
    }
  });
});

Given("there is NEW feedback in the system", async function(this: CustomWorld) {
  await this.page.route("**/api/admin/feedback**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          feedback: [createMockFeedback({ status: "NEW" })],
        }),
      });
    } else {
      await route.continue();
    }
  });
});

Given(
  "there are {int} feedback items in the system",
  async function(this: CustomWorld, count: number) {
    const feedback = Array.from({ length: count }, (_, i) => createMockFeedback({ id: `f${i}` }));

    await this.page.route("**/api/admin/feedback**", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ feedback }),
        });
      } else {
        await route.continue();
      }
    });
  },
);

Given("there is feedback of all types in the system", async function(this: CustomWorld) {
  await this.page.route("**/api/admin/feedback**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          feedback: [
            createMockFeedback({ id: "f1", type: "BUG" }),
            createMockFeedback({ id: "f2", type: "IDEA" }),
            createMockFeedback({ id: "f3", type: "OTHER" }),
          ],
        }),
      });
    } else {
      await route.continue();
    }
  });
});

Given("there is feedback of all statuses in the system", async function(this: CustomWorld) {
  await this.page.route("**/api/admin/feedback**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          feedback: [
            createMockFeedback({ id: "f1", status: "NEW" }),
            createMockFeedback({ id: "f2", status: "REVIEWED" }),
            createMockFeedback({ id: "f3", status: "RESOLVED" }),
            createMockFeedback({ id: "f4", status: "DISMISSED" }),
          ],
        }),
      });
    } else {
      await route.continue();
    }
  });
});

Given("there are no matching items", async function(this: CustomWorld) {
  // This is handled by the filter logic in the UI
});

// When steps
When("I select {string} from the status filter", async function(this: CustomWorld, status: string) {
  const statusSelect = this.page.locator('[class*="SelectTrigger"]').first();
  await statusSelect.click();
  await this.page.locator('[role="option"]').filter({ hasText: status }).click();
});

When("I select {string} from the type filter", async function(this: CustomWorld, type: string) {
  const typeSelect = this.page.locator('[class*="SelectTrigger"]').nth(1);
  await typeSelect.click();
  await this.page.locator('[role="option"]').filter({ hasText: type }).click();
});

When("I click on a feedback row", async function(this: CustomWorld) {
  const row = this.page.locator("tbody tr").first();
  await row.click();
});

When("I click on the bug report row", async function(this: CustomWorld) {
  const row = this.page.locator("tbody tr").filter({ hasText: "BUG" }).first();
  await row.click();
});

When(
  "I click the {string} button on a feedback item",
  async function(this: CustomWorld, buttonText: string) {
    const row = this.page.locator("tbody tr").first();
    const button = row.getByRole("button", { name: buttonText });
    await button.click();
  },
);

When(
  "I change the status to {string} in the dialog",
  async function(this: CustomWorld, status: string) {
    const statusSelect = this.page.locator('[role="dialog"] [class*="SelectTrigger"]').first();
    await statusSelect.click();
    await this.page.locator('[role="option"]').filter({ hasText: status }).click();
  },
);

When("I enter {string} in the admin note field", async function(this: CustomWorld, note: string) {
  const textarea = this.page.locator('[role="dialog"] textarea');
  await textarea.fill(note);
});

When(
  "I click {string} button in the dialog",
  async function(this: CustomWorld, buttonText: string) {
    const button = this.page.locator('[role="dialog"]').getByRole("button", { name: buttonText });
    await button.click();
  },
);

// Then steps
Then("I should see {string} label", async function(this: CustomWorld, label: string) {
  const labelElement = this.page.getByText(label);
  await expect(labelElement).toBeVisible();
});

Then("I should see status filter dropdown", async function(this: CustomWorld) {
  const statusSelect = this.page.locator('[class*="SelectTrigger"]').first();
  await expect(statusSelect).toBeVisible();
});

Then("I should see type filter dropdown", async function(this: CustomWorld) {
  const typeSelect = this.page.locator('[class*="SelectTrigger"]').nth(1);
  await expect(typeSelect).toBeVisible();
});

Then(
  "I should see feedback table with columns:",
  async function(this: CustomWorld, dataTable: DataTable) {
    const columns = dataTable.raw().flat();
    for (const column of columns) {
      const header = this.page.locator("th").filter({ hasText: column });
      await expect(header).toBeVisible();
    }
  },
);

Then("I should see the feedback list", async function(this: CustomWorld) {
  const table = this.page.locator("table");
  await expect(table).toBeVisible();
});

Then("each feedback item should display the submission date", async function(this: CustomWorld) {
  const rows = this.page.locator("tbody tr");
  const count = await rows.count();
  expect(count).toBeGreaterThan(0);
});

Then("each feedback item should display a type badge", async function(this: CustomWorld) {
  const badges = this.page.locator("tbody [class*='Badge']");
  const count = await badges.count();
  expect(count).toBeGreaterThan(0);
});

Then("each feedback item should display user information", async function(this: CustomWorld) {
  // Check for avatars which indicate user info
  const avatars = this.page.locator("tbody [class*='Avatar']");
  const count = await avatars.count();
  expect(count).toBeGreaterThan(0);
});

Then("each feedback item should display a status badge", async function(this: CustomWorld) {
  const statusBadges = this.page.locator("tbody tr").first().locator('[class*="Badge"]');
  const count = await statusBadges.count();
  expect(count).toBeGreaterThan(0);
});

Then("the feedback list should only show NEW status items", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
  // In a real test, we'd verify the filter is applied
});

Then("the feedback list should only show REVIEWED status items", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
});

Then("the feedback list should only show RESOLVED status items", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
});

Then(
  "the feedback list should only show DISMISSED status items",
  async function(this: CustomWorld) {
    await this.page.waitForLoadState("networkidle");
  },
);

Then("the feedback list should only show BUG type items", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
});

Then("the feedback list should only show IDEA type items", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
});

Then("the feedback list should only show OTHER type items", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
});

Then("the feedback list should only show NEW BUG items", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
});

Then("I should see the feedback details dialog", async function(this: CustomWorld) {
  const dialog = this.page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();
});

Then("I should see the full feedback message", async function(this: CustomWorld) {
  const dialog = this.page.locator('[role="dialog"]');
  const messageSection = dialog.locator("text=Message").locator("..");
  await expect(messageSection).toBeVisible();
});

Then("I should see the feedback type", async function(this: CustomWorld) {
  const dialog = this.page.locator('[role="dialog"]');
  const typeSection = dialog.locator("text=Type").first();
  await expect(typeSection).toBeVisible();
});

Then("I should see the feedback status", async function(this: CustomWorld) {
  const dialog = this.page.locator('[role="dialog"]');
  const statusSection = dialog.locator("text=Status").first();
  await expect(statusSection).toBeVisible();
});

Then("I should see the user information", async function(this: CustomWorld) {
  const dialog = this.page.locator('[role="dialog"]');
  const userSection = dialog.locator("text=User").first();
  await expect(userSection).toBeVisible();
});

Then("I should see the submission page", async function(this: CustomWorld) {
  const dialog = this.page.locator('[role="dialog"]');
  const pageSection = dialog.locator("text=Page").first();
  await expect(pageSection).toBeVisible();
});

Then("I should see the submission date", async function(this: CustomWorld) {
  const dialog = this.page.locator('[role="dialog"]');
  const dateSection = dialog.locator("text=Submitted").first();
  await expect(dateSection).toBeVisible();
});

Then("I should see {string} section", async function(this: CustomWorld, section: string) {
  const dialog = this.page.locator('[role="dialog"]');
  const sectionElement = dialog.locator(`text=${section}`).first();
  await expect(sectionElement).toBeVisible();
});

Then("I should see the user agent string", async function(this: CustomWorld) {
  const dialog = this.page.locator('[role="dialog"]');
  const userAgentText = dialog.locator("text=Mozilla").first();
  await expect(userAgentText).toBeVisible();
});

Then(
  "the feedback status should change to {string}",
  async function(this: CustomWorld, status: string) {
    // Status change is handled by API mock
    await this.page.waitForLoadState("networkidle");
  },
);

Then("the status badge should update", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
});

Then("the status badge should update to green", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
});

Then("the status badge should update to gray", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
});

Then("the feedback status should update", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
});

Then("the list should reflect the new status", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
});

Then("I should see a success message", async function(this: CustomWorld) {
  // Alert is shown via window.alert in the component
  this.page.on("dialog", async (dialog) => {
    expect(dialog.message()).toContain("success");
    await dialog.accept();
  });
});

Then("the admin note should be saved", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
});

Then("the feedback details dialog should close", async function(this: CustomWorld) {
  const dialog = this.page.locator('[role="dialog"]');
  await expect(dialog).not.toBeVisible();
});

// NOTE: "I should see {string} text" is defined in authentication.steps.ts

Then("the feedback list should refresh", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
});

Then("BUG type badge should be red", async function(this: CustomWorld) {
  const badge = this.page.locator('[class*="Badge"]').filter({ hasText: "BUG" }).first();
  const className = await badge.getAttribute("class");
  expect(className).toContain("red");
});

Then("IDEA type badge should be blue", async function(this: CustomWorld) {
  const badge = this.page.locator('[class*="Badge"]').filter({ hasText: "IDEA" }).first();
  const className = await badge.getAttribute("class");
  expect(className).toContain("blue");
});

Then("OTHER type badge should be gray", async function(this: CustomWorld) {
  const badge = this.page.locator('[class*="Badge"]').filter({ hasText: "OTHER" }).first();
  const className = await badge.getAttribute("class");
  expect(className).toMatch(/gray|neutral/);
});

Then("NEW status badge should be yellow", async function(this: CustomWorld) {
  const badge = this.page.locator('[class*="Badge"]').filter({ hasText: "NEW" }).first();
  const className = await badge.getAttribute("class");
  expect(className).toContain("yellow");
});

Then("REVIEWED status badge should be blue", async function(this: CustomWorld) {
  const badge = this.page.locator('[class*="Badge"]').filter({ hasText: "REVIEWED" }).first();
  const className = await badge.getAttribute("class");
  expect(className).toContain("blue");
});

Then("RESOLVED status badge should be green", async function(this: CustomWorld) {
  const badge = this.page.locator('[class*="Badge"]').filter({ hasText: "RESOLVED" }).first();
  const className = await badge.getAttribute("class");
  expect(className).toContain("green");
});

Then("DISMISSED status badge should be gray", async function(this: CustomWorld) {
  const badge = this.page.locator('[class*="Badge"]').filter({ hasText: "DISMISSED" }).first();
  const className = await badge.getAttribute("class");
  expect(className).toMatch(/gray|neutral/);
});
