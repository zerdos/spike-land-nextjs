import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { TIMEOUTS, waitForPageLoad } from "../support/helpers/retry-helper";
import { AppCreationWizard } from "../support/page-objects/AppCreationWizard";
import type { CustomWorld } from "../support/world";

// Helper to get or create page object
function getWizard(world: CustomWorld): AppCreationWizard {
  if (!world.appCreationWizard) {
    world.appCreationWizard = new AppCreationWizard(world.page);
  }
  return world.appCreationWizard;
}

// Extend CustomWorld with additional properties
declare module "../support/world" {
  interface CustomWorld {
    appCreationWizard?: AppCreationWizard;
    serverSubmissionError?: boolean;
    descriptionCharacterLimit?: number;
  }
}

// Subscription and price-related steps
Then(
  "I should see the subscription pricing options",
  async function(this: CustomWorld) {
    const monthlyOption = this.page.locator(
      '[data-testid="subscription-monthly"]',
    );
    const yearlyOption = this.page.locator(
      '[data-testid="subscription-yearly"]',
    );
    await expect(monthlyOption).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
    await expect(yearlyOption).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

// NOTE: "I type {string} in the {string} field" step moved to common.steps.ts

// NOTE: "I wait for {int} seconds" step moved to common.steps.ts

// NOTE: "the {string} field should contain {string}" step moved to common.steps.ts

// Navigation validation steps
When(
  "I try to navigate directly to step {int}",
  async function(this: CustomWorld, stepNumber: number) {
    // Try to access step directly via URL manipulation
    const currentUrl = this.page.url();
    const stepUrl = currentUrl.includes("?")
      ? `${currentUrl}&step=${stepNumber}`
      : `${currentUrl}?step=${stepNumber}`;
    await this.page.goto(stepUrl);
    await waitForPageLoad(this.page);
  },
);

Then(
  "I should be redirected back to step {int}",
  async function(this: CustomWorld, stepNumber: number) {
    const wizard = getWizard(this);
    const stepTitle = await wizard.getStepTitle();
    const expectedSteps: Record<number, string> = {
      1: "Basic Info",
      2: "Requirements",
      3: "Monetization",
      4: "Review",
    };
    const expectedText = expectedSteps[stepNumber];
    if (!expectedText) {
      throw new Error(`Invalid step number: ${stepNumber}. Expected 1-4.`);
    }
    await expect(stepTitle).toContainText(expectedText, {
      timeout: TIMEOUTS.DEFAULT,
    });
  },
);

// Character limit validation
When(
  "I type a description longer than {int} characters",
  async function(this: CustomWorld, limit: number) {
    this.descriptionCharacterLimit = limit;
    const longDescription = "A".repeat(limit + 50);
    const wizard = getWizard(this);
    const descField = await wizard.getAppDescriptionTextarea();
    await descField.fill(longDescription);
  },
);

Then(
  "I should see the character count warning",
  async function(this: CustomWorld) {
    const warning = this.page.locator(
      '[data-testid="character-count-warning"], .character-warning',
    );
    await expect(warning).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

Then(
  "characters over the limit should be truncated",
  async function(this: CustomWorld) {
    const wizard = getWizard(this);
    const descField = await wizard.getAppDescriptionTextarea();
    const value = await descField.inputValue();
    const limit = this.descriptionCharacterLimit || 500;
    expect(value.length).toBeLessThanOrEqual(limit);
  },
);

// NOTE: "I click the {string} button" step moved to common.steps.ts

Then(
  "I should see the unsaved changes confirmation dialog",
  async function(this: CustomWorld) {
    const dialog = this.page.locator('[role="dialog"], [role="alertdialog"]');
    await expect(dialog).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

// NOTE: "I should see {string} text" is defined in authentication.steps.ts

When("I confirm discarding changes", async function(this: CustomWorld) {
  const discardButton = this.page.getByRole("button", {
    name: /Discard|Yes|Confirm/i,
  });
  await discardButton.click();
  await waitForPageLoad(this.page);
});

When(
  "I click {string}",
  async function(this: CustomWorld, buttonText: string) {
    const button = this.page.getByRole("button", {
      name: new RegExp(buttonText, "i"),
    });
    await button.click();
    await waitForPageLoad(this.page);
  },
);

Then("I should remain on the wizard", async function(this: CustomWorld) {
  await expect(this.page).toHaveURL(/\/my-apps\/new/, {
    timeout: TIMEOUTS.DEFAULT,
  });
});

// Error handling steps
Given(
  "the server will return a submission error",
  async function(this: CustomWorld) {
    this.serverSubmissionError = true;
    await this.page.route("**/api/apps", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Failed to create app" }),
        });
      } else {
        await route.continue();
      }
    });
  },
);

Then("I should remain on the review step", async function(this: CustomWorld) {
  const wizard = getWizard(this);
  const stepTitle = await wizard.getStepTitle();
  await expect(stepTitle).toContainText("Review", {
    timeout: TIMEOUTS.DEFAULT,
  });
});

// Accessibility steps
Then(
  "I should be able to tab through form fields",
  async function(this: CustomWorld) {
    await this.page.keyboard.press("Tab");
    const focusedElement = this.page.locator(":focus");
    await expect(focusedElement).toBeVisible();
  },
);

Then(
  "the focused field should have a visible focus indicator",
  async function(this: CustomWorld) {
    const focusedElement = this.page.locator(":focus");
    await expect(focusedElement).toBeVisible();
    // Check for focus ring or outline
    const outline = await focusedElement.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.outline || style.boxShadow;
    });
    expect(outline).toBeTruthy();
  },
);

When(
  "I press Enter on the {string} button",
  async function(this: CustomWorld, buttonText: string) {
    const button = this.page.getByRole("button", {
      name: new RegExp(buttonText, "i"),
    });
    await button.focus();
    await this.page.keyboard.press("Enter");
    await waitForPageLoad(this.page);
  },
);

Then("I should advance to the next step", async function(this: CustomWorld) {
  // Verify we moved forward by checking the progress bar increased
  const wizard = getWizard(this);
  const progressBar = await wizard.getProgressBar();
  const value = await progressBar.getAttribute("aria-valuenow");
  expect(Number(value)).toBeGreaterThan(25);
});

Then(
  "all form fields should have associated labels",
  async function(this: CustomWorld) {
    const inputs = this.page.locator("input:visible, textarea:visible");
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute("id");
      const ariaLabel = await input.getAttribute("aria-label");
      const ariaLabelledBy = await input.getAttribute("aria-labelledby");

      // Check if input has a label association
      if (id) {
        const label = this.page.locator(`label[for="${id}"]`);
        const hasLabel = await label.isVisible().catch(() => false);
        expect(hasLabel || ariaLabel || ariaLabelledBy).toBeTruthy();
      } else {
        expect(ariaLabel || ariaLabelledBy).toBeTruthy();
      }
    }
  },
);

Then(
  "required fields should be indicated with aria-required",
  async function(this: CustomWorld) {
    const requiredInputs = this.page.locator(
      "[aria-required='true'], input:required, textarea:required",
    );
    const count = await requiredInputs.count();
    expect(count).toBeGreaterThan(0);
  },
);

// App creation helper
Given(
  "I create an app named {string}",
  async function(this: CustomWorld, appName: string) {
    const wizard = getWizard(this);
    await wizard.navigate();
    await wizard.fillBasicInfo(appName, "Test description for created app");
    await wizard.clickNext();
    await wizard.fillRequirements("Basic app requirements for testing");
    await wizard.clickNext();
    await wizard.selectMonetizationOption("Free");
    await wizard.clickNext();
    await wizard.clickSubmit();
    await waitForPageLoad(this.page);
  },
);

// NOTE: "I should not see {string} text" step moved to common.steps.ts
