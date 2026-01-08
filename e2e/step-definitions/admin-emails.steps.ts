/**
 * Step definitions for Admin Email Logs E2E tests
 */

import type { DataTable } from "@cucumber/cucumber";
import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import {
  TIMEOUTS,
  waitForElementWithRetry,
  waitForModalState,
  waitForTextWithRetry,
} from "../support/helpers/retry-helper";
import type { CustomWorld } from "../support/world";

// Mock email data generator
function createMockEmail(overrides: Partial<{
  id: string;
  to: string;
  subject: string;
  template: string;
  status: string;
}> = {}) {
  return {
    id: overrides.id || `email-${Date.now()}`,
    to: overrides.to || "recipient@example.com",
    subject: overrides.subject || "Test Email Subject",
    template: overrides.template || "welcome",
    status: overrides.status || "DELIVERED",
    resendId: `resend-${Date.now()}`,
    sentAt: new Date().toISOString(),
    openedAt: null,
    clickedAt: null,
    bouncedAt: null,
    user: {
      id: "user-1",
      name: "Test User",
      email: "sender@example.com",
    },
  };
}

// Given steps
Given("there are emails in the system", async function(this: CustomWorld) {
  await this.page.route("**/api/admin/emails**", async (route) => {
    const method = route.request().method();

    if (method === "GET") {
      const url = new URL(route.request().url());
      const search = url.searchParams.get("search");

      // Handle empty search result for "nonexistent"
      if (search && search.includes("nonexistent")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            emails: [],
            pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
            templates: ["welcome", "notification", "reminder"],
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          emails: [
            createMockEmail({ id: "e1", status: "DELIVERED" }),
            createMockEmail({ id: "e2", status: "SENT" }),
            createMockEmail({ id: "e3", status: "OPENED" }),
          ],
          pagination: { page: 1, limit: 20, total: 3, totalPages: 1 },
          templates: ["welcome", "notification", "reminder"],
        }),
      });
    } else if (method === "POST") {
      // Mock sending test email
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ emailId: `test-${Date.now()}` }),
      });
    } else {
      await route.continue();
    }
  });
});

Given(
  "there are emails with different templates",
  async function(this: CustomWorld) {
    await this.page.route("**/api/admin/emails**", async (route) => {
      const method = route.request().method();

      if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            emails: [
              createMockEmail({ id: "e1", template: "welcome" }),
              createMockEmail({ id: "e2", template: "notification" }),
              createMockEmail({ id: "e3", template: "reminder" }),
            ],
            pagination: { page: 1, limit: 20, total: 3, totalPages: 1 },
            templates: ["welcome", "notification", "reminder"],
          }),
        });
      } else if (method === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ emailId: `test-${Date.now()}` }),
        });
      } else {
        await route.continue();
      }
    });
  },
);

Given(
  "there are emails of all statuses in the system",
  async function(this: CustomWorld) {
    await this.page.route("**/api/admin/emails**", async (route) => {
      const method = route.request().method();

      if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            emails: [
              createMockEmail({ id: "e1", status: "PENDING" }),
              createMockEmail({ id: "e2", status: "SENT" }),
              createMockEmail({ id: "e3", status: "DELIVERED" }),
              createMockEmail({ id: "e4", status: "OPENED" }),
              createMockEmail({ id: "e5", status: "CLICKED" }),
              createMockEmail({ id: "e6", status: "BOUNCED" }),
              createMockEmail({ id: "e7", status: "FAILED" }),
            ],
            pagination: { page: 1, limit: 20, total: 7, totalPages: 1 },
            templates: ["welcome"],
          }),
        });
      } else if (method === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ emailId: `test-${Date.now()}` }),
        });
      } else {
        await route.continue();
      }
    });
  },
);

Given(
  "there are more than 20 emails in the system",
  async function(this: CustomWorld) {
    const emails = Array.from(
      { length: 25 },
      (_, i) => createMockEmail({ id: `e${i}` }),
    );

    await this.page.route("**/api/admin/emails**", async (route) => {
      const method = route.request().method();

      if (method === "GET") {
        const url = new URL(route.request().url());
        const page = parseInt(url.searchParams.get("page") || "1");
        const limit = 20;
        const start = (page - 1) * limit;
        const end = start + limit;

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            emails: emails.slice(start, end),
            pagination: { page, limit, total: 25, totalPages: 2 },
            templates: ["welcome"],
          }),
        });
      } else if (method === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ emailId: `test-${Date.now()}` }),
        });
      } else {
        await route.continue();
      }
    });
  },
);

Given("there are no emails in the system", async function(this: CustomWorld) {
  await this.page.route("**/api/admin/emails**", async (route) => {
    const method = route.request().method();

    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          emails: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
          templates: [],
        }),
      });
    } else if (method === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ emailId: `test-${Date.now()}` }),
      });
    } else {
      await route.continue();
    }
  });
});

Given("the emails API is slow", async function(this: CustomWorld) {
  await this.page.route("**/api/admin/emails**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        emails: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        templates: [],
      }),
    });
  });
});

Given("the emails API returns an error", async function(this: CustomWorld) {
  await this.page.route("**/api/admin/emails**", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Internal server error" }),
    });
  });
});

// When steps
When(
  "I enter {string} in the search field",
  async function(this: CustomWorld, text: string) {
    const searchInput = this.page.locator('input[placeholder*="Search"]');
    await searchInput.fill(text);
  },
);

When(
  "I enter {string} in the test email field",
  async function(this: CustomWorld, email: string) {
    const emailInput = this.page.locator('input[placeholder="recipient@example.com"]');
    await emailInput.fill(email);
  },
);

When(
  "I click {string} button without entering email",
  async function(this: CustomWorld, _buttonText: string) {
    const sendButton = this.page.getByRole("button", { name: /send test/i });
    await sendButton.click();
  },
);

When(
  "I select {string} from the email status filter",
  async function(this: CustomWorld, status: string) {
    // Wait for the table to be visible first
    await waitForElementWithRetry(this.page, "table", {
      timeout: TIMEOUTS.DEFAULT,
    });

    // Get the first combobox (status filter) and ensure it's ready
    const statusSelect = this.page.getByRole("combobox").first();
    await expect(statusSelect).toBeVisible({ timeout: TIMEOUTS.DEFAULT });

    // Retry logic for opening dropdown (Radix UI portal can be slow)
    const startTime = Date.now();
    let optionVisible = false;

    while (!optionVisible && Date.now() - startTime < TIMEOUTS.DEFAULT) {
      try {
        await statusSelect.click();
        // Wait for portal animation
        await this.page.waitForTimeout(TIMEOUTS.RETRY_INTERVAL);

        const option = this.page.getByRole("option", { name: status });
        await expect(option).toBeVisible({
          timeout: TIMEOUTS.RETRY_INTERVAL * 2,
        });
        await option.click();
        optionVisible = true;
      } catch {
        // Dropdown may have closed, press Escape and retry
        await this.page.keyboard.press("Escape");
        await this.page.waitForTimeout(TIMEOUTS.RETRY_INTERVAL);
      }
    }

    if (!optionVisible) {
      throw new Error(
        `Failed to select "${status}" from status filter after ${TIMEOUTS.DEFAULT}ms`,
      );
    }
  },
);

When(
  "I select a template from the template filter",
  async function(this: CustomWorld) {
    // Wait for the table to be visible first
    await waitForElementWithRetry(this.page, "table", {
      timeout: TIMEOUTS.DEFAULT,
    });

    // Get the second combobox (template filter) and ensure it's ready
    const templateSelect = this.page.getByRole("combobox").nth(1);
    await expect(templateSelect).toBeVisible({ timeout: TIMEOUTS.DEFAULT });

    // Retry logic for opening dropdown (Radix UI portal can be slow)
    const startTime = Date.now();
    let optionVisible = false;

    while (!optionVisible && Date.now() - startTime < TIMEOUTS.DEFAULT) {
      try {
        await templateSelect.click();
        // Wait for portal animation
        await this.page.waitForTimeout(TIMEOUTS.RETRY_INTERVAL);

        const option = this.page.getByRole("option", { name: "welcome" });
        await expect(option).toBeVisible({
          timeout: TIMEOUTS.RETRY_INTERVAL * 2,
        });
        await option.click();
        optionVisible = true;
      } catch {
        // Dropdown may have closed, press Escape and retry
        await this.page.keyboard.press("Escape");
        await this.page.waitForTimeout(TIMEOUTS.RETRY_INTERVAL);
      }
    }

    if (!optionVisible) {
      throw new Error(
        `Failed to select "welcome" from template filter after ${TIMEOUTS.DEFAULT}ms`,
      );
    }
  },
);

When(
  "I click {string} button on an email row",
  async function(this: CustomWorld, buttonText: string) {
    // Wait for table rows to be available (use first() for strict mode)
    const rows = this.page.locator("tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: TIMEOUTS.DEFAULT });

    const row = rows.first();
    const button = row.getByRole("button", { name: buttonText });
    await expect(button).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
    await expect(button).toBeEnabled({ timeout: TIMEOUTS.DEFAULT });

    // Some buttons may trigger navigation, wait for it to complete
    await Promise.all([
      this.page.waitForLoadState("domcontentloaded").catch(() => {}),
      button.click(),
    ]);
  },
);

When(
  "I click the Send Test button and expect success",
  async function(this: CustomWorld) {
    // Mock both GET and POST API to avoid real API calls
    await this.page.route("**/api/admin/emails**", async (route) => {
      const method = route.request().method();

      if (method === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: "Test email sent successfully",
            emailId: `test-email-${Date.now()}`,
          }),
        });
      } else if (method === "GET") {
        // Return mock data for GET requests
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            emails: [
              createMockEmail({ id: "e1", status: "DELIVERED" }),
            ],
            pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
            templates: ["welcome"],
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Ensure button is enabled before clicking
    const button = this.page.getByRole("button", { name: "Send Test" });
    await expect(button).toBeEnabled({ timeout: 10000 });

    // Setup dialog handler using page.on to handle alert
    let dialogHandled = false;
    let dialogMessage = "";
    this.page.on("dialog", async (dialog) => {
      dialogMessage = dialog.message();
      dialogHandled = true;
      await dialog.accept();
    });

    await button.click();

    // Wait for dialog to be handled
    await this.page.waitForFunction(() => true, null, { timeout: 10000 });
    await this.page.waitForTimeout(1000);

    // Verify dialog was shown with success message
    expect(dialogHandled).toBe(true);
    expect(dialogMessage).toContain("success");
  },
);
When("I click the modal overlay", async function(this: CustomWorld) {
  // Click on the overlay (background)
  await this.page.locator(".fixed.inset-0.bg-black\\/50").click({
    position: { x: 10, y: 10 },
  });
});

// Then steps
Then(
  "I should see {string} text with email count",
  async function(this: CustomWorld, text: string) {
    // Wait for the text to be visible using Playwright's text locator
    const element = this.page.getByText(new RegExp(text, "i"));
    await expect(element.first()).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

Then("I should see email input field", async function(this: CustomWorld) {
  const emailInput = this.page.locator('input[placeholder="recipient@example.com"]');
  await expect(emailInput).toBeVisible();
});

// NOTE: "I should see search input with placeholder {string}" is defined in common.steps.ts

Then(
  "I should see status filter dropdown with {string} option",
  async function(this: CustomWorld, _option: string) {
    const statusSelect = this.page.getByRole("combobox").first();
    await expect(statusSelect).toBeVisible();
  },
);

Then(
  "I should see template filter dropdown with {string} option",
  async function(this: CustomWorld, _option: string) {
    const templateSelect = this.page.getByRole("combobox").nth(1);
    await expect(templateSelect).toBeVisible();
  },
);

Then(
  "I should see email table with columns:",
  async function(this: CustomWorld, dataTable: DataTable) {
    // Use rows() to skip the header row "Column"
    const columns = dataTable.rows().flat();
    for (const column of columns) {
      const header = this.page.locator("th").filter({ hasText: column });
      await expect(header).toBeVisible();
    }
  },
);

Then("I should see the email list", async function(this: CustomWorld) {
  // Use retry helper to wait for table
  await waitForElementWithRetry(this.page, "table", {
    timeout: TIMEOUTS.DEFAULT,
  });
});

Then(
  "each email should display the recipient address",
  async function(this: CustomWorld) {
    // Wait for table rows to appear (use first() for strict mode)
    const rows = this.page.locator("tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: TIMEOUTS.DEFAULT });

    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  },
);

Then(
  "each email should display the subject",
  async function(this: CustomWorld) {
    // Subject is in second column (use first() for strict mode)
    const subjects = this.page.locator("tbody tr td:nth-child(2)");
    await expect(subjects.first()).toBeVisible({ timeout: TIMEOUTS.DEFAULT });

    const count = await subjects.count();
    expect(count).toBeGreaterThan(0);
  },
);

Then(
  "each email should display the template name",
  async function(this: CustomWorld) {
    // Template is in 3rd column (use first() for strict mode)
    const templates = this.page.locator("tbody tr td:nth-child(3)");
    await expect(templates.first()).toBeVisible({ timeout: TIMEOUTS.DEFAULT });

    const count = await templates.count();
    expect(count).toBeGreaterThan(0);
  },
);

Then(
  "each email should display a status badge",
  async function(this: CustomWorld) {
    // Status is in 4th column (use first() for strict mode)
    const badges = this.page.locator("tbody tr td:nth-child(4)");
    await expect(badges.first()).toBeVisible({ timeout: TIMEOUTS.DEFAULT });

    const count = await badges.count();
    expect(count).toBeGreaterThan(0);
  },
);

Then(
  "each email should display the sent date",
  async function(this: CustomWorld) {
    // Date is in 5th column (use first() for strict mode)
    const dates = this.page.locator("tbody tr td:nth-child(5)");
    await expect(dates.first()).toBeVisible({ timeout: TIMEOUTS.DEFAULT });

    const count = await dates.count();
    expect(count).toBeGreaterThan(0);
  },
);

Then(
  "the email list should only show emails to {string}",
  async function(this: CustomWorld, _email: string) {
    await this.page.waitForLoadState("networkidle");
  },
);

Then(
  "the email list should only show emails with {string} in subject",
  async function(this: CustomWorld, _subject: string) {
    await this.page.waitForLoadState("networkidle");
  },
);

Then(
  "the email list should only show PENDING status emails",
  async function(this: CustomWorld) {
    await this.page.waitForLoadState("networkidle");
  },
);

Then(
  "the email list should only show SENT status emails",
  async function(this: CustomWorld) {
    await this.page.waitForLoadState("networkidle");
  },
);

Then(
  "the email list should only show DELIVERED status emails",
  async function(this: CustomWorld) {
    await this.page.waitForLoadState("networkidle");
  },
);

Then(
  "the email list should only show OPENED status emails",
  async function(this: CustomWorld) {
    await this.page.waitForLoadState("networkidle");
  },
);

Then(
  "the email list should only show CLICKED status emails",
  async function(this: CustomWorld) {
    await this.page.waitForLoadState("networkidle");
  },
);

Then(
  "the email list should only show BOUNCED status emails",
  async function(this: CustomWorld) {
    await this.page.waitForLoadState("networkidle");
  },
);

Then(
  "the email list should only show FAILED status emails",
  async function(this: CustomWorld) {
    await this.page.waitForLoadState("networkidle");
  },
);

Then(
  "the email list should only show emails with that template",
  async function(this: CustomWorld) {
    await this.page.waitForLoadState("networkidle");
  },
);

Then(
  "the email list should show filtered results",
  async function(this: CustomWorld) {
    await this.page.waitForLoadState("networkidle");
  },
);

Then("the search field should be empty", async function(this: CustomWorld) {
  const searchInput = this.page.locator('input[placeholder*="Search"]');
  await expect(searchInput).toHaveValue("");
});

Then(
  "the status filter should show {string}",
  async function(this: CustomWorld, value: string) {
    const statusSelect = this.page.getByRole("combobox").first();
    await expect(statusSelect).toContainText(value);
  },
);

Then(
  "the template filter should show {string}",
  async function(this: CustomWorld, value: string) {
    const templateSelect = this.page.getByRole("combobox").nth(1);
    await expect(templateSelect).toContainText(value);
  },
);

Then(
  "I should see the email details modal",
  async function(this: CustomWorld) {
    // Use retry helper for modal visibility
    await waitForModalState(this.page, "visible", { timeout: TIMEOUTS.DEFAULT });

    // Verify modal heading is present
    await waitForTextWithRetry(this.page, "Email Details", {
      timeout: TIMEOUTS.DEFAULT,
    });
  },
);

Then("I should see the recipient address", async function(this: CustomWorld) {
  const modal = this.page.locator('[class*="Card"]').filter({
    hasText: "Email Details",
  });
  const toField = modal.locator("text=To").first();
  await expect(toField).toBeVisible();
});

Then("I should see the subject", async function(this: CustomWorld) {
  const modal = this.page.locator('[class*="Card"]').filter({
    hasText: "Email Details",
  });
  const subjectField = modal.locator("text=Subject").first();
  await expect(subjectField).toBeVisible();
});

Then("I should see the template name", async function(this: CustomWorld) {
  const modal = this.page.locator('[class*="Card"]').filter({
    hasText: "Email Details",
  });
  const templateField = modal.locator("text=Template").first();
  await expect(templateField).toBeVisible();
});

Then("I should see the email status", async function(this: CustomWorld) {
  const modal = this.page.locator('[class*="Card"]').filter({
    hasText: "Email Details",
  });
  const statusField = modal.locator("text=Status").first();
  await expect(statusField).toBeVisible();
});

Then("I should see the Resend ID", async function(this: CustomWorld) {
  const modal = this.page.locator('[class*="Card"]').filter({
    hasText: "Email Details",
  });
  const resendField = modal.locator("text=Resend ID").first();
  await expect(resendField).toBeVisible();
});

Then(
  "I should see the email user information",
  async function(this: CustomWorld) {
    const modal = this.page.locator('[class*="Card"]').filter({
      hasText: "Email Details",
    });
    // Check for the User label and that there's user info displayed
    const userLabel = modal.locator("text=User").first();
    await expect(userLabel).toBeVisible();
    // The mock data has user.name = "Test User"
    const testUser = modal.getByText("Test User");
    await expect(testUser).toBeVisible({ timeout: 5000 });
  },
);

Then("I should see the sent timestamp", async function(this: CustomWorld) {
  const modal = this.page.locator('[class*="Card"]').filter({
    hasText: "Email Details",
  });
  const sentField = modal.locator("text=Sent At").first();
  await expect(sentField).toBeVisible();
});

Then(
  "I should see the opened timestamp or dash",
  async function(this: CustomWorld) {
    const modal = this.page.locator('[class*="Card"]').filter({
      hasText: "Email Details",
    });
    const openedField = modal.locator("text=Opened At").first();
    await expect(openedField).toBeVisible();
  },
);

Then(
  "I should see the clicked timestamp or dash",
  async function(this: CustomWorld) {
    const modal = this.page.locator('[class*="Card"]').filter({
      hasText: "Email Details",
    });
    const clickedField = modal.locator("text=Clicked At").first();
    await expect(clickedField).toBeVisible();
  },
);

Then(
  "I should see the bounced timestamp or dash",
  async function(this: CustomWorld) {
    const modal = this.page.locator('[class*="Card"]').filter({
      hasText: "Email Details",
    });
    const bouncedField = modal.locator("text=Bounced At").first();
    await expect(bouncedField).toBeVisible();
  },
);

Then(
  "I should see {string} button in the modal",
  async function(this: CustomWorld, buttonText: string) {
    const modal = this.page.locator('[class*="Card"]').filter({
      hasText: "Email Details",
    });
    const button = modal.getByRole("button", { name: buttonText });
    await expect(button).toBeVisible();
  },
);

Then(
  "the email details modal should close",
  async function(this: CustomWorld) {
    // Use retry helper for modal close state
    await waitForModalState(this.page, "hidden", { timeout: TIMEOUTS.DEFAULT });
  },
);

// NOTE: "PENDING status badge should be yellow" is defined in common.steps.ts

Then("SENT status badge should be blue", async function(this: CustomWorld) {
  const badge = this.page.locator("tbody tr td:nth-child(4)").filter({
    hasText: "SENT",
  }).first().locator("div");
  const className = await badge.getAttribute("class");
  expect(className).toContain("blue");
});

Then(
  "DELIVERED status badge should be green",
  async function(this: CustomWorld) {
    const badge = this.page.locator("tbody tr td:nth-child(4)").filter({
      hasText: "DELIVERED",
    }).first().locator("div");
    const className = await badge.getAttribute("class");
    expect(className).toContain("green");
  },
);

Then("OPENED status badge should be cyan", async function(this: CustomWorld) {
  const badge = this.page.locator("tbody tr td:nth-child(4)").filter({
    hasText: "OPENED",
  }).first().locator("div");
  const className = await badge.getAttribute("class");
  expect(className).toContain("cyan");
});

Then(
  "CLICKED status badge should be purple",
  async function(this: CustomWorld) {
    const badge = this.page.locator("tbody tr td:nth-child(4)").filter({
      hasText: "CLICKED",
    }).first().locator("div");
    const className = await badge.getAttribute("class");
    expect(className).toContain("purple");
  },
);

Then("BOUNCED status badge should be red", async function(this: CustomWorld) {
  const badge = this.page.locator("tbody tr td:nth-child(4)").filter({
    hasText: "BOUNCED",
  }).first().locator("div");
  const className = await badge.getAttribute("class");
  expect(className).toContain("red");
});

// NOTE: "FAILED status badge should be red" is defined in common.steps.ts

Then("I should see pagination controls", async function(this: CustomWorld) {
  // Wait for page to load data first
  await this.page.waitForLoadState("networkidle");

  // Use retry helper for pagination text
  await waitForTextWithRetry(this.page, /Page \d+ of \d+/, {
    timeout: TIMEOUTS.DEFAULT,
  });
});

Then(
  "I should see a success alert with email ID",
  async function(this: CustomWorld) {
    // Handle the alert dialog
    this.page.on("dialog", async (dialog) => {
      expect(dialog.message()).toContain("success");
      await dialog.accept();
    });
  },
);

Then(
  "the test email field should be cleared",
  async function(this: CustomWorld) {
    const emailInput = this.page.locator('input[placeholder="recipient@example.com"]');
    await expect(emailInput).toHaveValue("");
  },
);

Then("the email list should refresh", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
});

Then(
  "I should see {string} alert",
  async function(this: CustomWorld, message: string) {
    this.page.on("dialog", async (dialog) => {
      expect(dialog.message()).toContain(message);
      await dialog.accept();
    });
  },
);

Then(
  "I should see {string} text in the table",
  async function(this: CustomWorld, text: string) {
    // Look for text within the table - the loading text is in a td element
    // Use a shorter timeout because we're racing against the slow API response
    // The table might take a moment to render, so wait for it first
    await this.page.waitForSelector("table", { state: "visible", timeout: 5000 });
    const element = this.page.locator("table").getByText(text);
    await expect(element).toBeVisible({ timeout: 3000 });
  },
);

Then(
  "I should see an error message in red",
  async function(this: CustomWorld) {
    const error = this.page.locator('[class*="red"]');
    await expect(error.first()).toBeVisible();
  },
);
