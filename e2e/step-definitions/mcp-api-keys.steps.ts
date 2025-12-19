import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { CustomWorld } from "../support/world";

// API Keys tab content
Then(
  "I should see the API Keys section title",
  async function(this: CustomWorld) {
    const title = this.page.getByText(/API Keys/i).first();
    await expect(title).toBeVisible({ timeout: 10000 });
  },
);

Then(
  "I should see REST API usage instructions",
  async function(this: CustomWorld) {
    const restApi = this.page.getByText(/REST API/i);
    await expect(restApi.first()).toBeVisible({ timeout: 10000 });
  },
);

Then(
  "I should see MCP Server usage instructions",
  async function(this: CustomWorld) {
    const mcpServer = this.page.getByText(/MCP Server/i);
    await expect(mcpServer.first()).toBeVisible({ timeout: 10000 });
  },
);

Then(
  "I should see a link to test API keys",
  async function(this: CustomWorld) {
    const testLink = this.page.getByRole("link", {
      name: /test your api keys/i,
    });
    await expect(testLink).toBeVisible({ timeout: 10000 });
  },
);

// Create API Key button and dialog
// Note: Generic button steps are defined in authentication.steps.ts

Then(
  "I should see the create API key dialog",
  async function(this: CustomWorld) {
    const dialog = this.page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByText(/Create.*API Key/i)).toBeVisible();
  },
);

Then(
  "I should see the {string} input field",
  async function(this: CustomWorld, fieldName: string) {
    const input = this.page.getByRole("textbox", {
      name: new RegExp(fieldName, "i"),
    });
    await expect(input).toBeVisible({ timeout: 10000 });
  },
);

Then(
  "I should see the {string} button in the dialog",
  async function(this: CustomWorld, buttonName: string) {
    const dialog = this.page.getByRole("dialog");
    const button = dialog.getByRole("button", {
      name: new RegExp(buttonName, "i"),
    });
    await expect(button).toBeVisible({ timeout: 10000 });
  },
);

// NOTE: "the {string} button should be disabled" is defined in common.steps.ts
// NOTE: "the {string} button should be enabled" is defined in common.steps.ts

When(
  "I enter {string} in the key name field",
  async function(this: CustomWorld, keyName: string) {
    const input = this.page.getByRole("textbox", { name: /key name/i });
    await input.fill(keyName);
    await this.page.waitForTimeout(300);
  },
);

// API Key creation success
Then(
  "I should see the API key created dialog",
  async function(this: CustomWorld) {
    const dialog = this.page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByText(/API Key Created/i)).toBeVisible();
  },
);

Then(
  "I should see the new API key starting with {string}",
  async function(this: CustomWorld, prefix: string) {
    const keyCode = this.page.locator("code").filter({
      hasText: new RegExp(`^${prefix}`),
    });
    await expect(keyCode).toBeVisible({ timeout: 10000 });
  },
);

Then(
  "I should see a warning to copy the key now",
  async function(this: CustomWorld) {
    const warning = this.page.getByText(
      /copy.*key.*now|will not be.*shown again/i,
    );
    await expect(warning.first()).toBeVisible({ timeout: 10000 });
  },
);

// API Keys list
Given(
  "I have created an API key named {string}",
  async function(this: CustomWorld, keyName: string) {
    await this.page.goto(`${this.baseUrl}/settings`);
    await this.page.waitForLoadState("networkidle");

    const apiKeysTab = this.page.getByRole("tab", { name: /API Keys/i });
    await apiKeysTab.click();
    await this.page.waitForTimeout(500);

    const createButton = this.page.getByRole("button", {
      name: /Create API Key/i,
    });
    await createButton.click();

    const input = this.page.getByRole("textbox", { name: /key name/i });
    await input.fill(keyName);

    const createKeyButton = this.page.getByRole("button", {
      name: /^Create Key$/i,
    });
    await createKeyButton.click();

    // Wait for the key to be created and close the dialog
    await this.page.waitForTimeout(1000);
    const doneButton = this.page.getByRole("button", { name: /Done/i });
    if (await doneButton.isVisible()) {
      await doneButton.click();
    }
  },
);

Given("I have no API keys", async function(this: CustomWorld) {
  // This is typically the default state for a new user
  // In E2E tests with test database, we assume clean state
});

Then(
  "I should see {string} in the API keys list",
  async function(this: CustomWorld, keyName: string) {
    const keyItem = this.page.getByText(keyName);
    await expect(keyItem).toBeVisible({ timeout: 10000 });
  },
);

Then(
  "I should see the masked API key format",
  async function(this: CustomWorld) {
    const maskedKey = this.page.locator("code").filter({
      hasText: /sk_live.*\*\*\*\*/,
    });
    await expect(maskedKey).toBeVisible({ timeout: 10000 });
  },
);

When(
  "I click the delete button for {string} key",
  async function(this: CustomWorld, keyName: string) {
    const keyRow = this.page.locator("div, tr").filter({ hasText: keyName })
      .first();
    const deleteButton = keyRow.getByRole("button");
    await deleteButton.click();
    await this.page.waitForTimeout(500);
  },
);

// NOTE: "I should see a confirmation dialog" step moved to common.steps.ts

Then(
  "I should be able to cancel the deletion",
  async function(this: CustomWorld) {
    const cancelButton = this.page.getByRole("button", { name: /cancel/i });
    await expect(cancelButton).toBeVisible({ timeout: 5000 });
  },
);

// NOTE: "I confirm the deletion" is defined in common.steps.ts

Then(
  "the {string} key should be removed from the list",
  async function(this: CustomWorld, keyName: string) {
    const keyItem = this.page.getByText(keyName);
    await expect(keyItem).not.toBeVisible({ timeout: 10000 });
  },
);

// NOTE: "I should see {string} message" step moved to common.steps.ts

Then(
  "I should see instructions to create an API key",
  async function(this: CustomWorld) {
    const instructions = this.page.getByText(/create an api key/i);
    await expect(instructions.first()).toBeVisible({ timeout: 10000 });
  },
);
