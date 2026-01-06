import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import {
  clickButtonWithRetry,
  fillInputWithRetry,
  TIMEOUTS,
  waitForPageLoad,
  waitForTestId,
} from "../helpers/retry-helper";

export class AppCreationWizard {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto("/my-apps/new");
    await waitForPageLoad(this.page);
    // Wait for the wizard form to be visible before proceeding
    // This ensures the page is fully rendered after authentication
    await waitForTestId(this.page, "wizard-step-title", {
      timeout: TIMEOUTS.LONG,
    });
  }

  async getProgressBar() {
    return this.page.getByTestId("wizard-progress");
  }

  async getProgressText() {
    return this.page.getByTestId("wizard-progress-text");
  }

  async getStepTitle() {
    return this.page.getByTestId("wizard-step-title");
  }

  async getNextButton() {
    return this.page.getByTestId("wizard-next-button");
  }

  async getBackButton() {
    return this.page.getByTestId("wizard-back-button");
  }

  async getSubmitButton() {
    return this.page.getByTestId("wizard-submit-button");
  }

  async clickNext() {
    await clickButtonWithRetry(this.page, "wizard-next-button");
    await waitForPageLoad(this.page);
  }

  async clickBack() {
    await clickButtonWithRetry(this.page, "wizard-back-button");
    await waitForPageLoad(this.page);
  }

  async clickSubmit() {
    await clickButtonWithRetry(this.page, "wizard-submit-button");
    await waitForPageLoad(this.page);
  }

  // Step 1: Basic Info
  async getAppNameInput() {
    return this.page.getByTestId("app-name-input");
  }

  async getAppDescriptionTextarea() {
    return this.page.getByTestId("app-description-textarea");
  }

  async fillBasicInfo(name: string, description: string) {
    await fillInputWithRetry(this.page, "app-name-input", name);
    await fillInputWithRetry(
      this.page,
      "app-description-textarea",
      description,
    );
  }

  async getNameErrorMessage() {
    return this.page.getByTestId("app-name-error");
  }

  async getDescriptionErrorMessage() {
    return this.page.getByTestId("app-description-error");
  }

  // Step 2: Requirements
  async getRequirementsTextarea() {
    return this.page.getByTestId("requirements-textarea");
  }

  async fillRequirements(requirements: string) {
    await fillInputWithRetry(this.page, "requirements-textarea", requirements);
  }

  async getRequirementsErrorMessage() {
    return this.page.getByTestId("requirements-error");
  }

  // Step 3: Monetization (uses Select dropdown, not radio buttons)
  async getMonetizationSelect() {
    return this.page.getByTestId("monetization-select");
  }

  async selectMonetizationOption(
    option: "Free" | "Paid" | "Freemium" | "Subscription",
  ) {
    // Click the select trigger to open dropdown
    await this.page.getByTestId("monetization-select").click();
    // Wait for dropdown to open and click the option
    // Use exact match pattern to avoid "Free" matching "Freemium"
    const optionPattern = new RegExp(`^${option}\\s*-`, "i");
    await this.page.getByRole("option", { name: optionPattern }).click();
  }

  async getPriceInput() {
    return this.page.getByTestId("monetization-price-input");
  }

  async fillPrice(price: string) {
    await fillInputWithRetry(this.page, "monetization-price-input", price);
  }

  // Step 4: Review
  async getReviewSection(
    section: "Basic Info" | "Requirements" | "Monetization",
  ) {
    return this.page.locator(
      `[data-testid="review-${section.toLowerCase().replace(/\s+/g, "-")}"]`,
    );
  }

  async getEditButton(section: "Basic Info" | "Requirements" | "Monetization") {
    return this.page.locator(
      `[data-testid="edit-${section.toLowerCase().replace(/\s+/g, "-")}"]`,
    );
  }

  async clickEditButton(
    section: "Basic Info" | "Requirements" | "Monetization",
  ) {
    const button = await this.getEditButton(section);
    await button.click();
  }

  async getReviewValue(label: string) {
    return this.page.locator(
      `[data-testid="review-value-${label.toLowerCase().replace(/\s+/g, "-")}"]`,
    );
  }

  // Draft management
  async verifyDraftSaved() {
    const draftIndicator = await waitForTestId(
      this.page,
      "draft-saved-indicator",
    );
    await expect(draftIndicator).toBeVisible();
  }

  async clearDraft() {
    await this.page.evaluate(() => {
      localStorage.removeItem("app-creation-draft");
    });
  }

  async getDraftData() {
    return await this.page.evaluate(() => {
      const draft = localStorage.getItem("app-creation-draft");
      return draft ? JSON.parse(draft) : null;
    });
  }

  // Progress verification
  async verifyProgress(percentage: number) {
    const progressBar = await this.getProgressBar();
    await expect(progressBar).toHaveAttribute(
      "aria-valuenow",
      percentage.toString(),
      {
        timeout: TIMEOUTS.DEFAULT,
      },
    );
  }

  async verifyStep(_stepNumber: number, stepName: string) {
    const title = await this.getStepTitle();
    await expect(title).toContainText(stepName, { timeout: TIMEOUTS.DEFAULT });
  }

  async verifyOnReviewStep() {
    await this.verifyStep(4, "Review");
  }

  async verifyRedirectToMyApps() {
    await expect(this.page).toHaveURL(/\/my-apps$/, {
      timeout: TIMEOUTS.DEFAULT,
    });
  }
}
