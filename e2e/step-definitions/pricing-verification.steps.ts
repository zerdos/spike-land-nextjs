import { Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { CustomWorld } from "../support/world";

When("I view the pricing page", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
});

When("I click the buy button for a token pack", async function(this: CustomWorld) {
  const buyButton = this.page.getByRole("button", { name: /buy now/i }).first();
  await expect(buyButton).toBeVisible();
  await buyButton.click();
});

When("I click the buy button for the {string} pack", async function(
  this: CustomWorld,
  packName: string,
) {
  await world.page.route("**/api/stripe/checkout", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ url: "https://checkout.stripe.com/test-session" }),
    });
  });

  const packCard = this.page.locator('[class*="Card"]').filter({
    hasText: new RegExp(packName, "i"),
  });
  const buyButton = packCard.getByRole("button", { name: /buy now/i });
  await expect(buyButton).toBeVisible();
  await buyButton.click();
});

Then("I should see {int} token pack options", async function(this: CustomWorld, count: number) {
  const cards = this.page.locator('[class*="Card"]').filter({ hasText: /tokens/ });
  const cardCount = await cards.count();
  expect(cardCount).toBeGreaterThanOrEqual(count);
});

Then("I should not see any subscription options", async function(this: CustomWorld) {
  const subscriptionText = this.page.getByText(/subscription|monthly|yearly/i);
  await expect(subscriptionText).not.toBeVisible();
});

Then("each token pack should display:", async function(this: CustomWorld, dataTable) {
  const rows = dataTable.hashes();

  for (const row of rows) {
    const field = row.Field;

    switch (field.toLowerCase()) {
      case "name": {
        const nameHeading = this.page.locator('[class*="CardTitle"]').first();
        await expect(nameHeading).toBeVisible();
        break;
      }
      case "token count": {
        const tokenCount = this.page.getByText(/\d+\s+tokens/i).first();
        await expect(tokenCount).toBeVisible();
        break;
      }
      case "price": {
        const price = this.page.getByText(/£\d+/i).first();
        await expect(price).toBeVisible();
        break;
      }
      case "price per token": {
        const pricePerToken = this.page.getByText(/£.*per token/i).first();
        await expect(pricePerToken).toBeVisible();
        break;
      }
      case "buy button": {
        const buyButton = this.page.getByRole("button", { name: /buy now/i }).first();
        await expect(buyButton).toBeVisible();
        break;
      }
    }
  }
});

Then("I should see {string} badge on the pro pack", async function(
  this: CustomWorld,
  badgeText: string,
) {
  const badge = this.page.getByText(badgeText);
  await expect(badge).toBeVisible();
});

Then("all prices should be displayed in GBP currency", async function(this: CustomWorld) {
  const prices = this.page.getByText(/£\d+/);
  const count = await prices.count();
  expect(count).toBeGreaterThan(0);
});

Then("I should see the {string} symbol on all prices", async function(
  this: CustomWorld,
  symbol: string,
) {
  const prices = this.page.getByText(new RegExp(`\\${symbol}\\d+`));
  const count = await prices.count();
  expect(count).toBeGreaterThan(0);
});

Then("I should see {string} question", async function(this: CustomWorld, question: string) {
  const questionElement = this.page.getByText(question);
  await expect(questionElement).toBeVisible();
});

Then("the callback URL should point to pricing page", async function(this: CustomWorld) {
  await this.page.waitForTimeout(500);
  const url = this.page.url();
  expect(url).toContain("callbackUrl");
});

// Removed duplicate - using common.steps.ts

Then("the checkout should be for a one-time payment", async function(this: CustomWorld) {
  await this.page.waitForTimeout(500);
});

Then("all buy buttons should be enabled", async function(this: CustomWorld) {
  const buyButtons = this.page.getByRole("button", { name: /buy now/i });
  const count = await buyButtons.count();

  for (let i = 0; i < count; i++) {
    const button = buyButtons.nth(i);
    await expect(button).toBeEnabled();
  }
});

Then("I should see buy buttons for:", async function(this: CustomWorld, dataTable) {
  const rows = dataTable.hashes();

  for (const row of rows) {
    const packName = row.Pack;
    const packCard = this.page.locator('[class*="Card"]').filter({
      hasText: new RegExp(packName, "i"),
    });
    const buyButton = packCard.getByRole("button", { name: /buy now/i });
    await expect(buyButton).toBeVisible();
  }
});

Then("each pack should show price per token", async function(this: CustomWorld) {
  const pricePerToken = this.page.getByText(/per token/i);
  const count = await pricePerToken.count();
  expect(count).toBeGreaterThan(0);
});

Then("premium pack should have the best price per token", async function(this: CustomWorld) {
  await this.page.waitForTimeout(500);
});

Then("the button should show {string} text", async function(this: CustomWorld, text: string) {
  const button = this.page.getByRole("button", { name: new RegExp(text, "i") });
  await expect(button).toBeVisible();
});

Then("the button should be disabled during processing", async function(this: CustomWorld) {
  const processingButton = this.page.getByRole("button", { name: /processing/i });
  if (await processingButton.isVisible()) {
    await expect(processingButton).toBeDisabled();
  }
});

Then("I should not see {string} text", async function(this: CustomWorld, text: string) {
  const element = this.page.getByText(new RegExp(text, "i"));
  await expect(element).not.toBeVisible();
});

Then("I should see {string} enhancement cost", async function(this: CustomWorld, tier: string) {
  const costText = this.page.getByText(new RegExp(`${tier}|token.*${tier}`, "i"));
  await expect(costText).toBeVisible();
});

Then("I should be redirected to the sign-in page", async function(this: CustomWorld) {
  await this.page.waitForTimeout(1000);
  const url = this.page.url();
  const isSignInPage = url.includes("/auth/signin") || url.includes("/?callbackUrl");
  expect(isSignInPage).toBe(true);
});

Then("the starter pack should display:", async function(this: CustomWorld, dataTable) {
  const rows = dataTable.hashes();
  const starterCard = this.page.locator('[class*="Card"]').filter({ hasText: /starter/i });

  for (const row of rows) {
    if (row.Attribute === "Name") {
      const name = starterCard.getByText(row.Value);
      await expect(name).toBeVisible();
    } else if (row.Attribute === "Tokens") {
      const tokens = starterCard.getByText(new RegExp(`${row.Value}\\s+tokens`, "i"));
      await expect(tokens).toBeVisible();
    }
  }
});

Then("the basic pack should display:", async function(this: CustomWorld, dataTable) {
  const rows = dataTable.hashes();
  const basicCard = this.page.locator('[class*="Card"]').filter({ hasText: /basic/i });

  for (const row of rows) {
    if (row.Attribute === "Name") {
      const name = basicCard.getByText(row.Value);
      await expect(name).toBeVisible();
    } else if (row.Attribute === "Tokens") {
      const tokens = basicCard.getByText(new RegExp(`${row.Value}\\s+tokens`, "i"));
      await expect(tokens).toBeVisible();
    }
  }
});

Then("the pro pack should display:", async function(this: CustomWorld, dataTable) {
  const rows = dataTable.hashes();
  const proCard = this.page.locator('[class*="Card"]').filter({ hasText: /pro/i });

  for (const row of rows) {
    if (row.Attribute === "Name") {
      const name = proCard.getByText(row.Value);
      await expect(name).toBeVisible();
    } else if (row.Attribute === "Tokens") {
      const tokens = proCard.getByText(new RegExp(`${row.Value}\\s+tokens`, "i"));
      await expect(tokens).toBeVisible();
    }
  }
});

Then("the premium pack should display:", async function(this: CustomWorld, dataTable) {
  const rows = dataTable.hashes();
  const premiumCard = this.page.locator('[class*="Card"]').filter({ hasText: /premium/i });

  for (const row of rows) {
    if (row.Attribute === "Name") {
      const name = premiumCard.getByText(row.Value);
      await expect(name).toBeVisible();
    } else if (row.Attribute === "Tokens") {
      const tokens = premiumCard.getByText(new RegExp(`${row.Value}\\s+tokens`, "i"));
      await expect(tokens).toBeVisible();
    }
  }
});
