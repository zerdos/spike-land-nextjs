import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class MyAppsPage {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto("/my-apps");
    await this.page.waitForLoadState("networkidle");
  }

  async getPageTitle() {
    return this.page.getByRole("heading", { name: /My Apps/i });
  }

  async getCreateNewAppButton() {
    return this.page.getByRole("button", { name: /Create New App/i });
  }

  async clickCreateNewApp() {
    const button = await this.getCreateNewAppButton();
    await button.click();
  }

  async getEmptyStateMessage() {
    return this.page.getByText(/You haven't created any apps yet/i);
  }

  async getSearchInput() {
    return this.page.getByPlaceholder(/Search apps/i);
  }

  async searchApps(query: string) {
    const searchInput = await this.getSearchInput();
    await searchInput.fill(query);
  }

  async getFilterButton(filter: "All" | "Active" | "Draft") {
    return this.page.getByRole("button", { name: filter });
  }

  async clickFilter(filter: "All" | "Active" | "Draft") {
    const button = await this.getFilterButton(filter);
    await button.click();
  }

  async getAppCards() {
    return this.page.locator('[data-testid="app-card"]');
  }

  async getAppCardByName(name: string) {
    return this.page.locator(`[data-testid="app-card"]`, { hasText: name });
  }

  async clickAppCard(name: string) {
    const card = await this.getAppCardByName(name);
    await card.click();
  }

  async verifyOnMyAppsPage() {
    await expect(await this.getPageTitle()).toBeVisible();
    await expect(this.page).toHaveURL(/\/my-apps$/);
  }

  async verifyEmptyState() {
    await expect(await this.getEmptyStateMessage()).toBeVisible();
    await expect(await this.getCreateNewAppButton()).toBeVisible();
  }

  async verifyAppCount(count: number) {
    const cards = await this.getAppCards();
    await expect(cards).toHaveCount(count);
  }
}
