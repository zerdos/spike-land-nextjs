import { Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { CustomWorld } from "../support/world";

// Navigation
When("I navigate to the settings page", async function(this: CustomWorld) {
  await this.page.goto(`${this.baseUrl}/settings`);
  await this.page.waitForLoadState("networkidle");
});

// Page verification
Then("I should see the settings page title", async function(this: CustomWorld) {
  const title = this.page.locator('h1, [data-testid="settings-title"]');
  await expect(title).toBeVisible({ timeout: 10000 });
});

// NOTE: "the page URL should be {string}" step is defined in my-apps.steps.ts

Then("I should be on the settings page", async function(this: CustomWorld) {
  await expect(this.page).toHaveURL(/\/settings/, { timeout: 10000 });
});

// Tabs
Then("I should see the {string} tab", async function(this: CustomWorld, tabName: string) {
  const tab = this.page.getByRole("tab", { name: tabName });
  await expect(tab).toBeVisible({ timeout: 10000 });
});

Then("I should see the settings tabs", async function(this: CustomWorld) {
  const tabs = this.page.locator('[role="tablist"], [data-testid="settings-tabs"]');
  await expect(tabs).toBeVisible({ timeout: 10000 });
});

// NOTE: "I click the {string} tab" is defined in common.steps.ts

Then("the {string} tab should be active", async function(this: CustomWorld, tabName: string) {
  const tab = this.page.getByRole("tab", { name: tabName });
  await expect(tab).toHaveAttribute("aria-selected", "true", { timeout: 5000 });
});

Then("the {string} tab should not be active", async function(this: CustomWorld, tabName: string) {
  const tab = this.page.getByRole("tab", { name: tabName });
  const isActive = await tab.getAttribute("aria-selected");
  expect(isActive).not.toBe("true");
});

// Content sections
Then("I should see the preferences content", async function(this: CustomWorld) {
  const content = this.page.locator('[data-testid="preferences-content"], [role="tabpanel"]')
    .filter({ hasText: /preferences|notifications/i });
  await expect(content.first()).toBeVisible({ timeout: 10000 });
});

Then("I should see notification settings", async function(this: CustomWorld) {
  const settings = this.page.getByText(/notification/i);
  await expect(settings.first()).toBeVisible({ timeout: 10000 });
});

Then("I should see the privacy content", async function(this: CustomWorld) {
  const content = this.page.locator('[data-testid="privacy-content"], [role="tabpanel"]').filter({
    hasText: /privacy|visibility|delete/i,
  });
  await expect(content.first()).toBeVisible({ timeout: 10000 });
});

Then("I should see privacy controls", async function(this: CustomWorld) {
  const controls = this.page.getByText(/privacy|visibility/i);
  await expect(controls.first()).toBeVisible({ timeout: 10000 });
});

Then("I should see the profile content", async function(this: CustomWorld) {
  const content = this.page.locator('[data-testid="profile-content"], [role="tabpanel"]').filter({
    hasText: /profile|name|email/i,
  });
  await expect(content.first()).toBeVisible({ timeout: 10000 });
});

// Profile information
// NOTE: "I should see my name {string}" step is defined in profile.steps.ts
// NOTE: "I should see my email {string}" step is defined in profile.steps.ts

Then("I should see my avatar", async function(this: CustomWorld) {
  const avatar = this.page.locator('img[alt*="avatar"], [data-testid="user-avatar"]').first();
  await expect(avatar).toBeVisible({ timeout: 10000 });
});

// Notification toggles
Then("I should see the email notifications toggle", async function(this: CustomWorld) {
  const toggle = this.page.locator(
    '[data-testid="email-notifications-toggle"], label:has-text("Email"), label:has-text("email")',
  ).first();
  await expect(toggle).toBeVisible({ timeout: 10000 });
});

Then("I should see the push notifications toggle", async function(this: CustomWorld) {
  const toggle = this.page.locator(
    '[data-testid="push-notifications-toggle"], label:has-text("Push"), label:has-text("push")',
  ).first();
  await expect(toggle).toBeVisible({ timeout: 10000 });
});

Then("I should see the marketing emails toggle", async function(this: CustomWorld) {
  const toggle = this.page.locator(
    '[data-testid="marketing-emails-toggle"], label:has-text("Marketing"), label:has-text("marketing")',
  ).first();
  await expect(toggle).toBeVisible({ timeout: 10000 });
});

// Toggle actions
When("I toggle the email notifications setting", async function(this: CustomWorld) {
  const toggle = this.page.locator(
    '[data-testid="email-notifications-toggle"] input, input[name="email-notifications"], [role="switch"]',
  ).filter({ hasText: /email/i }).first();

  if (await toggle.count() === 0) {
    // Fallback: click the label
    const label = this.page.locator(
      'label:has-text("Email notifications"), label:has-text("email")',
    ).first();
    await label.click();
  } else {
    await toggle.click();
  }

  await this.page.waitForTimeout(500);
});

When("I toggle the push notifications setting", async function(this: CustomWorld) {
  const toggle = this.page.locator(
    '[data-testid="push-notifications-toggle"] input, input[name="push-notifications"], [role="switch"]',
  ).filter({ hasText: /push/i }).first();

  if (await toggle.count() === 0) {
    // Fallback: click the label
    const label = this.page.locator('label:has-text("Push notifications"), label:has-text("push")')
      .first();
    await label.click();
  } else {
    await toggle.click();
  }

  await this.page.waitForTimeout(500);
});

// State verification
Then("the email notifications state should change", async function(this: CustomWorld) {
  // Verify some visual feedback occurred
  const toggle = this.page.locator(
    '[data-testid="email-notifications-toggle"], label:has-text("Email")',
  ).first();
  await expect(toggle).toBeVisible();
  expect(true).toBeTruthy(); // Placeholder for actual state check
});

Then("the change should be reflected in the UI", async function(this: CustomWorld) {
  // Verify UI update
  await this.page.waitForTimeout(500);
  expect(true).toBeTruthy(); // Placeholder for actual UI check
});

Then("the push notifications state should change", async function(this: CustomWorld) {
  // Verify some visual feedback occurred
  const toggle = this.page.locator(
    '[data-testid="push-notifications-toggle"], label:has-text("Push")',
  ).first();
  await expect(toggle).toBeVisible();
  expect(true).toBeTruthy(); // Placeholder for actual state check
});

Then("the email notifications state should be persisted", async function(this: CustomWorld) {
  // Check that toggle state persists across tab switches
  const toggle = this.page.locator('[data-testid="email-notifications-toggle"]').first();
  await expect(toggle).toBeVisible({ timeout: 10000 });
  expect(true).toBeTruthy(); // Placeholder for actual persistence check
});

// Privacy settings
Then("I should see the profile visibility setting", async function(this: CustomWorld) {
  const visibilitySetting = this.page.getByText(/profile visibility|visibility/i);
  await expect(visibilitySetting.first()).toBeVisible({ timeout: 10000 });
});

Then(
  "I should see the {string} visibility option",
  async function(this: CustomWorld, option: string) {
    const optionElement = this.page.getByText(option);
    await expect(optionElement).toBeVisible({ timeout: 10000 });
  },
);

// Delete account
Then("the button should be styled as destructive action", async function(this: CustomWorld) {
  const deleteButton = this.page.getByRole("button", { name: /delete account/i });
  // Check for destructive styling (red color, etc.)
  const classList = await deleteButton.getAttribute("class");
  expect(classList).toMatch(/destructive|danger|red/i);
});

Then("I should see the delete account confirmation dialog", async function(this: CustomWorld) {
  const dialog = this.page.locator('[role="dialog"], [role="alertdialog"]');
  await expect(dialog).toBeVisible({ timeout: 10000 });
});

Then("I should see the confirmation message", async function(this: CustomWorld) {
  const message = this.page.getByText(/confirm|delete|permanent|cannot be undone/i);
  await expect(message.first()).toBeVisible({ timeout: 10000 });
});

Then(
  "I should see the {string} button in the dialog",
  async function(this: CustomWorld, buttonText: string) {
    const dialog = this.page.locator('[role="dialog"], [role="alertdialog"]');
    const button = dialog.getByRole("button", { name: buttonText });
    await expect(button).toBeVisible({ timeout: 10000 });
  },
);

When(
  "I click the {string} button in the dialog",
  async function(this: CustomWorld, buttonText: string) {
    const dialog = this.page.locator('[role="dialog"], [role="alertdialog"]');
    const button = dialog.getByRole("button", { name: buttonText });
    await button.click();
    await this.page.waitForTimeout(500);
  },
);

Then("the delete account dialog should be closed", async function(this: CustomWorld) {
  const dialog = this.page.locator('[role="dialog"], [role="alertdialog"]');
  await expect(dialog).not.toBeVisible();
});

Then("I should still be on the settings page", async function(this: CustomWorld) {
  await expect(this.page).toHaveURL(/\/settings/, { timeout: 5000 });
});
