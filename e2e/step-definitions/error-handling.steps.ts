import { Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { assertTextVisible } from "../support/helpers/assertion-helper";
import { CustomWorld } from "../support/world";

Then("I should see an error page", async function(this: CustomWorld) {
  const errorPage = this.page.locator(
    '[data-testid="error-page"], .error-page, main',
  );
  await expect(errorPage).toBeVisible();
});

// NOTE: "I should see {string} message" step moved to common.steps.ts

Then(
  "I should see error code {string} displayed",
  async function(this: CustomWorld, errorCode: string) {
    await assertTextVisible(this.page, errorCode);
  },
);
