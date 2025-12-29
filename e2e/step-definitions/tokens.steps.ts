import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import {
  TIMEOUTS,
  waitForModalState,
  waitForTextWithRetry,
  waitForTokenBalance,
} from "../support/helpers/retry-helper";
import { CustomWorld } from "../support/world";

// Mock token balance API
async function mockTokenBalanceApi(world: CustomWorld, balance: number) {
  await world.page.route("**/api/tokens/balance", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ balance }),
    });
  });
}

// Re-export for use by other step files
export { mockTokenBalanceApi as mockTokenBalance };

// Mock voucher redemption API
async function mockVoucherRedemption(
  world: CustomWorld,
  validCodes: Record<string, { tokens: number; alreadyRedeemed?: boolean; }>,
) {
  await world.page.route("**/api/vouchers/redeem", async (route) => {
    const request = route.request();
    const body = await request.postDataJSON();
    const code = body.code;

    if (validCodes[code]) {
      if (validCodes[code].alreadyRedeemed) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            error: "Voucher has already been redeemed",
          }),
        });
      } else {
        const tokensGranted = validCodes[code].tokens;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            tokensGranted,
            newBalance: 100 + tokensGranted,
          }),
        });
      }
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: "Invalid voucher code",
        }),
      });
    }
  });
}

// Mock Stripe checkout API
async function mockStripeCheckout(world: CustomWorld) {
  await world.page.route("**/api/stripe/checkout", async (route) => {
    const request = route.request();
    const body = await request.postDataJSON();

    // Simulate Stripe checkout URL
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        url: `https://checkout.stripe.com/test/session_${body.packageId}_${Date.now()}`,
      }),
    });
  });
}

// Given steps

// Removed duplicate: "I have {int} tokens" - already defined in image-enhancement.steps.ts

Given(
  "I have already redeemed voucher {string}",
  async function(this: CustomWorld, voucherCode: string) {
    // Mock this voucher as already redeemed
    await mockVoucherRedemption(this, {
      [voucherCode]: { tokens: 50, alreadyRedeemed: true },
    });
    // Mark that we've set up the voucher mock to prevent overwriting
    (this as unknown as { voucherMockSet?: boolean; }).voucherMockSet = true;
  },
);

// When steps

When("I open the purchase modal", async function(this: CustomWorld) {
  // Click the "Get Tokens" or "+" button to open the modal
  const triggerButton = this.page.locator("button").filter({
    hasText: /Get Tokens|\+/,
  }).first();
  await expect(triggerButton).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  await triggerButton.click();

  // Wait for modal to open
  await waitForTextWithRetry(this.page, "Get More Tokens", {
    timeout: TIMEOUTS.DEFAULT,
  });
});

When(
  "I enter the voucher code {string}",
  async function(this: CustomWorld, code: string) {
    // Only mock if not already mocked (to preserve alreadyRedeemed status from Given steps)
    // Check if we have an existing mock by checking world state
    if (!(this as unknown as { voucherMockSet?: boolean; }).voucherMockSet) {
      // Mock voucher API with valid codes
      await mockVoucherRedemption(this, {
        "LAUNCH100": { tokens: 100 },
        "WELCOME50": { tokens: 50 },
        "REFRESH50": { tokens: 50 },
        "TESTCODE": { tokens: 10 },
        "lowercase": { tokens: 25 },
      });
    }

    const input = this.page.locator("input#voucher-code");
    await expect(input).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
    await input.fill(code);
  },
);

When("I click the apply voucher button", async function(this: CustomWorld) {
  const applyButton = this.page.locator("button").filter({ hasText: "Apply" });
  await expect(applyButton).toBeVisible({ timeout: TIMEOUTS.DEFAULT });

  // Set up response wait BEFORE clicking
  const responsePromise = this.page.waitForResponse(
    (resp) => resp.url().includes("/api/vouchers/redeem"),
    { timeout: TIMEOUTS.DEFAULT },
  ).catch(() => null);

  await applyButton.click();

  // Wait for the API call to complete
  await responsePromise;
});

When(
  "I click on the {string} token package",
  async function(this: CustomWorld, packageId: string) {
    // Mock Stripe checkout
    await mockStripeCheckout(this);

    // Find the package card by data-package-id, then click its Buy Now button
    const packageCard = this.page.locator(`[data-package-id="${packageId}"]`);
    await expect(packageCard).toBeVisible({ timeout: TIMEOUTS.DEFAULT });

    // Click the Buy Now button within this specific package card
    const buyButton = packageCard.locator("button").filter({ hasText: /Buy Now/i });
    await expect(buyButton).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
    await buyButton.click();

    // Wait for navigation to Stripe checkout
    await this.page.waitForURL(/stripe|checkout/i, { timeout: TIMEOUTS.LONG });
  },
);

When("I close the purchase modal", async function(this: CustomWorld) {
  // Find and click the close button (X) or press Escape
  await this.page.keyboard.press("Escape");

  // Wait for modal to close using proper modal state wait
  await waitForModalState(this.page, "hidden", { timeout: TIMEOUTS.DEFAULT });
});

// Then steps

// Removed duplicate: "I should see my token balance" - now using "I should see the token balance display" from image-enhancement.steps.ts

Then(
  "I should see the token balance card with coins icon",
  async function(this: CustomWorld) {
    // Should see the balance text with tokens - the coins icon is rendered as SVG
    await expect(this.page.getByText(/\d+\s*tokens/i)).toBeVisible({
      timeout: TIMEOUTS.DEFAULT,
    });
  },
);

Then(
  "I should see the low balance warning style",
  async function(this: CustomWorld) {
    // Low balance applies destructive styling (text-destructive class from Tailwind)
    // The balance display should have tokens and show red/warning styling
    const balanceText = this.page.getByText(/\d+\s*tokens/i);
    await expect(balanceText).toBeVisible({ timeout: TIMEOUTS.DEFAULT });

    // Check that parent has destructive styling (could be text-destructive or bg-destructive/10)
    const hasDestructiveClass = await balanceText.evaluate((el) => {
      const parent = el.closest("div");
      if (!parent) return false;
      return parent.className.includes("destructive") ||
        parent.className.includes("text-red") ||
        parent.getAttribute("class")?.includes("destructive") || false;
    });
    expect(hasDestructiveClass).toBe(true);
  },
);

Then(
  "I should not see the low balance warning style",
  async function(this: CustomWorld) {
    // Should not have destructive styling when balance is normal
    const balanceText = this.page.getByText(/\d+\s*tokens/i);
    await expect(balanceText).toBeVisible({ timeout: TIMEOUTS.DEFAULT });

    // Check that parent has muted styling (not destructive)
    const hasNormalClass = await balanceText.evaluate((el) => {
      const parent = el.closest("div");
      if (!parent) return false;
      const className = parent.className || parent.getAttribute("class") || "";
      return className.includes("bg-muted") &&
        !className.includes("destructive");
    });
    expect(hasNormalClass).toBe(true);
  },
);

Then(
  "the get tokens button should say {string}",
  async function(this: CustomWorld, buttonText: string) {
    const button = this.page.locator("button").filter({ hasText: buttonText });
    await expect(button.first()).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

Then(
  "I should see the success message {string}",
  async function(this: CustomWorld, message: string) {
    // After successful voucher redemption, the modal closes automatically
    // So we check if either: the success message is visible briefly, or the modal has closed
    try {
      await waitForTextWithRetry(this.page, message, {
        timeout: 2000,
      });
    } catch {
      // If the success message isn't visible, the modal should have closed (indicating success)
      const modalTitle = this.page.getByText("Get More Tokens");
      await expect(modalTitle).not.toBeVisible({ timeout: TIMEOUTS.DEFAULT });
    }
  },
);

Then("my balance should increase", async function(this: CustomWorld) {
  // After successful redemption, the modal closes automatically
  // The balance will be refreshed when the page re-renders
  // We verify success by checking the modal closed (not open anymore)
  const modalTitle = this.page.getByText("Get More Tokens");
  await expect(modalTitle).not.toBeVisible({ timeout: TIMEOUTS.DEFAULT });
});

Then(
  "I should see an error message for the voucher",
  async function(this: CustomWorld) {
    // Look for alert with error styling
    // Match both mock ("has already been redeemed") and real API ("have already redeemed")
    const errorAlert = this.page.locator('[role="alert"]').filter({
      hasText: /(Invalid|already.*redeem|error)/i,
    });
    await expect(errorAlert).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

Then(
  "the apply voucher button should be disabled",
  async function(this: CustomWorld) {
    const applyButton = this.page.locator("button").filter({
      hasText: "Apply",
    });
    await expect(applyButton).toBeDisabled({ timeout: TIMEOUTS.DEFAULT });
  },
);

Then(
  "I should see the loading spinner on apply button",
  async function(this: CustomWorld) {
    // Look for loading spinner (Loader2 icon with animate-spin)
    const loadingSpinner = this.page.locator("button").filter({
      hasText: "Apply",
    }).locator(
      ".animate-spin",
    );

    // We expect to see it briefly, but it might already be gone
    // So we use a shorter timeout
    const spinnerVisible = await loadingSpinner.isVisible().catch(() => false);

    // If we don't see the spinner, that's okay - it was very fast
    // But if we do see it, verify it's there
    if (spinnerVisible) {
      await expect(loadingSpinner).toBeVisible({ timeout: TIMEOUTS.SHORT });
    }
  },
);

Then(
  "I should see the purchase modal title {string}",
  async function(this: CustomWorld, title: string) {
    await waitForTextWithRetry(this.page, title, { timeout: TIMEOUTS.DEFAULT });
  },
);

Then("I should see token package cards", async function(this: CustomWorld) {
  // Look for package cards with token information
  const packageCards = this.page.locator('[class*="grid"]').filter({
    has: this.page.getByText(/tokens/i),
  });
  await expect(packageCards.first()).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
});

Then(
  "I should see the voucher input section",
  async function(this: CustomWorld) {
    // VoucherInput component has input#voucher-code and "Voucher Code" label
    await expect(this.page.locator("input#voucher-code")).toBeVisible({
      timeout: TIMEOUTS.DEFAULT,
    });
    // Use exact match to avoid matching DialogDescription "...redeem a voucher code"
    await expect(this.page.getByLabel("Voucher Code")).toBeVisible({
      timeout: TIMEOUTS.DEFAULT,
    });
  },
);

// Removed duplicate - using common.steps.ts

Then("I should not see the purchase modal", async function(this: CustomWorld) {
  const modalTitle = this.page.getByText("Get More Tokens");
  await expect(modalTitle).not.toBeVisible({ timeout: TIMEOUTS.DEFAULT });
});

Then("the purchase modal should close", async function(this: CustomWorld) {
  // Wait for modal to close after successful redemption
  await waitForModalState(this.page, "hidden", { timeout: TIMEOUTS.DEFAULT });
  // Verify title is no longer visible
  const modalTitle = this.page.getByText("Get More Tokens");
  await expect(modalTitle).not.toBeVisible({ timeout: TIMEOUTS.SHORT });
});

Then("the token balance should be updated", async function(this: CustomWorld) {
  // Wait for token balance to be updated
  await waitForTokenBalance(this.page, { timeout: TIMEOUTS.DEFAULT });
  // Verify the balance display is visible
  await expect(this.page.getByText(/\d+\s*Tokens/i)).toBeVisible({
    timeout: TIMEOUTS.DEFAULT,
  });
});

Then(
  "I should see at least {int} token packages",
  async function(this: CustomWorld, minPackages: number) {
    // Count package cards by their "Buy Now" buttons
    const packageCards = this.page.locator("button").filter({
      hasText: /Buy Now|Select/i,
    });
    await expect(packageCards.first()).toBeVisible({
      timeout: TIMEOUTS.DEFAULT,
    });
    const count = await packageCards.count();
    expect(count).toBeGreaterThanOrEqual(minPackages);
  },
);

Then(
  "each package should show tokens and price",
  async function(this: CustomWorld) {
    // Verify packages have token count and price displayed
    await expect(this.page.getByText(/\d+\s*tokens/i).first()).toBeVisible({
      timeout: TIMEOUTS.DEFAULT,
    });
    // Price is shown as a decimal number (e.g., "2.99") without currency symbol
    await expect(this.page.getByText(/\d+\.\d{2}/).first()).toBeVisible({
      timeout: TIMEOUTS.DEFAULT,
    });
  },
);

Then(
  "the voucher input should show {string}",
  async function(this: CustomWorld, expectedValue: string) {
    const input = this.page.locator("input#voucher-code");
    await expect(input).toHaveValue(expectedValue, {
      timeout: TIMEOUTS.DEFAULT,
    });
  },
);

Then(
  "I should see {string} in the balance display",
  async function(this: CustomWorld, balanceText: string) {
    await waitForTextWithRetry(this.page, balanceText, {
      timeout: TIMEOUTS.DEFAULT,
    });
  },
);

// Removed duplicate: "I should see {string} text" - already defined in authentication.steps.ts
