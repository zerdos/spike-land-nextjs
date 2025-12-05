import { Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { assertButtonVisible } from "../support/helpers/assertion-helper";
import { CustomWorld } from "../support/world";

Then("I should see sign-in options", async function(this: CustomWorld) {
  await assertButtonVisible(this.page, "Continue with GitHub");
  await assertButtonVisible(this.page, "Continue with Google");
});

Then("I should return to the homepage", async function(this: CustomWorld) {
  const url = new URL(this.page.url());
  expect(url.pathname).toBe("/");
});

Then("I should be on the home page", async function(this: CustomWorld) {
  const url = new URL(this.page.url());
  expect(url.pathname).toBe("/");
});
