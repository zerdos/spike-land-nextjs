import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { gotoWithRetry, waitForPageReady } from "../helpers/wait-helper";

export class ProfilePage {
  constructor(private page: Page) {}

  async navigate() {
    await gotoWithRetry(this.page, "/profile");
    await waitForPageReady(this.page);
  }

  async getPageTitle() {
    return this.page.getByRole("heading", { name: /Profile/i });
  }

  async getUserName() {
    return this.page.locator('[data-testid="profile-name"]');
  }

  async getUserEmail() {
    return this.page.locator('[data-testid="profile-email"]');
  }

  async getUserId() {
    return this.page.locator('[data-testid="profile-user-id"]');
  }

  async getUserAvatar() {
    return this.page.locator('[data-testid="profile-avatar"]');
  }

  async getAvatarInitials() {
    return this.page.locator('[data-testid="profile-avatar-initials"]');
  }

  async getAvatarImage() {
    return this.page.locator('[data-testid="profile-avatar"] img');
  }

  async verifyOnProfilePage() {
    await expect(await this.getPageTitle()).toBeVisible();
    await expect(this.page).toHaveURL(/\/profile$/);
  }

  async verifyUserInfo(name: string, email: string) {
    await expect(await this.getUserName()).toHaveText(name);
    await expect(await this.getUserEmail()).toHaveText(email);
  }

  async verifyAvatarInitials(initials: string) {
    await expect(await this.getAvatarInitials()).toHaveText(initials);
  }

  async verifyAvatarImage(imageUrl: string) {
    const img = await this.getAvatarImage();
    await expect(img).toBeVisible();
    const src = await img.getAttribute("src");
    expect(src).toContain(imageUrl);
  }

  async verifyUserId() {
    const userId = await this.getUserId();
    await expect(userId).toBeVisible();
    const text = await userId.textContent();
    expect(text).toBeTruthy();
  }

  async verifyProtectedRoute() {
    // Should redirect to home if not authenticated
    await expect(this.page).not.toHaveURL(/\/profile$/);
  }
}
