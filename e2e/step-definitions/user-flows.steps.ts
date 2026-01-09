import { Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import type { CustomWorld } from "../support/world";

Then("I should see sign-in options", async function(this: CustomWorld) {
  // First check if we need to click a Sign In button to open the OAuth options
  const signInButton = this.page.getByRole("button", { name: /sign.?in/i });
  const getStartedButton = this.page.getByRole("button", { name: /get started/i });
  const githubButton = this.page.getByRole("button", { name: /continue with github/i });

  // Check if GitHub button is already visible (might be on a sign-in page)
  const isGithubVisible = await githubButton.isVisible().catch(() => false);

  if (!isGithubVisible) {
    // Try to open the sign-in options by clicking Sign In or Get Started
    const openButton = signInButton.or(getStartedButton).first();
    const canOpenModal = await openButton.isVisible().catch(() => false);

    if (canOpenModal) {
      await openButton.click();
      await this.page.waitForTimeout(500);
    }
  }

  // Now check for OAuth buttons
  await expect(githubButton).toBeVisible({ timeout: 5000 });
  await expect(
    this.page.getByRole("button", { name: /continue with google/i }),
  ).toBeVisible({ timeout: 5000 });
});

Then("I should return to the homepage", async function(this: CustomWorld) {
  const url = new URL(this.page.url());
  expect(url.pathname).toBe("/");
});

Then("I should be on the home page", async function(this: CustomWorld) {
  const url = new URL(this.page.url());
  expect(url.pathname).toBe("/");
});
