import { expect, Page } from "@playwright/test";
import { TIMEOUTS, waitForPageLoad } from "../helpers/retry-helper";

export class BoxesPage {
  constructor(private page: Page) {}

  // Navigation
  async navigateToList() {
    await this.page.goto("/boxes");
    await waitForPageLoad(this.page);
  }

  async navigateToNew() {
    await this.page.goto("/boxes/new");
    await waitForPageLoad(this.page);
  }

  async navigateToBox(boxId: string) {
    await this.page.goto(`/boxes/${boxId}`);
    await waitForPageLoad(this.page);
  }

  // Page Elements - List Page
  async getPageTitle() {
    return this.page.getByRole("heading", { name: /My Boxes/i });
  }

  async getCreateNewBoxButton() {
    return this.page.getByRole("button", { name: /Create New Box/i });
  }

  async getBoxCards() {
    return this.page.locator('[data-testid="box-card"]');
  }

  async getBoxCardByName(name: string) {
    return this.page.locator('[data-testid="box-card"]', { hasText: name });
  }

  async getEmptyStateMessage() {
    return this.page.getByText(/Create your first box|No boxes yet/i);
  }

  async getSearchInput() {
    return this.page.getByPlaceholder(/Search boxes/i);
  }

  async getFilterButton(filter: string) {
    return this.page.getByRole("button", { name: filter, exact: true });
  }

  // Page Elements - Creation Page
  async getTierCard(tierName: string) {
    return this.page.locator('[data-testid="tier-card"]', { hasText: tierName });
  }

  async getTierSelectionCards() {
    return this.page.locator('[data-testid="tier-card"]');
  }

  async getBoxNameInput() {
    return this.page.getByLabel(/Box Name/i);
  }

  async getBoxConfigurationForm() {
    return this.page.locator('[data-testid="box-configuration-form"]');
  }

  async getCreateBoxButton() {
    return this.page.getByRole("button", { name: /Create Box/i });
  }

  async getValidationError() {
    return this.page.locator('[data-testid="validation-error"], .error-message, [role="alert"]');
  }

  // Page Elements - Detail Page
  async getBoxHeading() {
    return this.page.locator("h1");
  }

  async getControlPanel() {
    return this.page.locator('[data-testid="box-control-panel"]');
  }

  async getStartButton() {
    return this.page.getByRole("button", { name: /Start/i });
  }

  async getStopButton() {
    return this.page.getByRole("button", { name: /Stop/i });
  }

  async getDeleteButton() {
    return this.page.getByRole("button", { name: /Delete Box/i });
  }

  async getStatusIndicator() {
    return this.page.locator('[data-testid="box-status"]');
  }

  async getConnectionDetailsTab() {
    return this.page.getByRole("tab", { name: /Connection Details/i });
  }

  async getSettingsTab() {
    return this.page.getByRole("tab", { name: /Settings/i });
  }

  async getConnectionUrl() {
    return this.page.locator('[data-testid="connection-url"]');
  }

  async getAuthToken() {
    return this.page.locator('[data-testid="auth-token"]');
  }

  async getUpgradeButton() {
    return this.page.getByRole("button", { name: /Upgrade/i });
  }

  async getTierUpgradeModal() {
    return this.page.locator('[role="dialog"]', { hasText: /Upgrade/i });
  }

  // Actions - List Page
  async clickCreateNewBox() {
    const button = await this.getCreateNewBoxButton();
    await button.click();
    await waitForPageLoad(this.page);
  }

  async searchBoxes(query: string) {
    const searchInput = await this.getSearchInput();
    await searchInput.fill(query);
    await this.page.waitForTimeout(300); // Debounce
  }

  async clickFilter(filterName: string) {
    const button = await this.getFilterButton(filterName);
    await button.click();
    await waitForPageLoad(this.page);
  }

  async clickBoxCard(name: string) {
    const card = await this.getBoxCardByName(name);
    await card.click();
    await waitForPageLoad(this.page);
  }

  // Actions - Creation Page
  async selectTier(tierName: string) {
    const tierCard = await this.getTierCard(tierName);
    await expect(tierCard).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
    await tierCard.click();
  }

  async fillBoxName(name: string) {
    const input = await this.getBoxNameInput();
    await input.fill(name);
  }

  async submitCreateBox() {
    const button = await this.getCreateBoxButton();
    await button.click();
    await waitForPageLoad(this.page);
  }

  // Actions - Detail Page
  async clickStart() {
    const button = await this.getStartButton();
    await button.click();
  }

  async clickStop() {
    const button = await this.getStopButton();
    await button.click();
  }

  async clickDelete() {
    const button = await this.getDeleteButton();
    await button.click();
  }

  async clickConnectionDetailsTab() {
    const tab = await this.getConnectionDetailsTab();
    await tab.click();
    await this.page.waitForTimeout(300);
  }

  async clickSettingsTab() {
    const tab = await this.getSettingsTab();
    await tab.click();
    await this.page.waitForTimeout(300);
  }

  async changeBoxName(newName: string) {
    const input = await this.getBoxNameInput();
    await input.clear();
    await input.fill(newName);
  }

  async saveChanges() {
    const saveButton = this.page.getByRole("button", { name: /Save Changes/i });
    await saveButton.click();
    await waitForPageLoad(this.page);
  }

  async clickUpgrade() {
    const button = await this.getUpgradeButton();
    await button.click();
  }

  // Verification Methods
  async verifyOnBoxesListPage() {
    await expect(await this.getPageTitle()).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
    await expect(this.page).toHaveURL(/\/boxes$/);
  }

  async verifyOnCreateBoxPage() {
    await expect(this.page).toHaveURL(/\/boxes\/new/);
    const heading = this.page.getByRole("heading", { name: /Create New Box/i });
    await expect(heading).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  }

  async verifyOnBoxDetailPage(boxName: string) {
    const heading = await this.getBoxHeading();
    await expect(heading).toContainText(boxName, { timeout: TIMEOUTS.DEFAULT });
  }

  async verifyTierIsHighlighted(tierName: string) {
    const tierCard = await this.getTierCard(tierName);
    await expect(tierCard).toHaveClass(/selected|active|ring/, { timeout: TIMEOUTS.DEFAULT });
  }

  async verifyBoxInList(boxName: string) {
    const card = await this.getBoxCardByName(boxName);
    await expect(card).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  }

  async verifyBoxNotInList(boxName: string) {
    const card = await this.getBoxCardByName(boxName);
    await expect(card).not.toBeVisible({ timeout: TIMEOUTS.SHORT });
  }

  async verifyBoxCount(count: number) {
    const cards = await this.getBoxCards();
    await expect(cards).toHaveCount(count, { timeout: TIMEOUTS.DEFAULT });
  }

  async verifyBoxStatus(status: string) {
    const statusIndicator = await this.getStatusIndicator();
    await expect(statusIndicator).toContainText(status, { timeout: TIMEOUTS.LONG });
  }

  async verifyValidationError(message: string) {
    const error = await this.getValidationError();
    await expect(error).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
    await expect(error).toContainText(message);
  }

  async verifyEmptyState() {
    const emptyMessage = await this.getEmptyStateMessage();
    await expect(emptyMessage).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  }

  // Helper to create a box via localStorage for testing
  async seedBox(boxData: { id: string; name: string; tier: string; status: string; }) {
    await this.page.evaluate((data) => {
      const boxes = JSON.parse(localStorage.getItem("user-boxes") || "[]");
      boxes.push(data);
      localStorage.setItem("user-boxes", JSON.stringify(boxes));
    }, boxData);
  }

  async clearBoxes() {
    await this.page.evaluate(() => {
      localStorage.removeItem("user-boxes");
    });
  }
}
