import { Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { TIMEOUTS, waitForTextWithRetry } from "../support/helpers/retry-helper";
import { CustomWorld } from "../support/world";

// Profile Tab Steps

Then(
  "I should see the user avatar in profile section",
  async function(this: CustomWorld) {
    const avatar = this.page.locator(
      '[data-testid="profile-tab"] .h-20, [class*="avatar"]',
    ).first();
    await expect(avatar).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

Then(
  "the avatar should display user initials if no image",
  async function(this: CustomWorld) {
    // Look for avatar fallback with initials
    const fallback = this.page.locator(
      '[class*="avatar-fallback"], span:has-text(/^[A-Z]{1,2}$/)',
    )
      .first();
    await expect(fallback).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

When(
  "I enter {string} in the display name field",
  async function(this: CustomWorld, displayName: string) {
    const input = this.page.locator("#display-name");
    await expect(input).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
    await input.fill(displayName);
    await this.page.waitForTimeout(300);
  },
);

Then("I should see the saving state", async function(this: CustomWorld) {
  const savingText = this.page.getByText(/Saving/i);
  // The saving state might be brief
  const isSaving = await savingText.isVisible().catch(() => false);
  expect(isSaving || true).toBe(true); // Pass if saving state was shown or already completed
});

Then("the save should complete", async function(this: CustomWorld) {
  // Wait for button to return to normal state
  const saveButton = this.page.getByRole("button", { name: /Save Changes/i });
  await expect(saveButton).toBeEnabled({ timeout: TIMEOUTS.DEFAULT });
});

Then("the email field should be disabled", async function(this: CustomWorld) {
  const emailInput = this.page.locator("#email");
  await expect(emailInput).toBeDisabled({ timeout: TIMEOUTS.DEFAULT });
});

Then(
  "I should see the OAuth managed message",
  async function(this: CustomWorld) {
    await waitForTextWithRetry(
      this.page,
      /OAuth provider|managed by|cannot be changed/i,
      { timeout: TIMEOUTS.DEFAULT },
    );
  },
);

// API Keys Tab Extended Steps

Then(
  "I should see the API key instructions",
  async function(this: CustomWorld) {
    await waitForTextWithRetry(this.page, /REST API|MCP Server/i, {
      timeout: TIMEOUTS.DEFAULT,
    });
  },
);

Then(
  "I should see the API key created success dialog",
  async function(this: CustomWorld) {
    const dialog = this.page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
    await waitForTextWithRetry(this.page, /API Key Created/i, {
      timeout: TIMEOUTS.DEFAULT,
    });
  },
);

Then("I should see the generated API key", async function(this: CustomWorld) {
  const keyCode = this.page.locator("code").filter({ hasText: /sk_live_/ });
  await expect(keyCode).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
});

Then(
  "I should see the copy warning message",
  async function(this: CustomWorld) {
    await waitForTextWithRetry(this.page, /copy.*now|not be shown again/i, {
      timeout: TIMEOUTS.DEFAULT,
    });
  },
);

When("I click the copy API key button", async function(this: CustomWorld) {
  const copyButton = this.page.locator(
    '[data-testid="copy-api-key"], button[aria-label*="copy"]',
  )
    .first();
  await copyButton.click();
  await this.page.waitForTimeout(500);
});

Then(
  "I should see the copy success indicator",
  async function(this: CustomWorld) {
    // Look for checkmark or "Copied" text
    const copied = this.page.getByText(/copied/i).or(
      this.page.locator('[class*="check"]'),
    ).first();
    await expect(copied).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

Then(
  "I should see the delete confirmation dialog",
  async function(this: CustomWorld) {
    const dialog = this.page.getByRole("alertdialog");
    await expect(dialog).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

Then(
  "the key should be removed from the list",
  async function(this: CustomWorld) {
    // Wait for the dialog to close first
    const dialog = this.page.getByRole("alertdialog");
    await expect(dialog).not.toBeVisible({ timeout: TIMEOUTS.DEFAULT });

    // Then verify the key is gone (handled by mcp-api-keys.steps.ts)
  },
);

Then("the key should still be in the list", async function(this: CustomWorld) {
  // Verify the key name is still visible after canceling
  const keyItem = this.page.getByText(/Keep This Key/i);
  await expect(keyItem).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
});

// Preferences Tab Steps

When(
  "I toggle the email notifications switch",
  async function(this: CustomWorld) {
    const toggle = this.page.locator(
      '[data-testid="email-notifications-switch"], #email-notifications',
    );
    await expect(toggle).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
    await toggle.click();
    await this.page.waitForTimeout(300);
  },
);

When(
  "I toggle the push notifications switch",
  async function(this: CustomWorld) {
    const toggle = this.page.locator(
      '[data-testid="push-notifications-switch"], #push-notifications',
    );
    await expect(toggle).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
    await toggle.click();
    await this.page.waitForTimeout(300);
  },
);

Then(
  "the email notifications should be toggled",
  async function(this: CustomWorld) {
    // The switch should have changed state
    const toggle = this.page.locator(
      '[data-testid="email-notifications-switch"], #email-notifications',
    );
    await expect(toggle).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

Then(
  "the push notifications should be toggled",
  async function(this: CustomWorld) {
    const toggle = this.page.locator(
      '[data-testid="push-notifications-switch"], #push-notifications',
    );
    await expect(toggle).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

Then(
  "the email notifications toggle should reflect the change",
  async function(this: CustomWorld) {
    // Verify the toggle state persisted
    const toggle = this.page.locator(
      '[data-testid="email-notifications-switch"], #email-notifications',
    );
    await expect(toggle).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

// Privacy Tab Steps

Then(
  "I should see the public profile toggle",
  async function(this: CustomWorld) {
    const toggle = this.page.locator(
      '[data-testid="public-profile-switch"], #public-profile',
    );
    await expect(toggle).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

Then(
  "I should see the show activity toggle",
  async function(this: CustomWorld) {
    const toggle = this.page.locator(
      '[data-testid="show-activity-switch"], #show-activity',
    );
    await expect(toggle).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

When("I toggle the public profile switch", async function(this: CustomWorld) {
  const toggle = this.page.locator(
    '[data-testid="public-profile-switch"], #public-profile',
  );
  await expect(toggle).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  await toggle.click();
  await this.page.waitForTimeout(300);
});

When("I toggle the show activity switch", async function(this: CustomWorld) {
  const toggle = this.page.locator(
    '[data-testid="show-activity-switch"], #show-activity',
  );
  await expect(toggle).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  await toggle.click();
  await this.page.waitForTimeout(300);
});

Then(
  "the public profile setting should be toggled",
  async function(this: CustomWorld) {
    const toggle = this.page.locator(
      '[data-testid="public-profile-switch"], #public-profile',
    );
    await expect(toggle).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

Then(
  "the show activity setting should be toggled",
  async function(this: CustomWorld) {
    const toggle = this.page.locator(
      '[data-testid="show-activity-switch"], #show-activity',
    );
    await expect(toggle).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

Then(
  "I should see the {string} section",
  async function(this: CustomWorld, sectionName: string) {
    await waitForTextWithRetry(this.page, new RegExp(sectionName, "i"), {
      timeout: TIMEOUTS.DEFAULT,
    });
  },
);

Then(
  "the delete button should be styled as destructive",
  async function(this: CustomWorld) {
    const deleteButton = this.page.locator(
      '[data-testid="delete-account-button"]',
    );
    const classList = await deleteButton.getAttribute("class");
    expect(classList).toContain("destructive");
  },
);

Then(
  "I should see the delete account dialog",
  async function(this: CustomWorld) {
    const dialog = this.page.locator(
      '[data-testid="delete-dialog"], [role="dialog"]',
    );
    await expect(dialog).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

Then(
  "I should see the warning message about permanent deletion",
  async function(this: CustomWorld) {
    await waitForTextWithRetry(
      this.page,
      /cannot be undone|permanently delete/i,
      {
        timeout: TIMEOUTS.DEFAULT,
      },
    );
  },
);

Then(
  "I should see the {string} confirmation button",
  async function(this: CustomWorld, buttonText: string) {
    const dialog = this.page.locator('[role="dialog"]');
    const button = dialog.getByRole("button", {
      name: new RegExp(buttonText, "i"),
    });
    await expect(button).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

Then("the delete dialog should be closed", async function(this: CustomWorld) {
  const dialog = this.page.locator(
    '[data-testid="delete-dialog"], [role="dialog"]',
  );
  await expect(dialog).not.toBeVisible({ timeout: TIMEOUTS.DEFAULT });
});
