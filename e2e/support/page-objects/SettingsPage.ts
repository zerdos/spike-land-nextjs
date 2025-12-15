import { expect, Page } from "@playwright/test";

export class SettingsPage {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto("/settings");
    await this.page.waitForLoadState("networkidle");
  }

  async getPageTitle() {
    return this.page.getByRole("heading", { name: /Settings/i });
  }

  async getTab(tabName: "Profile" | "Preferences" | "Privacy") {
    return this.page.getByRole("tab", { name: tabName });
  }

  async clickTab(tabName: "Profile" | "Preferences" | "Privacy") {
    const tab = await this.getTab(tabName);
    await tab.click();
  }

  async getActiveTab() {
    return this.page.locator('[role="tab"][aria-selected="true"]');
  }

  async verifyActiveTab(tabName: string) {
    const activeTab = await this.getActiveTab();
    await expect(activeTab).toHaveText(tabName);
  }

  // Profile tab
  async getProfileTabContent() {
    return this.page.locator('[data-testid="profile-tab-content"]');
  }

  async getProfileName() {
    return this.page.locator('[data-testid="settings-profile-name"]');
  }

  async getProfileEmail() {
    return this.page.locator('[data-testid="settings-profile-email"]');
  }

  async getProfileAvatar() {
    return this.page.locator('[data-testid="settings-profile-avatar"]');
  }

  async getEditProfileButton() {
    return this.page.getByRole("button", { name: /Edit Profile/i });
  }

  // Preferences tab
  async getPreferencesTabContent() {
    return this.page.locator('[data-testid="preferences-tab-content"]');
  }

  async getEmailNotificationsToggle() {
    return this.page.locator('[data-testid="email-notifications-toggle"]');
  }

  async getPushNotificationsToggle() {
    return this.page.locator('[data-testid="push-notifications-toggle"]');
  }

  async getMarketingEmailsToggle() {
    return this.page.locator('[data-testid="marketing-emails-toggle"]');
  }

  async toggleEmailNotifications() {
    const toggle = await this.getEmailNotificationsToggle();
    await toggle.click();
  }

  async togglePushNotifications() {
    const toggle = await this.getPushNotificationsToggle();
    await toggle.click();
  }

  async toggleMarketingEmails() {
    const toggle = await this.getMarketingEmailsToggle();
    await toggle.click();
  }

  // Privacy tab
  async getPrivacyTabContent() {
    return this.page.locator('[data-testid="privacy-tab-content"]');
  }

  async getProfileVisibilitySelect() {
    return this.page.locator('[data-testid="profile-visibility-select"]');
  }

  async selectProfileVisibility(
    visibility: "Public" | "Private" | "Friends Only",
  ) {
    const select = await this.getProfileVisibilitySelect();
    await select.selectOption(visibility);
  }

  async getDeleteAccountButton() {
    return this.page.getByRole("button", { name: /Delete Account/i });
  }

  async clickDeleteAccount() {
    const button = await this.getDeleteAccountButton();
    await button.click();
  }

  async getDeleteAccountDialog() {
    return this.page.locator('[data-testid="delete-account-dialog"]');
  }

  async getDeleteAccountConfirmButton() {
    return this.page.locator('[data-testid="delete-account-confirm"]');
  }

  async getDeleteAccountCancelButton() {
    return this.page.locator('[data-testid="delete-account-cancel"]');
  }

  async confirmDeleteAccount() {
    const button = await this.getDeleteAccountConfirmButton();
    await button.click();
  }

  async cancelDeleteAccount() {
    const button = await this.getDeleteAccountCancelButton();
    await button.click();
  }

  // Save settings
  async getSaveButton() {
    return this.page.getByRole("button", { name: /Save Changes/i });
  }

  async clickSave() {
    const button = await this.getSaveButton();
    await button.click();
  }

  async getSuccessMessage() {
    return this.page.locator('[data-testid="settings-success-message"]');
  }

  // Verification methods
  async verifyOnSettingsPage() {
    await expect(await this.getPageTitle()).toBeVisible();
    await expect(this.page).toHaveURL(/\/settings$/);
  }

  async verifyTabsVisible() {
    await expect(await this.getTab("Profile")).toBeVisible();
    await expect(await this.getTab("Preferences")).toBeVisible();
    await expect(await this.getTab("Privacy")).toBeVisible();
  }

  async verifyProfileTabContent() {
    await expect(await this.getProfileTabContent()).toBeVisible();
    await expect(await this.getProfileName()).toBeVisible();
    await expect(await this.getProfileEmail()).toBeVisible();
  }

  async verifyPreferencesTabContent() {
    await expect(await this.getPreferencesTabContent()).toBeVisible();
    await expect(await this.getEmailNotificationsToggle()).toBeVisible();
    await expect(await this.getPushNotificationsToggle()).toBeVisible();
  }

  async verifyPrivacyTabContent() {
    await expect(await this.getPrivacyTabContent()).toBeVisible();
    await expect(await this.getProfileVisibilitySelect()).toBeVisible();
    await expect(await this.getDeleteAccountButton()).toBeVisible();
  }

  async verifyDeleteAccountDialogVisible() {
    await expect(await this.getDeleteAccountDialog()).toBeVisible();
  }

  async verifyDeleteAccountDialogHidden() {
    await expect(await this.getDeleteAccountDialog()).not.toBeVisible();
  }

  async verifyProtectedRoute() {
    // Should redirect to home if not authenticated
    await expect(this.page).not.toHaveURL(/\/settings$/);
  }
}
