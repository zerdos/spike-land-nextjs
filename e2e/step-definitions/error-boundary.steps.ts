import { Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { CustomWorld } from "../support/world";

// Error boundary specific steps

Then("I should see the error boundary", async function(this: CustomWorld) {
  // Look for error boundary UI elements
  const errorCard = this.page.locator('[class*="Card"]').filter({
    has: this.page.getByText(/error|went wrong/i),
  });
  await expect(errorCard.first()).toBeVisible({ timeout: 10000 });
});

Then(
  "I should see error page with title {string}",
  async function(this: CustomWorld, title: string) {
    const heading = this.page.locator("h1, h2, [class*='CardTitle']", {
      hasText: title,
    });
    await expect(heading.first()).toBeVisible();
  },
);

Then("the page should display error details", async function(this: CustomWorld) {
  // Check for Alert component with error info
  const alert = this.page.locator('[role="alert"]');
  await expect(alert.first()).toBeVisible();
});

Then(
  "the error page should have recovery options",
  async function(this: CustomWorld) {
    // Check for Try Again and Back to Home buttons
    const tryAgain = this.page.getByRole("link", { name: /try again/i })
      .or(this.page.getByRole("button", { name: /try again/i }));
    const backHome = this.page.getByRole("link", { name: /home/i })
      .or(this.page.getByRole("button", { name: /home/i }));

    await expect(tryAgain.first()).toBeVisible();
    await expect(backHome.first()).toBeVisible();
  },
);
