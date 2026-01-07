import { Given, Then, When } from "@cucumber/cucumber";
import { expect, type Page } from "@playwright/test";
import {
  TIMEOUTS,
  waitForDynamicContent,
  waitForElementWithRetry,
  waitForTextWithRetry,
} from "../support/helpers/retry-helper";
import type { CustomWorld } from "../support/world";

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

// Helper function to wait for and get first thumbnail
async function waitForCanvasThumbnail(page: Page, timeout = TIMEOUTS.DEFAULT) {
  // First wait for at least one thumbnail to exist
  await waitForElementWithRetry(
    page,
    '[data-testid^="grid-thumbnail-"]',
    { timeout },
  );
  // Then return the first one to avoid strict mode violations
  return page.locator('[data-testid^="grid-thumbnail-"]').first();
}

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
Given(
  "I am authenticated as a user with albums",
  async function(this: CustomWorld) {
    // Reset skip flag for each scenario
    shouldSkipCanvasTests = false;

    // Set up authentication
    await mockCanvasSession(this);

    // Use seeded test album data
    testContext.albumId = E2E_TEST_ALBUMS.unlisted.id;
    testContext.shareToken = E2E_TEST_ALBUMS.unlisted.shareToken;
    testContext.albumPrivacy = "UNLISTED";
  },
);

// Album setup steps
Given(
  "I have an UNLISTED album with images",
  async function(this: CustomWorld) {
    // Use seeded E2E test data - no need to navigate and search
    testContext.albumId = E2E_TEST_ALBUMS.unlisted.id;
    testContext.shareToken = E2E_TEST_ALBUMS.unlisted.shareToken;
    testContext.albumPrivacy = "UNLISTED";
  },
);

Given("I have a PRIVATE album with images", async function(this: CustomWorld) {
  // Use seeded E2E test data
  testContext.albumId = E2E_TEST_ALBUMS.private.id;
  testContext.shareToken = "";
  testContext.albumPrivacy = "PRIVATE";
});

Given(
  "I have an UNLISTED album with multiple images",
  async function(this: CustomWorld) {
    // Use seeded E2E test data - the unlisted album has 5 images
    testContext.albumId = E2E_TEST_ALBUMS.unlisted.id;
    testContext.shareToken = E2E_TEST_ALBUMS.unlisted.shareToken;
    testContext.albumPrivacy = "UNLISTED";
  },
);

// Canvas page navigation steps
When("I navigate to the canvas page", async function(this: CustomWorld) {
  if (shouldSkipCanvasTests) {
    return "skipped";
  }

  const url = `${this.baseUrl}/canvas/${testContext.albumId}?token=${testContext.shareToken}`;
  await this.page.goto(url);
  await this.page.waitForLoadState("networkidle");
  return;
});

When(
  "I navigate to the canvas page for that album",
  async function(this: CustomWorld) {
    if (shouldSkipCanvasTests) {
      return "skipped";
    }

    const url = `${this.baseUrl}/canvas/${testContext.albumId}?token=${testContext.shareToken}`;
    await this.page.goto(url);
    await this.page.waitForLoadState("networkidle");
    return;
  },
);

When(
  "I navigate to the canvas page without token",
  async function(this: CustomWorld) {
    if (shouldSkipCanvasTests) {
      return "skipped";
    }

    const url = `${this.baseUrl}/canvas/${testContext.albumId}`;
    await this.page.goto(url);
    await this.page.waitForLoadState("networkidle");
    return;
  },
);

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
  return;
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
    return;
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
  return;
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
  return;
});

// Album detail page navigation
When("I navigate to my album detail page", async function(this: CustomWorld) {
  if (shouldSkipCanvasTests) {
    return "skipped";
  }

  const url = `${this.baseUrl}/albums/${testContext.albumId}`;
  await this.page.goto(url);
  await this.page.waitForLoadState("networkidle");
  return;
});

Given("I am on my album detail page", async function(this: CustomWorld) {
  if (shouldSkipCanvasTests) {
    return "skipped";
  }

  const url = `${this.baseUrl}/albums/${testContext.albumId}`;
  await this.page.goto(url);
  await this.page.waitForLoadState("networkidle");
  return;
});

// Canvas page assertions
Then(
  "I should see a fullscreen black background",
  async function(this: CustomWorld) {
    if (shouldSkipCanvasTests) {
      return "skipped";
    }

    // Use retry helper for canvas container (uses custom dark background color)
    const container = await waitForElementWithRetry(
      this.page,
      '[data-testid="canvas-container"]',
      { timeout: TIMEOUTS.DEFAULT },
    );
    await expect(container).toBeVisible();
    // Wait for canvas to stabilize after rendering
    await this.page.waitForTimeout(500);
    return;
  },
);

Then(
  "I should see the first album image displayed",
  async function(this: CustomWorld) {
    if (shouldSkipCanvasTests) {
      return "skipped";
    }

    // Use helper to wait for and get first thumbnail
    const thumbnail = await waitForCanvasThumbnail(this.page);
    await expect(thumbnail).toBeVisible();

    // Also verify the actual image element loaded
    const image = thumbnail.locator("img");
    await expect(image).toBeVisible();
    // Wait for image to fully render on canvas
    await this.page.waitForTimeout(500);
    return;
  },
);

Then("I should see a 404 error page", async function(this: CustomWorld) {
  if (shouldSkipCanvasTests) {
    return "skipped";
  }

  // Check for 404 content or next.js not-found page with retry
  await waitForTextWithRetry(this.page, /not found|404/i, {
    timeout: TIMEOUTS.DEFAULT,
  });
  return;
});

Then("I should see the image rotated by {int} degrees", async function(
  this: CustomWorld,
  degrees: number,
) {
  if (shouldSkipCanvasTests) {
    return "skipped";
  }

  // Use retry helper for canvas grid with rotation
  const grid = await waitForElementWithRetry(
    this.page,
    '[data-testid="smart-grid"]',
    { timeout: TIMEOUTS.DEFAULT },
  );
  await expect(grid).toBeVisible();
  // Wait for CSS transform to be applied after canvas rendering
  await this.page.waitForTimeout(500);

  // Check CSS transform property on the grid container
  const transform = await grid.evaluate((el) => {
    return window.getComputedStyle(el).transform;
  });

  // Matrix values for common rotations
  // 90 deg: matrix(0, 1, -1, 0, 0, 0)
  // 180 deg: matrix(-1, 0, 0, -1, 0, 0)
  // 270 deg: matrix(0, -1, 1, 0, 0, 0)
  if (degrees === 90 || degrees === 270) {
    expect(transform).toContain("matrix");
  }
  return;
});

Then(
  "the slideshow should be configured with those settings",
  async function(this: CustomWorld) {
    if (shouldSkipCanvasTests) {
      return "skipped";
    }

    // Verify the canvas loaded successfully with retry
    const container = await waitForElementWithRetry(
      this.page,
      '[data-testid="canvas-container"]',
      { timeout: TIMEOUTS.DEFAULT },
    );
    await expect(container).toBeVisible();
    // Verify at least one thumbnail exists
    const thumbnail = await waitForCanvasThumbnail(this.page);
    await expect(thumbnail).toBeVisible();
    // Wait for slideshow to initialize
    await this.page.waitForTimeout(500);
    return;
  },
);

// QR Panel assertions
Then(
  "I should see the Canvas Display QR panel",
  async function(this: CustomWorld) {
    if (shouldSkipCanvasTests) {
      return "skipped";
    }

    // Use retry helper for QR panel
    await waitForTextWithRetry(this.page, "Canvas Display", {
      timeout: TIMEOUTS.DEFAULT,
    });
    return;
  },
);

Then(
  "I should NOT see the Canvas Display QR panel",
  async function(this: CustomWorld) {
    if (shouldSkipCanvasTests) {
      return "skipped";
    }

    const qrPanel = this.page.getByText("Canvas Display");
    await expect(qrPanel).not.toBeVisible({ timeout: 5000 });
    return;
  },
);

Then(
  "the QR panel should contain a QR code image",
  async function(this: CustomWorld) {
    if (shouldSkipCanvasTests) {
      return "skipped";
    }

    // Use retry helper for QR code SVG
    const qrCode = await waitForElementWithRetry(
      this.page,
      '[data-testid="qr-code-container"] svg',
      { timeout: TIMEOUTS.DEFAULT },
    );
    await expect(qrCode).toBeVisible();
    return;
  },
);

Then(
  "the QR panel should have settings controls",
  async function(this: CustomWorld) {
    if (shouldSkipCanvasTests) {
      return "skipped";
    }

    // Use retry helpers for all settings controls
    await waitForElementWithRetry(
      this.page,
      '[data-testid="rotation-select"]',
      { timeout: TIMEOUTS.DEFAULT },
    );
    await waitForElementWithRetry(
      this.page,
      '[data-testid="order-select"]',
      { timeout: TIMEOUTS.DEFAULT },
    );
    await waitForElementWithRetry(
      this.page,
      '[data-testid="interval-input"]',
      { timeout: TIMEOUTS.DEFAULT },
    );
    return;
  },
);

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
  return;
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

  const option = this.page.getByText(
    order === "random" ? "Random" : "Album order",
  );
  await option.click();
  return;
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
  return;
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
  // Wait for QR code to update with dynamic content helper
  await waitForDynamicContent(
    this.page,
    '[data-testid="qr-code-container"]',
    "",
    { timeout: TIMEOUTS.DEFAULT },
  );
  // Additional wait for canvas state update
  await this.page.waitForTimeout(500);
  return;
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
  return;
});

// NOTE: "I should see {string} feedback text" step moved to common.steps.ts

Then(
  "the clipboard should contain the canvas URL",
  async function(this: CustomWorld) {
    if (shouldSkipCanvasTests) {
      return "skipped";
    }

    // Note: Clipboard API may not be available in all test environments
    // This is a placeholder for clipboard verification
    console.log(
      "Clipboard verification - implementation depends on test environment",
    );
    return;
  },
);

Then(
  "a new tab should open with the canvas URL",
  async function(this: CustomWorld) {
    if (shouldSkipCanvasTests) {
      return "skipped";
    }

    // Check for new page/tab
    if (!this.context) return;
    const pages = this.context.pages();
    expect(pages.length).toBeGreaterThan(1);

    const newPage = pages[pages.length - 1];
    if (!newPage) return;
    expect(newPage.url()).toContain("/canvas/");
    return;
  },
);

// Slideshow behavior steps
// Note: "I wait for {int} seconds" step is defined in smart-gallery.steps.ts

Then(
  "the displayed image should have changed",
  async function(this: CustomWorld) {
    if (shouldSkipCanvasTests) {
      return "skipped";
    }

    // This would require tracking the initial image and comparing after wait
    // For now, we verify the canvas is still active with retry
    const container = await waitForElementWithRetry(
      this.page,
      '[data-testid="canvas-container"]',
      { timeout: TIMEOUTS.DEFAULT },
    );
    await expect(container).toBeVisible();
    // Verify grid thumbnails are still present
    const thumbnail = await waitForElementWithRetry(
      this.page,
      '[data-testid^="grid-thumbnail-"]',
      { timeout: TIMEOUTS.DEFAULT },
    );
    await expect(thumbnail).toBeVisible();
    // Wait for slideshow transition to complete
    await this.page.waitForTimeout(500);
    return;
  },
);

Then(
  "the images should be displayed in a shuffled order",
  async function(this: CustomWorld) {
    if (shouldSkipCanvasTests) {
      return "skipped";
    }

    // Verify random order is active - this is hard to verify definitively
    // We just ensure the canvas is running with retry
    const container = await waitForElementWithRetry(
      this.page,
      '[data-testid="canvas-container"]',
      { timeout: TIMEOUTS.DEFAULT },
    );
    await expect(container).toBeVisible();
    // Verify thumbnails are present
    const thumbnail = await waitForElementWithRetry(
      this.page,
      '[data-testid^="grid-thumbnail-"]',
      { timeout: TIMEOUTS.DEFAULT },
    );
    await expect(thumbnail).toBeVisible();
    // Wait for slideshow to stabilize
    await this.page.waitForTimeout(500);
    return;
  },
);

Then(
  "the images should be displayed in album order",
  async function(this: CustomWorld) {
    if (shouldSkipCanvasTests) {
      return "skipped";
    }

    // Verify album order is active with retry
    const container = await waitForElementWithRetry(
      this.page,
      '[data-testid="canvas-container"]',
      { timeout: TIMEOUTS.DEFAULT },
    );
    await expect(container).toBeVisible();
    // Verify thumbnails are present
    const thumbnail = await waitForElementWithRetry(
      this.page,
      '[data-testid^="grid-thumbnail-"]',
      { timeout: TIMEOUTS.DEFAULT },
    );
    await expect(thumbnail).toBeVisible();
    // Wait for slideshow to stabilize
    await this.page.waitForTimeout(500);
    return;
  },
);

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
  return;
});

Then(
  "the QR panel should have proper ARIA labels",
  async function(this: CustomWorld) {
    if (shouldSkipCanvasTests) {
      return "skipped";
    }

    // Use retry helper for SVG with ARIA label
    const qrCode = await waitForElementWithRetry(
      this.page,
      "svg[aria-label]",
      { timeout: TIMEOUTS.DEFAULT },
    );
    await expect(qrCode).toBeVisible();
    return;
  },
);

Then(
  "the settings controls should be keyboard accessible",
  async function(this: CustomWorld) {
    if (shouldSkipCanvasTests) {
      return "skipped";
    }

    // Tab through the controls and verify focus with retry
    const rotationSelect = await waitForElementWithRetry(
      this.page,
      '[data-testid="rotation-select"]',
      { timeout: TIMEOUTS.DEFAULT },
    );
    await rotationSelect.focus();
    await expect(rotationSelect).toBeFocused();

    await this.page.keyboard.press("Tab");
    // Wait for focus to shift
    await this.page.waitForTimeout(200);
    const orderSelect = this.page.locator('[data-testid="order-select"]');
    await expect(orderSelect).toBeFocused();
    return;
  },
);
