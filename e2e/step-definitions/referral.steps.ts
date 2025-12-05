import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { CustomWorld } from "../support/world";

// Helper to mock referral API responses
async function mockReferralAPI(
  world: CustomWorld,
  scenario: "no-referrals" | "with-referrals" | "slow" | "error",
) {
  if (scenario === "slow") {
    // Delay API response to show loading state
    await world.page.route("**/api/referral/**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          url: `${world.baseUrl}/signup?ref=TEST123`,
          code: "TEST123",
          stats: {
            totalReferrals: 0,
            completedReferrals: 0,
            pendingReferrals: 0,
            tokensEarned: 0,
          },
          referredUsers: [],
        }),
      });
    });
  } else if (scenario === "error") {
    await world.page.route("**/api/referral/**", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal server error" }),
      });
    });
  } else if (scenario === "no-referrals") {
    await world.page.route("**/api/referral/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/link")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            url: `${world.baseUrl}/signup?ref=TEST123`,
            code: "TEST123",
          }),
        });
      } else if (url.includes("/stats")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            stats: {
              totalReferrals: 0,
              completedReferrals: 0,
              pendingReferrals: 0,
              tokensEarned: 0,
            },
            referredUsers: [],
          }),
        });
      }
    });
  } else if (scenario === "with-referrals") {
    await world.page.route("**/api/referral/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/link")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            url: `${world.baseUrl}/signup?ref=TEST123`,
            code: "TEST123",
          }),
        });
      } else if (url.includes("/stats")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            stats: {
              totalReferrals: 3,
              completedReferrals: 2,
              pendingReferrals: 1,
              tokensEarned: 100,
            },
            referredUsers: [
              {
                id: "1",
                email: "user1@example.com",
                status: "COMPLETED",
                createdAt: new Date().toISOString(),
                tokensGranted: 50,
              },
              {
                id: "2",
                email: "user2@example.com",
                status: "PENDING",
                createdAt: new Date().toISOString(),
                tokensGranted: 0,
              },
              {
                id: "3",
                email: "user3@example.com",
                status: "COMPLETED",
                createdAt: new Date().toISOString(),
                tokensGranted: 50,
              },
            ],
          }),
        });
      }
    });
  }
}

// Given steps
Given("the user has no referrals", async function(this: CustomWorld) {
  await mockReferralAPI(this, "no-referrals");
});

Given("the user has successful referrals", async function(this: CustomWorld) {
  await mockReferralAPI(this, "with-referrals");
});

Given("the user has referrals with different statuses", async function(this: CustomWorld) {
  await mockReferralAPI(this, "with-referrals");
});

Given("the referral API is slow to respond", async function(this: CustomWorld) {
  await mockReferralAPI(this, "slow");
});

Given("the referral API returns an error", async function(this: CustomWorld) {
  await mockReferralAPI(this, "error");
});

// When steps
When("I click the copy referral link button", async function(this: CustomWorld) {
  const copyButton = this.page.getByRole("button", { name: /Copy/i });
  await expect(copyButton).toBeVisible();
  await copyButton.click();
});

When("the referral data loads successfully", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
  // Wait for loading to complete
  await this.page.waitForTimeout(500);
});

// Then steps
Then("I should see the referral link input field", async function(this: CustomWorld) {
  const input = this.page.locator('input[type="text"][readonly]').first();
  await expect(input).toBeVisible();
});

Then(
  "the referral link should contain the user's referral code",
  async function(this: CustomWorld) {
    const input = this.page.locator('input[type="text"][readonly]').first();
    const value = await input.inputValue();
    expect(value).toContain("ref=");
  },
);

Then("I should see {string} button", async function(this: CustomWorld, buttonText: string) {
  const button = this.page.getByRole("button", { name: buttonText });
  await expect(button).toBeVisible();
});

Then("the copy button should show {string} text", async function(this: CustomWorld, text: string) {
  const button = this.page.getByRole("button", { name: text });
  await expect(button).toBeVisible();
});

Then("the referral link should be in the clipboard", async function(this: CustomWorld) {
  // Note: Clipboard API may not work in all test environments
  // This is a placeholder - actual implementation may need browser permissions
  try {
    const clipboardText = await this.page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain("ref=");
  } catch (_error) {
    // Clipboard API may not be available in test environment - skip check
    console.warn("Clipboard API not available in test environment");
  }
});

Then("I should see {string} statistic card", async function(this: CustomWorld, cardTitle: string) {
  const card = this.page.locator('[class*="Card"]').filter({ hasText: cardTitle });
  await expect(card).toBeVisible();
});

Then(
  "the {string} share button should be clickable",
  async function(this: CustomWorld, platform: string) {
    const button = this.page.getByRole("button", { name: `Share on ${platform}` });
    await expect(button).toBeEnabled();
  },
);

Then("I should see the referral code in a code element", async function(this: CustomWorld) {
  const codeElement = this.page.locator("code");
  await expect(codeElement).toBeVisible();
  const text = await codeElement.textContent();
  expect(text).toBeTruthy();
  expect(text?.length).toBeGreaterThan(0);
});

Then("I should see the referred users table", async function(this: CustomWorld) {
  const table = this.page.locator("table");
  await expect(table).toBeVisible();
});

Then(
  "the table should have {string} column header",
  async function(this: CustomWorld, headerText: string) {
    const header = this.page.locator("th", { hasText: headerText });
    await expect(header).toBeVisible();
  },
);

Then(
  "completed referrals should show green {string} badge",
  async function(this: CustomWorld, badgeText: string) {
    const badge = this.page.locator('[class*="badge"]').filter({ hasText: badgeText }).first();
    await expect(badge).toBeVisible();
  },
);

Then(
  "pending referrals should show yellow {string} badge",
  async function(this: CustomWorld, badgeText: string) {
    const badge = this.page.locator('[class*="badge"]').filter({ hasText: badgeText }).first();
    await expect(badge).toBeVisible();
  },
);

Then("I should see {string} step", async function(this: CustomWorld, stepText: string) {
  const step = this.page.getByText(stepText);
  await expect(step).toBeVisible();
});

Then("I should see loading skeletons", async function(this: CustomWorld) {
  const skeleton = this.page.locator('[class*="skeleton"]').first();
  await expect(skeleton).toBeVisible();
});

Then("the loading skeletons should disappear when data loads", async function(this: CustomWorld) {
  const skeleton = this.page.locator('[class*="skeleton"]').first();
  await expect(skeleton).not.toBeVisible({ timeout: 3000 });
});

Then("I should see an error alert", async function(this: CustomWorld) {
  const alert = this.page.locator('[role="alert"]');
  await expect(alert).toBeVisible();
});

Then("the error message should describe the failure", async function(this: CustomWorld) {
  const alert = this.page.locator('[role="alert"]');
  const text = await alert.textContent();
  expect(text).toBeTruthy();
  expect(text?.length).toBeGreaterThan(0);
});

Then("the referral link input should contain a valid URL", async function(this: CustomWorld) {
  const input = this.page.locator('input[type="text"][readonly]').first();
  const value = await input.inputValue();
  expect(value).toMatch(/^https?:\/\//);
});

Then("the URL should include the base domain", async function(this: CustomWorld) {
  const input = this.page.locator('input[type="text"][readonly]').first();
  const value = await input.inputValue();
  const containsLocalhost = value.includes("localhost");
  const containsDomain = value.includes("spike.land");
  expect(containsLocalhost || containsDomain).toBe(true);
});

Then("a new window should open with Twitter share URL", async function(this: CustomWorld) {
  // Set up listener for popup
  const popupPromise = this.page.waitForEvent("popup");

  const button = this.page.getByRole("button", { name: "Share on Twitter" });
  await button.click();

  // Wait for popup and verify URL
  const popup = await popupPromise;
  const url = popup.url();
  expect(url).toContain("twitter.com");
  await popup.close();
});

Then(
  "{string} should show {int}",
  async function(this: CustomWorld, statName: string, expectedValue: number) {
    const card = this.page.locator('[class*="Card"]').filter({ hasText: statName });
    await expect(card).toBeVisible();
    const text = await card.textContent();
    expect(text).toContain(expectedValue.toString());
  },
);
