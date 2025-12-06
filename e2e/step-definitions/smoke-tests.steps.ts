import { Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { CustomWorld } from "../support/world";

Then("the page should load successfully", async function(this: CustomWorld) {
  await this.page.waitForLoadState("domcontentloaded");
  const title = await this.page.title();
  expect(title).toBeTruthy();
});

Then("I should see the navigation bar", async function(this: CustomWorld) {
  const nav = this.page.locator("nav");
  await expect(nav).toBeVisible();
});

Then("I should see {string} or {string} text", async function(
  this: CustomWorld,
  text1: string,
  text2: string,
) {
  const element1 = this.page.getByText(text1);
  const element2 = this.page.getByText(text2);

  const isVisible1 = await element1.isVisible().catch(() => false);
  const isVisible2 = await element2.isVisible().catch(() => false);

  expect(isVisible1 || isVisible2).toBe(true);
});

Then("I should see admin dashboard content", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
  const content = this.page.locator('h1, h2, [class*="Card"]');
  const count = await content.count();
  expect(count).toBeGreaterThan(0);
});

Then("I should be redirected to sign-in page", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
  const url = this.page.url();
  expect(url).toContain("/auth/signin");
});

Then("I should be redirected or see access denied", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
  const url = this.page.url();

  const isRedirected = url.includes("/auth/signin") || !url.includes("/admin");
  const accessDenied = await this.page.getByText(/access denied|forbidden|unauthorized/i)
    .isVisible().catch(() => false);

  expect(isRedirected || accessDenied).toBe(true);
});

Then("I should see a 404 or not found page", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");

  const notFoundText = this.page.getByText(/404|not found|page not found/i);
  const isVisible = await notFoundText.isVisible().catch(() => false);

  expect(isVisible).toBe(true);
});

Then("I should see navigation links for:", async function(this: CustomWorld, dataTable) {
  const rows = dataTable.hashes();

  for (const row of rows) {
    const linkText = row.Link;
    const link = this.page.getByRole("link", { name: new RegExp(linkText, "i") });

    const isVisible = await link.isVisible().catch(() => false);
    if (!isVisible) {
      const anyLinkWithText = this.page.getByText(new RegExp(linkText, "i"));
      await expect(anyLinkWithText).toBeVisible();
    }
  }
});

Then("I should see {string} or {string} option", async function(
  this: CustomWorld,
  option1: string,
  option2: string,
) {
  const element1 = this.page.getByText(new RegExp(option1, "i"));
  const element2 = this.page.getByText(new RegExp(option2, "i"));

  const isVisible1 = await element1.isVisible().catch(() => false);
  const isVisible2 = await element2.isVisible().catch(() => false);

  expect(isVisible1 || isVisible2).toBe(true);
});

Then("I should see footer links for:", async function(this: CustomWorld, dataTable) {
  const rows = dataTable.hashes();
  const footer = this.page.locator("footer");

  for (const row of rows) {
    const linkText = row.Link;
    const link = footer.getByRole("link", { name: new RegExp(linkText, "i") });

    const isVisible = await link.isVisible().catch(() => false);
    if (!isVisible) {
      const anyFooterLink = footer.getByText(new RegExp(linkText, "i"));
      const isTextVisible = await anyFooterLink.isVisible().catch(() => false);
      expect(isTextVisible).toBe(true);
    }
  }
});

When("I visit each main page", async function(this: CustomWorld) {
  const pages = [
    "/",
    "/pricing",
    "/enhance",
    "/settings",
    "/my-apps",
  ];

  for (const pagePath of pages) {
    await this.page.goto(`${this.baseUrl}${pagePath}`);
    await this.page.waitForLoadState("domcontentloaded");
  }
});

Then("each page should have a proper HTML title", async function(this: CustomWorld) {
  const title = await this.page.title();
  expect(title).toBeTruthy();
  expect(title.length).toBeGreaterThan(0);
});
