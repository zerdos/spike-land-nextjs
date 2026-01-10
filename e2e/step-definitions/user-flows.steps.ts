import { Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import type { CustomWorld } from "../support/world";

Then("I should see sign-in options", async function(this: CustomWorld) {
  // Check if we're on the home page or auth/signin page
  const currentUrl = this.page.url();
  const isOnSignInPage = currentUrl.includes("/auth/signin");

  if (isOnSignInPage) {
    // On sign-in page, OAuth buttons should be directly visible
    const githubButton = this.page.getByRole("button", { name: /continue with github/i });
    const googleButton = this.page.getByRole("button", { name: /continue with google/i });
    await expect(githubButton).toBeVisible({ timeout: 5000 });
    await expect(googleButton).toBeVisible({ timeout: 5000 });
  } else {
    // On home page, we should see Sign In link and Get Started button
    const header = this.page.locator("header");
    const signInLink = header.getByRole("link", { name: "Sign In" });
    const getStartedButton = this.page.getByRole("button", { name: /get started/i }).or(
      this.page.getByRole("link", { name: /get started/i }),
    );

    await expect(signInLink.first()).toBeVisible({ timeout: 5000 });
    await expect(getStartedButton.first()).toBeVisible({ timeout: 5000 });

    // Click the Sign In link to navigate to the sign-in page
    await signInLink.first().click();
    await this.page.waitForURL("**/auth/signin**", { timeout: 10000 });

    // Now OAuth buttons should be visible
    const githubButton = this.page.getByRole("button", { name: /continue with github/i });
    const googleButton = this.page.getByRole("button", { name: /continue with google/i });
    await expect(githubButton).toBeVisible({ timeout: 5000 });
    await expect(googleButton).toBeVisible({ timeout: 5000 });
  }
});

Then("I should return to the homepage", async function(this: CustomWorld) {
  const url = new URL(this.page.url());
  expect(url.pathname).toBe("/");
});

Then("I should be on the home page", async function(this: CustomWorld) {
  const url = new URL(this.page.url());
  expect(url.pathname).toBe("/");
});
