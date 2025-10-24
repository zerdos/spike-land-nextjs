import { Page, expect } from '@playwright/test';

export class AppCreationWizard {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto('/my-apps/new');
    await this.page.waitForLoadState('networkidle');
  }

  async getProgressBar() {
    return this.page.locator('[data-testid="wizard-progress"]');
  }

  async getProgressText() {
    return this.page.locator('[data-testid="wizard-progress-text"]');
  }

  async getStepTitle() {
    return this.page.locator('[data-testid="wizard-step-title"]');
  }

  async getNextButton() {
    return this.page.getByRole('button', { name: /Next/i });
  }

  async getBackButton() {
    return this.page.getByRole('button', { name: /Back/i });
  }

  async getSubmitButton() {
    return this.page.getByRole('button', { name: /Submit|Create App/i });
  }

  async clickNext() {
    const button = await this.getNextButton();
    await button.click();
  }

  async clickBack() {
    const button = await this.getBackButton();
    await button.click();
  }

  async clickSubmit() {
    const button = await this.getSubmitButton();
    await button.click();
  }

  // Step 1: Basic Info
  async getAppNameInput() {
    return this.page.getByLabel(/App Name/i);
  }

  async getAppDescriptionTextarea() {
    return this.page.getByLabel(/Description/i);
  }

  async fillBasicInfo(name: string, description: string) {
    await (await this.getAppNameInput()).fill(name);
    await (await this.getAppDescriptionTextarea()).fill(description);
  }

  async getNameErrorMessage() {
    return this.page.locator('[data-testid="app-name-error"]');
  }

  async getDescriptionErrorMessage() {
    return this.page.locator('[data-testid="app-description-error"]');
  }

  // Step 2: Requirements
  async getRequirementsTextarea() {
    return this.page.getByLabel(/Requirements/i);
  }

  async fillRequirements(requirements: string) {
    await (await this.getRequirementsTextarea()).fill(requirements);
  }

  async getRequirementsErrorMessage() {
    return this.page.locator('[data-testid="requirements-error"]');
  }

  // Step 3: Monetization
  async getMonetizationOption(option: 'Free' | 'Paid' | 'Freemium' | 'Subscription') {
    return this.page.getByRole('radio', { name: option });
  }

  async selectMonetizationOption(option: 'Free' | 'Paid' | 'Freemium' | 'Subscription') {
    const radio = await this.getMonetizationOption(option);
    await radio.click();
  }

  async getPriceInput() {
    return this.page.getByLabel(/Price/i);
  }

  async fillPrice(price: string) {
    await (await this.getPriceInput()).fill(price);
  }

  // Step 4: Review
  async getReviewSection(section: 'Basic Info' | 'Requirements' | 'Monetization') {
    return this.page.locator(`[data-testid="review-${section.toLowerCase().replace(/\s+/g, '-')}"]`);
  }

  async getEditButton(section: 'Basic Info' | 'Requirements' | 'Monetization') {
    return this.page.locator(`[data-testid="edit-${section.toLowerCase().replace(/\s+/g, '-')}"]`);
  }

  async clickEditButton(section: 'Basic Info' | 'Requirements' | 'Monetization') {
    const button = await this.getEditButton(section);
    await button.click();
  }

  async getReviewValue(label: string) {
    return this.page.locator(`[data-testid="review-value-${label.toLowerCase().replace(/\s+/g, '-')}"]`);
  }

  // Draft management
  async verifyDraftSaved() {
    const draftIndicator = this.page.locator('[data-testid="draft-saved-indicator"]');
    await expect(draftIndicator).toBeVisible();
  }

  async clearDraft() {
    await this.page.evaluate(() => {
      localStorage.removeItem('app-creation-draft');
    });
  }

  async getDraftData() {
    return await this.page.evaluate(() => {
      const draft = localStorage.getItem('app-creation-draft');
      return draft ? JSON.parse(draft) : null;
    });
  }

  // Progress verification
  async verifyProgress(percentage: number) {
    const progressBar = await this.getProgressBar();
    await expect(progressBar).toHaveAttribute('aria-valuenow', percentage.toString());
  }

  async verifyStep(_stepNumber: number, stepName: string) {
    const title = await this.getStepTitle();
    await expect(title).toContainText(stepName);
  }

  async verifyOnReviewStep() {
    await this.verifyStep(4, 'Review');
  }

  async verifyRedirectToMyApps() {
    await expect(this.page).toHaveURL(/\/my-apps$/);
  }
}
