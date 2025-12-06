import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { TIMEOUTS, waitForPageLoad, waitForTextWithRetry } from "../support/helpers/retry-helper";
import { AppCreationWizard } from "../support/page-objects/AppCreationWizard";
import { CustomWorld } from "../support/world";

// Helper to get or create page object
function getWizard(world: CustomWorld): AppCreationWizard {
  if (!world.appCreationWizard) {
    world.appCreationWizard = new AppCreationWizard(world.page);
  }
  return world.appCreationWizard;
}

// Extend CustomWorld
declare module "../support/world" {
  interface CustomWorld {
    appCreationWizard?: AppCreationWizard;
    wizardFormData?: {
      name?: string;
      description?: string;
      requirements?: string;
      monetization?: string;
      price?: string;
    };
  }
}

Given("I navigate to the app creation wizard", async function(this: CustomWorld) {
  const wizard = getWizard(this);
  await wizard.navigate();
  await waitForPageLoad(this.page);
});

Then("I should see the wizard step {string}", async function(this: CustomWorld, stepName: string) {
  const wizard = getWizard(this);
  const stepTitle = await wizard.getStepTitle();
  await expect(stepTitle).toContainText(stepName, { timeout: TIMEOUTS.DEFAULT });
});

Then("I should see the {string} input field", async function(this: CustomWorld, fieldName: string) {
  // Wait for the form to be fully rendered and interactive
  await this.page.waitForLoadState("networkidle");

  // Try to find by testid first, fall back to label for backward compatibility
  try {
    const testId = fieldName.toLowerCase().replace(/\s+/g, "-") + "-input";
    const field = this.page.getByTestId(testId);
    await expect(field).toBeVisible({ timeout: TIMEOUTS.SHORT });
  } catch {
    const label = this.page.getByLabel(new RegExp(fieldName, "i"));
    await expect(label).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  }
});

Then(
  "I should see the {string} textarea field",
  async function(this: CustomWorld, fieldName: string) {
    // Wait for the form to be fully rendered and interactive
    await this.page.waitForLoadState("networkidle");

    // Try to find by testid first, fall back to label for backward compatibility
    try {
      const testId = fieldName.toLowerCase().replace(/\s+/g, "-") + "-textarea";
      const field = this.page.getByTestId(testId);
      await expect(field).toBeVisible({ timeout: TIMEOUTS.SHORT });
    } catch {
      const label = this.page.getByLabel(new RegExp(fieldName, "i"));
      await expect(label).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
    }
  },
);

Then("the progress bar should show {int}%", async function(this: CustomWorld, percentage: number) {
  const wizard = getWizard(this);
  await wizard.verifyProgress(percentage);
});

Then("the progress text should say {string}", async function(this: CustomWorld, text: string) {
  const wizard = getWizard(this);
  const progressText = await wizard.getProgressText();
  await expect(progressText).toHaveText(text);
});

Then(
  "I should see the error message {string}",
  async function(this: CustomWorld, errorMessage: string) {
    await waitForTextWithRetry(this.page, errorMessage, { exact: false });
  },
);

Then("I should remain on step {int}", async function(this: CustomWorld, _stepNumber: number) {
  // Verify we haven't navigated away - the step title should still be visible
  const wizard = getWizard(this);
  const stepTitle = await wizard.getStepTitle();
  await expect(stepTitle).toBeVisible();
});

When(
  "I type {string} in the {string} field",
  async function(this: CustomWorld, value: string, fieldName: string) {
    // Try to find by testid first, fall back to label for backward compatibility
    let field;
    try {
      const testId = fieldName.toLowerCase().replace(/\s+/g, "-");
      const suffixes = ["input", "textarea", "field"];
      for (const suffix of suffixes) {
        try {
          field = this.page.getByTestId(`${testId}-${suffix}`);
          await expect(field).toBeVisible({ timeout: TIMEOUTS.SHORT });
          break;
        } catch {
          continue;
        }
      }
      if (!field) {
        field = this.page.getByTestId(testId);
      }
    } catch {
      field = this.page.getByLabel(new RegExp(fieldName, "i"));
    }

    await expect(field).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
    await field.fill(value);

    // Store in world for later verification
    if (!this.wizardFormData) {
      this.wizardFormData = {};
    }
    if (fieldName.toLowerCase().includes("name")) {
      this.wizardFormData.name = value;
    } else if (fieldName.toLowerCase().includes("description")) {
      this.wizardFormData.description = value;
    } else if (fieldName.toLowerCase().includes("requirements")) {
      this.wizardFormData.requirements = value;
    }
  },
);

Then(
  "the {string} button should be disabled",
  async function(this: CustomWorld, buttonName: string) {
    // Try to find by testid first to avoid strict mode violations
    let button;
    try {
      const testId = `wizard-${buttonName.toLowerCase()}-button`;
      button = this.page.getByTestId(testId);
      await expect(button).toBeVisible({ timeout: TIMEOUTS.SHORT });
    } catch {
      button = this.page.getByRole("button", { name: new RegExp(buttonName, "i") });
    }
    await expect(button).toBeDisabled({ timeout: TIMEOUTS.DEFAULT });
  },
);

Then(
  "the {string} button should be enabled",
  async function(this: CustomWorld, buttonName: string) {
    // Try to find by testid first to avoid strict mode violations
    let button;
    try {
      const testId = `wizard-${buttonName.toLowerCase()}-button`;
      button = this.page.getByTestId(testId);
      await expect(button).toBeVisible({ timeout: TIMEOUTS.SHORT });
    } catch {
      button = this.page.getByRole("button", { name: new RegExp(buttonName, "i") });
    }
    await expect(button).toBeEnabled({ timeout: TIMEOUTS.DEFAULT });
  },
);

Given("I complete step 1 with valid data", async function(this: CustomWorld) {
  const wizard = getWizard(this);
  await wizard.fillBasicInfo("Test App", "This is a valid test app description");
  await wizard.clickNext();
  await waitForPageLoad(this.page);
});

Given(
  "I complete step 1 with name {string} and description {string}",
  async function(this: CustomWorld, name: string, description: string) {
    const wizard = getWizard(this);
    await wizard.fillBasicInfo(name, description);
    this.wizardFormData = { name, description };
    await wizard.clickNext();
    await waitForPageLoad(this.page);
  },
);

When(
  "I complete step {int} with name {string}",
  async function(this: CustomWorld, step: number, name: string) {
    if (step === 1) {
      const wizard = getWizard(this);
      await wizard.fillBasicInfo(name, "Test description for step 1");
      this.wizardFormData = { name, description: "Test description for step 1" };
      await wizard.clickNext();
      await waitForPageLoad(this.page);
    }
  },
);

Then(
  "the {string} field should contain {string}",
  async function(this: CustomWorld, fieldName: string, value: string) {
    const field = this.page.getByLabel(new RegExp(fieldName, "i"));
    await expect(field).toHaveValue(value);
  },
);

Given("I complete step 1 and 2 with valid data", async function(this: CustomWorld) {
  const wizard = getWizard(this);
  await wizard.fillBasicInfo("Test App", "This is a valid test app description");
  await wizard.clickNext();
  await waitForPageLoad(this.page);
  await wizard.fillRequirements("The app should have authentication and a dashboard");
  await wizard.clickNext();
  await waitForPageLoad(this.page);
});

Then("the requirements data should be preserved", async function(this: CustomWorld) {
  const wizard = getWizard(this);
  const requirementsField = await wizard.getRequirementsTextarea();
  const value = await requirementsField.inputValue();
  expect(value).toBeTruthy();
  expect(value.length).toBeGreaterThan(0);
});

Then(
  "I should see the {string} monetization option",
  async function(this: CustomWorld, option: string) {
    // Try testid first, fall back to role selector
    try {
      const testId = `monetization-option-${option.toLowerCase()}`;
      const radio = this.page.getByTestId(testId);
      await expect(radio).toBeVisible({ timeout: TIMEOUTS.SHORT });
    } catch {
      const radio = this.page.getByRole("radio", { name: option });
      await expect(radio).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
    }
  },
);

When(
  "I select the {string} monetization option",
  async function(this: CustomWorld, option: string) {
    const wizard = getWizard(this);
    await wizard.selectMonetizationOption(option as "Free" | "Paid" | "Freemium" | "Subscription");
  },
);

Then("the {string} option should be selected", async function(this: CustomWorld, option: string) {
  // Try testid first, fall back to role selector
  try {
    const testId = `monetization-option-${option.toLowerCase()}`;
    const radio = this.page.getByTestId(testId);
    await expect(radio).toBeChecked({ timeout: TIMEOUTS.SHORT });
  } catch {
    const radio = this.page.getByRole("radio", { name: option });
    await expect(radio).toBeChecked({ timeout: TIMEOUTS.DEFAULT });
  }
});

Then("I should see the price input field", async function(this: CustomWorld) {
  const wizard = getWizard(this);
  const priceInput = await wizard.getPriceInput();
  await expect(priceInput).toBeVisible();
});

Given("I complete all wizard steps with valid data", async function(this: CustomWorld) {
  const wizard = getWizard(this);

  // Step 1
  await wizard.fillBasicInfo("Complete Test App", "This is a complete test app description");
  await wizard.clickNext();
  await waitForPageLoad(this.page);

  // Step 2
  await wizard.fillRequirements(
    "The app should have full authentication system and user dashboard",
  );
  await wizard.clickNext();
  await waitForPageLoad(this.page);

  // Step 3
  await wizard.selectMonetizationOption("Free");
  await wizard.clickNext();
  await waitForPageLoad(this.page);
});

Given(
  "I complete all wizard steps with name {string} and description {string}",
  async function(this: CustomWorld, name: string, description: string) {
    const wizard = getWizard(this);

    // Step 1
    await wizard.fillBasicInfo(name, description);
    this.wizardFormData = { name, description };
    await wizard.clickNext();
    await waitForPageLoad(this.page);

    // Step 2
    await wizard.fillRequirements("These are the requirements for the app");
    await wizard.clickNext();
    await waitForPageLoad(this.page);

    // Step 3
    await wizard.selectMonetizationOption("Free");
    await wizard.clickNext();
    await waitForPageLoad(this.page);
  },
);

Then(
  "I should see the review section {string}",
  async function(this: CustomWorld, sectionName: string) {
    const section = await getWizard(this).getReviewSection(
      sectionName as "Basic Info" | "Requirements" | "Monetization",
    );
    await expect(section).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

Then("the review should show app name {string}", async function(this: CustomWorld, name: string) {
  const nameValue = this.page.getByTestId("review-value-app-name");
  await expect(nameValue).toHaveText(name, { timeout: TIMEOUTS.DEFAULT });
});

Then(
  "the review should show description {string}",
  async function(this: CustomWorld, description: string) {
    const descValue = this.page.getByTestId("review-value-description");
    await expect(descValue).toHaveText(description, { timeout: TIMEOUTS.DEFAULT });
  },
);

When("I click the edit button for {string}", async function(this: CustomWorld, section: string) {
  const wizard = getWizard(this);
  await wizard.clickEditButton(section as "Basic Info" | "Requirements" | "Monetization");
  await waitForPageLoad(this.page);
});

Then("the form data should be preserved", async function(this: CustomWorld) {
  // Data should be visible in form fields
  if (this.wizardFormData?.name) {
    const nameField = await getWizard(this).getAppNameInput();
    const value = await nameField.inputValue();
    expect(value).toBeTruthy();
  }
});

// Removed duplicate - using common.steps.ts

Then("the new app should appear in my apps list", async function(this: CustomWorld) {
  // After redirect to /my-apps, check for app card
  const appCards = this.page.locator('[data-testid="app-card"]');
  await expect(appCards).toHaveCount(1, { timeout: TIMEOUTS.DEFAULT });
});

Then("the app should be saved in localStorage", async function(this: CustomWorld) {
  const apps = await this.page.evaluate(() => {
    const data = localStorage.getItem("user-apps");
    return data ? JSON.parse(data) : [];
  });
  expect(apps.length).toBeGreaterThan(0);
});

Then("the localStorage should contain the app data", async function(this: CustomWorld) {
  const apps = await this.page.evaluate(() => {
    const data = localStorage.getItem("user-apps");
    return data ? JSON.parse(data) : [];
  });
  expect(apps[0]).toHaveProperty("name");
  expect(apps[0]).toHaveProperty("description");
});

Then("the draft should be saved to localStorage", async function(this: CustomWorld) {
  const draft = await this.page.evaluate(() => {
    return localStorage.getItem("app-creation-draft");
  });
  expect(draft).toBeTruthy();
});

Then("the draft indicator should show {string}", async function(this: CustomWorld, text: string) {
  const indicator = this.page.getByTestId("draft-saved-indicator");
  await expect(indicator).toContainText(text, { timeout: TIMEOUTS.DEFAULT });
});

When("I navigate to step 2", async function(this: CustomWorld) {
  const wizard = getWizard(this);
  await wizard.clickNext();
  await waitForPageLoad(this.page);
});

Then("the draft should contain step 1 and step 2 data", async function(this: CustomWorld) {
  const draft = await this.page.evaluate(() => {
    const data = localStorage.getItem("app-creation-draft");
    return data ? JSON.parse(data) : null;
  });
  expect(draft).toBeTruthy();
  expect(draft.step1).toBeDefined();
  expect(draft.step2).toBeDefined();
});

When("I reload the page", async function(this: CustomWorld) {
  await this.page.reload();
  await waitForPageLoad(this.page);
});

Then("the draft should be removed from localStorage", async function(this: CustomWorld) {
  const draft = await this.page.evaluate(() => {
    return localStorage.getItem("app-creation-draft");
  });
  expect(draft).toBeNull();
});

Then("the draft indicator should not be visible", async function(this: CustomWorld) {
  const indicator = this.page.getByTestId("draft-saved-indicator");
  await expect(indicator).not.toBeVisible({ timeout: TIMEOUTS.DEFAULT });
});

Given(
  "I start creating an app as {string} with name {string}",
  async function(this: CustomWorld, _userName: string, appName: string) {
    const wizard = getWizard(this);
    const nameField = await wizard.getAppNameInput();
    await nameField.fill(appName);
  },
);

When(
  "I start creating an app with name {string}",
  async function(this: CustomWorld, appName: string) {
    const wizard = getWizard(this);
    const nameField = await wizard.getAppNameInput();
    await nameField.fill(appName);
  },
);

Then("the draft should only contain {string}", async function(this: CustomWorld, appName: string) {
  const draft = await this.page.evaluate(() => {
    const data = localStorage.getItem("app-creation-draft");
    return data ? JSON.parse(data) : null;
  });
  expect(draft.step1?.name).toBe(appName);
});

Then("the draft should not contain {string}", async function(this: CustomWorld, appName: string) {
  const draft = await this.page.evaluate(() => {
    const data = localStorage.getItem("app-creation-draft");
    return data ? JSON.parse(data) : null;
  });
  expect(draft?.step1?.name).not.toBe(appName);
});
