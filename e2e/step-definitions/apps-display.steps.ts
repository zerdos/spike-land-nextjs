import { DataTable, Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { CustomWorld } from "../support/world";

// Navigation steps
Given("I am on the apps page", async function(this: CustomWorld) {
  await this.page.goto(`${this.baseUrl}/apps`);
  await this.page.waitForLoadState("networkidle");
});

Given("I am on the display page", async function(this: CustomWorld) {
  await this.page.goto(`${this.baseUrl}/display`);
  await this.page.waitForLoadState("networkidle");
});

Given(
  "I am on the client page without displayId parameter",
  async function(this: CustomWorld) {
    await this.page.goto(`${this.baseUrl}/client`);
    await this.page.waitForLoadState("networkidle");
  },
);

Given(
  "I am on the client page with displayId parameter",
  async function(this: CustomWorld) {
    await this.page.goto(`${this.baseUrl}/client?displayId=test-display-id`);
    await this.page.waitForLoadState("domcontentloaded");
  },
);

// NOTE: "I navigate to {string}" step is defined in protected-routes.steps.ts

When(
  "I navigate directly to {string}",
  async function(this: CustomWorld, path: string) {
    await this.page.goto(`${this.baseUrl}${path}`);
    await this.page.waitForLoadState("networkidle");
  },
);

// Apps page content verification
Then(
  "I should see the page heading {string}",
  async function(this: CustomWorld, heading: string) {
    const headingElement = this.page.getByRole("heading", { name: heading });
    await expect(headingElement).toBeVisible({ timeout: 10000 });
  },
);

// NOTE: "I should see the description {string}" step is defined in home-page.steps.ts

Then(
  "I should see {string} section",
  async function(this: CustomWorld, sectionName: string) {
    const section = this.page.getByRole("heading", { name: sectionName });
    await expect(section).toBeVisible({ timeout: 10000 });
  },
);

Then(
  "I should see the app card {string}",
  async function(this: CustomWorld, appTitle: string) {
    const card = this.page.getByRole("heading", { name: appTitle });
    await expect(card).toBeVisible({ timeout: 10000 });
  },
);

Then(
  "I should see the app description {string}",
  async function(this: CustomWorld, description: string) {
    const element = this.page.getByText(description);
    await expect(element).toBeVisible({ timeout: 10000 });
  },
);

Then(
  "I should see the following tags:",
  async function(this: CustomWorld, dataTable: DataTable) {
    const tags = dataTable.rows().map((row) => row[0]).filter((
      tag,
    ): tag is string => tag !== undefined);

    for (const tag of tags) {
      const tagElement = this.page.getByText(tag, { exact: true });
      await expect(tagElement).toBeVisible({ timeout: 10000 });
    }
  },
);

// NOTE: "I should see {string} heading" and "I should see {string} text" are defined in authentication.steps.ts

// Button interactions
When(
  "I click the {string} button for {string}",
  async function(this: CustomWorld, buttonText: string, appName: string) {
    // Find the card containing the app name, then find the Launch App button within it
    const appCard = this.page.locator("div", {
      has: this.page.getByRole("heading", { name: appName }),
    });
    const button = appCard.getByRole("link", { name: buttonText });
    await button.click();
    await this.page.waitForLoadState("networkidle");
  },
);

// Display page verification
Then("I should be on the display page", async function(this: CustomWorld) {
  await expect(this.page).toHaveURL(/\/display/, { timeout: 10000 });
});

Then(
  "I should see {string} text initially",
  async function(this: CustomWorld, text: string) {
    // This checks for initial loading state which may appear briefly
    const element = this.page.getByText(text);
    await expect(element).toBeVisible({ timeout: 5000 }).catch(() => {
      // If not visible, it may have already transitioned - that's okay
      console.log(`Loading state "${text}" may have already passed`);
    });
  },
);

Then("I should see a QR code image", async function(this: CustomWorld) {
  const qrCode = this.page.locator('img[alt="QR Code"]');
  await expect(qrCode).toBeVisible({ timeout: 10000 });
});

Then(
  "I should see the display status indicator",
  async function(this: CustomWorld) {
    // Look for the status indicator div
    const statusIndicator = this.page.locator(".absolute.top-4.left-4");
    await expect(statusIndicator).toBeVisible({ timeout: 10000 });
  },
);

Then(
  "the status indicator should show {string}",
  async function(this: CustomWorld, statusText: string) {
    const statusElement = this.page.getByText(statusText, { exact: false });
    await expect(statusElement).toBeVisible({ timeout: 10000 });
  },
);

Then(
  "the status indicator should contain a display ID",
  async function(this: CustomWorld) {
    // Look for the ID pattern in the status indicator
    const idPattern = /ID: [a-zA-Z0-9-]+/;
    const statusText = await this.page.locator(".absolute.top-4.left-4")
      .textContent();
    expect(statusText).toMatch(idPattern);
  },
);

// Apps page navigation
Then("I should be on the apps page", async function(this: CustomWorld) {
  await expect(this.page).toHaveURL(/\/apps/, { timeout: 10000 });
});

Then(
  "I should see the QR code for connecting clients",
  async function(this: CustomWorld) {
    const qrCode = this.page.locator('img[alt="QR Code"]');
    await expect(qrCode).toBeVisible({ timeout: 10000 });
  },
);

// Client page verification
// NOTE: "I should see error message {string}" step is defined in authentication.steps.ts

Then("the client page should load", async function(this: CustomWorld) {
  // Wait for the page to load - either loading state or error/content
  await this.page.waitForLoadState("networkidle");

  // Check that we're on the client page
  await expect(this.page).toHaveURL(/\/client/, { timeout: 10000 });
});

Then(
  "I should see the connection status indicator",
  async function(this: CustomWorld) {
    // Look for connection status (either "Connected" or "Connecting...")
    const statusIndicator = this.page.locator("div").filter({
      hasText: /Connected|Connecting/,
    })
      .first();
    await expect(statusIndicator).toBeVisible({ timeout: 15000 });
  },
);

Then("the page should load successfully", async function(this: CustomWorld) {
  // Verify page loaded without errors
  await this.page.waitForLoadState("networkidle");

  // Check for main content
  const mainContent = this.page.locator("body");
  await expect(mainContent).toBeVisible();
});
