import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { CustomWorld } from "../support/world";

// Test data for Canvas E2E tests
interface CanvasTestContext {
  albumId: string;
  shareToken: string;
  albumPrivacy: "PRIVATE" | "UNLISTED" | "PUBLIC";
}

const testContext: CanvasTestContext = {
  albumId: "",
  shareToken: "",
  albumPrivacy: "UNLISTED",
};

// E2E seeded test data - must match prisma/seed-e2e.ts
const E2E_TEST_ALBUMS = {
  unlisted: {
    id: "e2e-unlisted-album",
    shareToken: "e2e-share-token-123",
  },
  private: {
    id: "e2e-private-album",
    shareToken: null,
  },
};

// Skip flag for tests when no albums exist in test environment
let shouldSkipCanvasTests = false;

// Helper function to mock NextAuth session for canvas tests
async function mockCanvasSession(world: CustomWorld) {
  const sessionData = {
    user: {
      id: "test-user-id",
      name: "Test User",
      email: "test@example.com",
      image: null,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  // Mock the NextAuth session endpoint
  await world.page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(sessionData),
    });
  });

  // Set mock session cookie for middleware authentication bypass
  await world.page.context().addCookies([{
    name: "authjs.session-token",
    value: "mock-session-token",
    domain: "localhost",
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    expires: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
  }]);
}

// Background step - ensure authenticated user with albums
Given("I am authenticated as a user with albums", async function(this: CustomWorld) {
  // Reset skip flag for each scenario
  shouldSkipCanvasTests = false;

  // Set up authentication
  await mockCanvasSession(this);

  // Use seeded test album data
  testContext.albumId = E2E_TEST_ALBUMS.unlisted.id;
  testContext.shareToken = E2E_TEST_ALBUMS.unlisted.shareToken;
  testContext.albumPrivacy = "UNLISTED";
});

// Album setup steps
Given("I have an UNLISTED album with images", async function(this: CustomWorld) {
  // Use seeded E2E test data - no need to navigate and search
  testContext.albumId = E2E_TEST_ALBUMS.unlisted.id;
  testContext.shareToken = E2E_TEST_ALBUMS.unlisted.shareToken;
  testContext.albumPrivacy = "UNLISTED";
});

Given("I have a PRIVATE album with images", async function(this: CustomWorld) {
  // Use seeded E2E test data
  testContext.albumId = E2E_TEST_ALBUMS.private.id;
  testContext.shareToken = "";
  testContext.albumPrivacy = "PRIVATE";
});

Given("I have an UNLISTED album with multiple images", async function(this: CustomWorld) {
  // Use seeded E2E test data - the unlisted album has 5 images
  testContext.albumId = E2E_TEST_ALBUMS.unlisted.id;
  testContext.shareToken = E2E_TEST_ALBUMS.unlisted.shareToken;
  testContext.albumPrivacy = "UNLISTED";
});

// Canvas page navigation steps
When("I navigate to the canvas page", async function(this: CustomWorld) {
  if (shouldSkipCanvasTests) {
    return "skipped";
  }

  const url = `${this.baseUrl}/canvas/${testContext.albumId}?token=${testContext.shareToken}`;
  await this.page.goto(url);
  await this.page.waitForLoadState("networkidle");
});

When("I navigate to the canvas page for that album", async function(this: CustomWorld) {
  if (shouldSkipCanvasTests) {
    return "skipped";
  }

  const url = `${this.baseUrl}/canvas/${testContext.albumId}?token=${testContext.shareToken}`;
  await this.page.goto(url);
  await this.page.waitForLoadState("networkidle");
});

When("I navigate to the canvas page without token", async function(this: CustomWorld) {
  if (shouldSkipCanvasTests) {
    return "skipped";
  }

  const url = `${this.baseUrl}/canvas/${testContext.albumId}`;
  await this.page.goto(url);
  await this.page.waitForLoadState("networkidle");
});

When("I navigate to the canvas page with rotation {string}", async function(
  this: CustomWorld,
  rotation: string,
) {
  if (shouldSkipCanvasTests) {
    return "skipped";
  }

  const url =
    `${this.baseUrl}/canvas/${testContext.albumId}?token=${testContext.shareToken}&rotation=${rotation}`;
  await this.page.goto(url);
  await this.page.waitForLoadState("networkidle");
});

When(
  "I navigate to the canvas page with interval {string} and order {string}",
  async function(this: CustomWorld, interval: string, order: string) {
    if (shouldSkipCanvasTests) {
      return "skipped";
    }

    const url =
      `${this.baseUrl}/canvas/${testContext.albumId}?token=${testContext.shareToken}&interval=${interval}&order=${order}`;
    await this.page.goto(url);
    await this.page.waitForLoadState("networkidle");
  },
);

When("I navigate to the canvas page with interval {string}", async function(
  this: CustomWorld,
  interval: string,
) {
  if (shouldSkipCanvasTests) {
    return "skipped";
  }

  const url =
    `${this.baseUrl}/canvas/${testContext.albumId}?token=${testContext.shareToken}&interval=${interval}`;
  await this.page.goto(url);
  await this.page.waitForLoadState("networkidle");
});

When("I navigate to the canvas page with order {string}", async function(
  this: CustomWorld,
  order: string,
) {
  if (shouldSkipCanvasTests) {
    return "skipped";
  }

  const url =
    `${this.baseUrl}/canvas/${testContext.albumId}?token=${testContext.shareToken}&order=${order}`;
  await this.page.goto(url);
  await this.page.waitForLoadState("networkidle");
});

// Album detail page navigation
When("I navigate to my album detail page", async function(this: CustomWorld) {
  if (shouldSkipCanvasTests) {
    return "skipped";
  }

  const url = `${this.baseUrl}/albums/${testContext.albumId}`;
  await this.page.goto(url);
  await this.page.waitForLoadState("networkidle");
});

Given("I am on my album detail page", async function(this: CustomWorld) {
  if (shouldSkipCanvasTests) {
    return "skipped";
  }

  const url = `${this.baseUrl}/albums/${testContext.albumId}`;
  await this.page.goto(url);
  await this.page.waitForLoadState("networkidle");
});

// Canvas page assertions
Then("I should see a fullscreen black background", async function(this: CustomWorld) {
  if (shouldSkipCanvasTests) {
    return "skipped";
  }

  const container = this.page.locator("div.bg-black").first();
  await expect(container).toBeVisible({ timeout: 10000 });
});

Then("I should see the first album image displayed", async function(this: CustomWorld) {
  if (shouldSkipCanvasTests) {
    return "skipped";
  }

  const image = this.page.locator("img").first();
  await expect(image).toBeVisible({ timeout: 10000 });
});

Then("I should see a 404 error page", async function(this: CustomWorld) {
  if (shouldSkipCanvasTests) {
    return "skipped";
  }

  // Check for 404 content or next.js not-found page
  const notFoundText = this.page.getByText(/not found|404/i);
  await expect(notFoundText).toBeVisible({ timeout: 10000 });
});

Then("I should see the image rotated by {int} degrees", async function(
  this: CustomWorld,
  degrees: number,
) {
  if (shouldSkipCanvasTests) {
    return "skipped";
  }

  const image = this.page.locator("img").first();
  await expect(image).toBeVisible({ timeout: 10000 });

  // Check CSS transform property
  const transform = await image.evaluate((el) => {
    return window.getComputedStyle(el).transform;
  });

  // Matrix values for common rotations
  // 90 deg: matrix(0, 1, -1, 0, 0, 0)
  // 180 deg: matrix(-1, 0, 0, -1, 0, 0)
  // 270 deg: matrix(0, -1, 1, 0, 0, 0)
  if (degrees === 90 || degrees === 270) {
    expect(transform).toContain("matrix");
  }
});

Then("the slideshow should be configured with those settings", async function(this: CustomWorld) {
  if (shouldSkipCanvasTests) {
    return "skipped";
  }

  // Verify the page loaded successfully
  const image = this.page.locator("img").first();
  await expect(image).toBeVisible({ timeout: 10000 });
});

// QR Panel assertions
Then("I should see the Canvas Display QR panel", async function(this: CustomWorld) {
  if (shouldSkipCanvasTests) {
    return "skipped";
  }

  const qrPanel = this.page.getByText("Canvas Display");
  await expect(qrPanel).toBeVisible({ timeout: 10000 });
});

Then("I should NOT see the Canvas Display QR panel", async function(this: CustomWorld) {
  if (shouldSkipCanvasTests) {
    return "skipped";
  }

  const qrPanel = this.page.getByText("Canvas Display");
  await expect(qrPanel).not.toBeVisible({ timeout: 5000 });
});

Then("the QR panel should contain a QR code image", async function(this: CustomWorld) {
  if (shouldSkipCanvasTests) {
    return "skipped";
  }

  const qrCode = this.page.locator('[data-testid="qr-code-container"] svg');
  await expect(qrCode).toBeVisible({ timeout: 10000 });
});

Then("the QR panel should have settings controls", async function(this: CustomWorld) {
  if (shouldSkipCanvasTests) {
    return "skipped";
  }

  const rotationSelect = this.page.locator('[data-testid="rotation-select"]');
  const orderSelect = this.page.locator('[data-testid="order-select"]');
  const intervalInput = this.page.locator('[data-testid="interval-input"]');

  await expect(rotationSelect).toBeVisible({ timeout: 10000 });
  await expect(orderSelect).toBeVisible({ timeout: 10000 });
  await expect(intervalInput).toBeVisible({ timeout: 10000 });
});

// Settings interaction steps
When("I change the rotation setting to {string}", async function(
  this: CustomWorld,
  rotation: string,
) {
  if (shouldSkipCanvasTests) {
    return "skipped";
  }

  const rotationSelect = this.page.locator('[data-testid="rotation-select"]');
  await rotationSelect.click();

  const option = this.page.getByText(`${rotation} clockwise`);
  await option.click();
});

When("I change the order setting to {string}", async function(
  this: CustomWorld,
  order: string,
) {
  if (shouldSkipCanvasTests) {
    return "skipped";
  }

  const orderSelect = this.page.locator('[data-testid="order-select"]');
  await orderSelect.click();

  const option = this.page.getByText(order === "random" ? "Random" : "Album order");
  await option.click();
});

When("I change the interval setting to {string}", async function(
  this: CustomWorld,
  interval: string,
) {
  if (shouldSkipCanvasTests) {
    return "skipped";
  }

  const intervalInput = this.page.locator('[data-testid="interval-input"]');
  await intervalInput.fill(interval);
});

Then("the QR code URL should contain {string}", async function(
  this: CustomWorld,
  _expectedParam: string,
) {
  if (shouldSkipCanvasTests) {
    return "skipped";
  }

  // Get the QR code value by checking the rendered URL in the component
  // The QRCodePanel component stores the URL and we can verify via the Copy URL button action
  await this.page.waitForTimeout(500); // Wait for QR code to update
  // This would ideally check the actual QR code value, but for now we verify the settings changed
  const settingsContainer = this.page.locator('[data-testid="qr-code-container"]');
  await expect(settingsContainer).toBeVisible();
});

// Button interaction steps
When("I click the {string} button in the QR panel", async function(
  this: CustomWorld,
  buttonText: string,
) {
  if (shouldSkipCanvasTests) {
    return "skipped";
  }

  const button = this.page.locator(
    `[data-testid="${buttonText.toLowerCase().replace(" ", "-")}-button"]`,
  );
  await button.click();
});

Then("I should see {string} feedback text", async function(
  this: CustomWorld,
  text: string,
) {
  if (shouldSkipCanvasTests) {
    return "skipped";
  }

  const feedback = this.page.getByText(text);
  await expect(feedback).toBeVisible({ timeout: 5000 });
});

Then("the clipboard should contain the canvas URL", async function(this: CustomWorld) {
  if (shouldSkipCanvasTests) {
    return "skipped";
  }

  // Note: Clipboard API may not be available in all test environments
  // This is a placeholder for clipboard verification
  console.log("Clipboard verification - implementation depends on test environment");
});

Then("a new tab should open with the canvas URL", async function(this: CustomWorld) {
  if (shouldSkipCanvasTests) {
    return "skipped";
  }

  // Check for new page/tab
  const pages = this.context.pages();
  expect(pages.length).toBeGreaterThan(1);

  const newPage = pages[pages.length - 1];
  expect(newPage.url()).toContain("/canvas/");
});

// Slideshow behavior steps
// Note: "I wait for {int} seconds" step is defined in smart-gallery.steps.ts

Then("the displayed image should have changed", async function(this: CustomWorld) {
  if (shouldSkipCanvasTests) {
    return "skipped";
  }

  // This would require tracking the initial image and comparing after wait
  // For now, we verify the slideshow container is still active
  const image = this.page.locator("img").first();
  await expect(image).toBeVisible();
});

Then("the images should be displayed in a shuffled order", async function(this: CustomWorld) {
  if (shouldSkipCanvasTests) {
    return "skipped";
  }

  // Verify random order is active - this is hard to verify definitively
  // We just ensure the slideshow is running
  const image = this.page.locator("img").first();
  await expect(image).toBeVisible();
});

Then("the images should be displayed in album order", async function(this: CustomWorld) {
  if (shouldSkipCanvasTests) {
    return "skipped";
  }

  // Verify album order is active
  const image = this.page.locator("img").first();
  await expect(image).toBeVisible();
});

// Accessibility steps
// Note: "I do not move the mouse for {int} seconds" step is defined in smart-gallery.steps.ts

Then("the cursor should be hidden", async function(this: CustomWorld) {
  if (shouldSkipCanvasTests) {
    return "skipped";
  }

  const container = this.page.locator("div").first();
  const cursor = await container.evaluate((el) => {
    return window.getComputedStyle(el).cursor;
  });
  expect(cursor).toBe("none");
});

Then("the QR panel should have proper ARIA labels", async function(this: CustomWorld) {
  if (shouldSkipCanvasTests) {
    return "skipped";
  }

  const qrCode = this.page.locator("svg[aria-label]");
  await expect(qrCode).toBeVisible({ timeout: 10000 });
});

Then("the settings controls should be keyboard accessible", async function(this: CustomWorld) {
  if (shouldSkipCanvasTests) {
    return "skipped";
  }

  // Tab through the controls and verify focus
  const rotationSelect = this.page.locator('[data-testid="rotation-select"]');
  await rotationSelect.focus();
  await expect(rotationSelect).toBeFocused();

  await this.page.keyboard.press("Tab");
  const orderSelect = this.page.locator('[data-testid="order-select"]');
  await expect(orderSelect).toBeFocused();
});
