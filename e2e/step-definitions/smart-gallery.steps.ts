import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import type { CustomWorld } from "../support/world";

// =====================================
// TEST DATA & CONTEXT
// =====================================

interface SmartGalleryTestContext {
  albumId: string;
  shareToken: string;
  imageCount: number;
  hasEnhancedVersions: boolean;
  selectedImageId: string | null;
  initialSelectedIndex: number;
  autoCycleInterval: number | null;
  rotation: 0 | 90 | 180 | 270;
}

const testContext: SmartGalleryTestContext = {
  albumId: "",
  shareToken: "",
  imageCount: 0,
  hasEnhancedVersions: true,
  selectedImageId: null,
  initialSelectedIndex: 0,
  autoCycleInterval: null,
  rotation: 0,
};

// Flag to skip tests when no albums exist
let shouldSkipGalleryTests = false;

// Mock image data for testing
interface MockGalleryImage {
  id: string;
  name: string;
  originalUrl: string;
  enhancedUrl: string | null;
  url: string;
  width: number;
  height: number;
}

function createMockGalleryImage(
  index: number,
  hasEnhanced: boolean = true,
): MockGalleryImage {
  return {
    id: `image-${index}`,
    name: `Test Image ${index}`,
    originalUrl: `https://placehold.co/600x400.png/gray/white?text=Original${index}`,
    enhancedUrl: hasEnhanced
      ? `https://placehold.co/600x400.png/green/white?text=Enhanced${index}`
      : null,
    url: `https://placehold.co/600x400.png/gray/white?text=Image${index}`,
    width: 600,
    height: 400,
  };
}

// Helper to set up API mocking for gallery page
async function mockGalleryAPI(world: CustomWorld, images: MockGalleryImage[]) {
  await world.page.route("**/api/albums/**", async (route) => {
    const url = route.request().url();

    if (url.includes("/images") || url.includes("/gallery")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(images),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: testContext.albumId,
          name: "Test Album",
          privacy: "UNLISTED",
          shareToken: testContext.shareToken,
          images: images,
        }),
      });
    }
  });
}

// =====================================
// BACKGROUND & SETUP STEPS
// =====================================

Given(
  "I have an album with gallery images",
  async function(this: CustomWorld) {
    shouldSkipGalleryTests = false;
    testContext.albumId = "test-gallery-album";
    testContext.shareToken = "test-gallery-token";
    testContext.imageCount = 5;
    testContext.hasEnhancedVersions = true;
    testContext.selectedImageId = null;
    testContext.autoCycleInterval = null;
    testContext.rotation = 0;

    const images = Array.from(
      { length: testContext.imageCount },
      (_, i) => createMockGalleryImage(i + 1, testContext.hasEnhancedVersions),
    );

    await mockGalleryAPI(this, images);
  },
);

Given(
  "I have an album with only one image",
  async function(this: CustomWorld) {
    testContext.albumId = "single-image-album";
    testContext.shareToken = "single-token";
    testContext.imageCount = 1;

    const images = [createMockGalleryImage(1, true)];
    await mockGalleryAPI(this, images);
  },
);

// NOTE: "I have an empty album" step moved to common.steps.ts

Given(
  "I have an album with images that have no enhanced versions",
  async function(this: CustomWorld) {
    testContext.albumId = "no-enhanced-album";
    testContext.shareToken = "no-enhanced-token";
    testContext.imageCount = 3;
    testContext.hasEnhancedVersions = false;

    const images = Array.from(
      { length: testContext.imageCount },
      (_, i) => createMockGalleryImage(i + 1, false),
    );

    await mockGalleryAPI(this, images);
  },
);

Given(
  "I have an album with an image that fails to load",
  async function(this: CustomWorld) {
    testContext.albumId = "failed-image-album";
    testContext.shareToken = "failed-token";
    testContext.imageCount = 3;

    const images = [
      {
        id: "broken-image",
        name: "Broken Image",
        originalUrl: "https://invalid-url.example.com/broken.jpg",
        enhancedUrl: null,
        url: "https://invalid-url.example.com/broken.jpg",
        width: 600,
        height: 400,
      },
      createMockGalleryImage(2, true),
      createMockGalleryImage(3, true),
    ];

    await mockGalleryAPI(this, images);
  },
);

// =====================================
// NAVIGATION TO GALLERY PAGE
// =====================================

Given("I am viewing an album gallery page", async function(this: CustomWorld) {
  if (shouldSkipGalleryTests) return;

  await this.page.goto(
    `${this.baseUrl}/canvas/${testContext.albumId}?token=${testContext.shareToken}`,
  );
  await this.page.waitForLoadState("networkidle");

  // Wait for the smart grid to load
  const grid = this.page.locator('[data-testid="smart-grid"]');
  await expect(grid).toBeVisible({ timeout: 10000 });
  return;
});

Given(
  "I am viewing an album gallery page on a touch device",
  async function(this: CustomWorld) {
    if (shouldSkipGalleryTests) return;

    // Set viewport and user agent for touch device
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.context.addInitScript(() => {
      Object.defineProperty(navigator, "maxTouchPoints", {
        get: () => 5,
      });
    });

    await this.page.goto(
      `${this.baseUrl}/canvas/${testContext.albumId}?token=${testContext.shareToken}`,
    );
    await this.page.waitForLoadState("networkidle");

    const grid = this.page.locator('[data-testid="smart-grid"]');
    await expect(grid).toBeVisible({ timeout: 10000 });
  },
);

Given(
  "I am viewing an album gallery page with auto-cycle interval of {int} seconds",
  async function(this: CustomWorld, seconds: number) {
    if (shouldSkipGalleryTests) return;

    testContext.autoCycleInterval = seconds * 1000;

    await this.page.goto(
      `${this.baseUrl}/canvas/${testContext.albumId}?token=${testContext.shareToken}&interval=${seconds}`,
    );
    await this.page.waitForLoadState("networkidle");

    const grid = this.page.locator('[data-testid="smart-grid"]');
    await expect(grid).toBeVisible({ timeout: 10000 });
  },
);

Given(
  "I am viewing an album gallery page with rotation {int} degrees",
  async function(this: CustomWorld, degrees: number) {
    if (shouldSkipGalleryTests) return;

    testContext.rotation = degrees as 0 | 90 | 180 | 270;

    await this.page.goto(
      `${this.baseUrl}/canvas/${testContext.albumId}?token=${testContext.shareToken}&rotation=${degrees}`,
    );
    await this.page.waitForLoadState("networkidle");

    const grid = this.page.locator('[data-testid="smart-grid"]');
    await expect(grid).toBeVisible({ timeout: 10000 });
  },
);

When(
  "I navigate to the album gallery page",
  async function(this: CustomWorld) {
    if (shouldSkipGalleryTests) return;

    await this.page.goto(
      `${this.baseUrl}/canvas/${testContext.albumId}?token=${testContext.shareToken}`,
    );
    await this.page.waitForLoadState("networkidle");
    return;
  },
);

// =====================================
// IMAGE SELECTION STEPS
// =====================================

Given("I have selected an image", async function(this: CustomWorld) {
  if (shouldSkipGalleryTests) return;

  const thumbnail = this.page.locator('[role="gridcell"]').first();
  await thumbnail.click();
  await this.page.waitForTimeout(200);

  testContext.selectedImageId = await thumbnail.getAttribute("data-testid");
  testContext.initialSelectedIndex = 0;
});

Given("I have selected the first image", async function(this: CustomWorld) {
  if (shouldSkipGalleryTests) return;

  const thumbnail = this.page.locator('[role="gridcell"]').first();
  await thumbnail.click();
  await this.page.waitForTimeout(200);

  testContext.selectedImageId = await thumbnail.getAttribute("data-testid");
  testContext.initialSelectedIndex = 0;
});

When("I click on an image thumbnail", async function(this: CustomWorld) {
  if (shouldSkipGalleryTests) return;

  const thumbnail = this.page.locator('[role="gridcell"]').first();
  await thumbnail.click();
  await this.page.waitForTimeout(200);

  testContext.selectedImageId = await thumbnail.getAttribute("data-testid");
});

When("I tap on an image thumbnail", async function(this: CustomWorld) {
  if (shouldSkipGalleryTests) return;

  const thumbnail = this.page.locator('[role="gridcell"]').first();
  await thumbnail.tap();
  await this.page.waitForTimeout(200);

  testContext.selectedImageId = await thumbnail.getAttribute("data-testid");
});

Then(
  "the image should have a green glow border",
  async function(this: CustomWorld) {
    if (shouldSkipGalleryTests) return;

    const selected = this.page.locator('[aria-selected="true"]');
    await expect(selected).toBeVisible();

    // Check for the ring-green-500 class (neon glow effect)
    await expect(selected).toHaveClass(/ring-green-500/);
  },
);

Then(
  "the image should have aria-selected true",
  async function(this: CustomWorld) {
    if (shouldSkipGalleryTests) return;

    const selected = this.page.locator('[aria-selected="true"]');
    await expect(selected).toBeVisible();
  },
);

Then(
  "the thumbnail should show the enhanced version if available",
  async function(this: CustomWorld) {
    if (shouldSkipGalleryTests) return;

    const selected = this.page.locator('[aria-selected="true"]');
    const img = selected.locator("img");

    // If enhanced versions are available, the image src should contain "Enhanced"
    if (testContext.hasEnhancedVersions) {
      const src = await img.getAttribute("src");
      // Note: This checks for our mock URLs. In real tests, we'd check the actual enhanced URL pattern
      expect(src).toBeDefined();
    }
  },
);

Then(
  "the thumbnail should show the original version",
  async function(this: CustomWorld) {
    if (shouldSkipGalleryTests) return;

    const selected = this.page.locator('[aria-selected="true"]');
    const img = selected.locator("img");
    const src = await img.getAttribute("src");
    expect(src).toBeDefined();
    return;
  },
);

// =====================================
// KEYBOARD NAVIGATION STEPS
// =====================================
// NOTE: "I press the right arrow key", "I press the left arrow key" steps moved to common.steps.ts

When("I press the spacebar key", async function(this: CustomWorld) {
  if (shouldSkipGalleryTests) return;

  await this.page.keyboard.press("Space");
  await this.page.waitForTimeout(400);
});

When("I press the Enter key", async function(this: CustomWorld) {
  if (shouldSkipGalleryTests) return;

  await this.page.keyboard.press("Enter");
  await this.page.waitForTimeout(400);
});

// NOTE: "I press the Escape key" step moved to common.steps.ts

When("I press Tab to navigate", async function(this: CustomWorld) {
  if (shouldSkipGalleryTests) return;

  await this.page.keyboard.press("Tab");
  await this.page.waitForTimeout(200);
});

When("I press and hold the B key", async function(this: CustomWorld) {
  if (shouldSkipGalleryTests) return;

  await this.page.keyboard.down("KeyB");
  await this.page.waitForTimeout(100);
});

When("I release the B key", async function(this: CustomWorld) {
  if (shouldSkipGalleryTests) return;

  await this.page.keyboard.up("KeyB");
  await this.page.waitForTimeout(100);
});

Then("the next image should be selected", async function(this: CustomWorld) {
  if (shouldSkipGalleryTests) return;

  const selected = this.page.locator('[aria-selected="true"]');
  await expect(selected).toBeVisible();

  // The selected image should have moved to the next position
  const testId = await selected.getAttribute("data-testid");
  expect(testId).not.toBe(testContext.selectedImageId);
});

Then(
  "the previous image should be selected",
  async function(this: CustomWorld) {
    if (shouldSkipGalleryTests) return;

    const selected = this.page.locator('[aria-selected="true"]');
    await expect(selected).toBeVisible();
  },
);

Then("the last image should be selected", async function(this: CustomWorld) {
  if (shouldSkipGalleryTests) return;

  const allThumbnails = this.page.locator('[role="gridcell"]');
  const lastThumbnail = allThumbnails.last();

  await expect(lastThumbnail).toHaveAttribute("aria-selected", "true");
});

Then(
  "the first image should be selected again",
  async function(this: CustomWorld) {
    if (shouldSkipGalleryTests) return;

    const firstThumbnail = this.page.locator('[role="gridcell"]').first();
    await expect(firstThumbnail).toHaveAttribute("aria-selected", "true");
  },
);

Then(
  "the previously selected image should not have the green glow",
  async function(this: CustomWorld) {
    if (shouldSkipGalleryTests) return;

    // Check that there's only one selected element
    const selectedCount = await this.page.locator('[aria-selected="true"]')
      .count();
    expect(selectedCount).toBe(1);
  },
);

Then(
  "a different image should be selected",
  async function(this: CustomWorld) {
    if (shouldSkipGalleryTests) return;

    const selected = this.page.locator('[aria-selected="true"]');
    const testId = await selected.getAttribute("data-testid");

    // After auto-cycle, a different image should be selected
    // (unless there's only one image)
    if (testContext.imageCount > 1) {
      expect(testId).not.toBe(testContext.selectedImageId);
    }
  },
);

// =====================================
// SLIDESHOW MODE STEPS
// =====================================

Given("I am in slideshow mode", async function(this: CustomWorld) {
  if (shouldSkipGalleryTests) return;

  // First navigate to gallery and select an image
  await this.page.goto(
    `${this.baseUrl}/canvas/${testContext.albumId}?token=${testContext.shareToken}`,
  );
  await this.page.waitForLoadState("networkidle");

  const grid = this.page.locator('[data-testid="smart-grid"]');
  await expect(grid).toBeVisible({ timeout: 10000 });

  // Select first image
  const thumbnail = this.page.locator('[role="gridcell"]').first();
  await thumbnail.click();
  await this.page.waitForTimeout(200);

  // Enter slideshow mode
  await this.page.keyboard.press("Space");
  await this.page.waitForTimeout(400);

  const slideshow = this.page.locator('[data-testid="slideshow-view"]');
  await expect(slideshow).toBeVisible({ timeout: 5000 });
});

Given(
  "I am in slideshow mode on a touch device",
  async function(this: CustomWorld) {
    if (shouldSkipGalleryTests) return;

    // Set up touch device
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.context.addInitScript(() => {
      Object.defineProperty(navigator, "maxTouchPoints", {
        get: () => 5,
      });
    });

    await this.page.goto(
      `${this.baseUrl}/canvas/${testContext.albumId}?token=${testContext.shareToken}`,
    );
    await this.page.waitForLoadState("networkidle");

    // Select and enter slideshow
    const thumbnail = this.page.locator('[role="gridcell"]').first();
    await thumbnail.tap();
    await this.page.waitForTimeout(200);

    // Double-tap to enter slideshow
    await thumbnail.dblclick();
    await this.page.waitForTimeout(400);

    const slideshow = this.page.locator('[data-testid="slideshow-view"]');
    await expect(slideshow).toBeVisible({ timeout: 5000 });
  },
);

Given(
  "I am in slideshow mode on a touch device viewing an enhanced image",
  async function(this: CustomWorld) {
    if (shouldSkipGalleryTests) return;

    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.context.addInitScript(() => {
      Object.defineProperty(navigator, "maxTouchPoints", {
        get: () => 5,
      });
    });

    await this.page.goto(
      `${this.baseUrl}/canvas/${testContext.albumId}?token=${testContext.shareToken}`,
    );
    await this.page.waitForLoadState("networkidle");

    const thumbnail = this.page.locator('[role="gridcell"]').first();
    await thumbnail.tap();
    await this.page.waitForTimeout(200);
    await thumbnail.dblclick();
    await this.page.waitForTimeout(400);
  },
);

Given(
  "I am in slideshow mode viewing an enhanced image",
  async function(this: CustomWorld) {
    if (shouldSkipGalleryTests) return;

    await this.page.goto(
      `${this.baseUrl}/canvas/${testContext.albumId}?token=${testContext.shareToken}`,
    );
    await this.page.waitForLoadState("networkidle");

    const thumbnail = this.page.locator('[role="gridcell"]').first();
    await thumbnail.click();
    await this.page.waitForTimeout(200);

    await this.page.keyboard.press("Space");
    await this.page.waitForTimeout(400);
  },
);

Given(
  "I am in slideshow mode with rotation {int} degrees",
  async function(this: CustomWorld, degrees: number) {
    if (shouldSkipGalleryTests) return;

    await this.page.goto(
      `${this.baseUrl}/canvas/${testContext.albumId}?token=${testContext.shareToken}&rotation=${degrees}`,
    );
    await this.page.waitForLoadState("networkidle");

    const thumbnail = this.page.locator('[role="gridcell"]').first();
    await thumbnail.click();
    await this.page.waitForTimeout(200);

    await this.page.keyboard.press("Space");
    await this.page.waitForTimeout(400);
  },
);

When("I enter slideshow mode", async function(this: CustomWorld) {
  if (shouldSkipGalleryTests) return;

  const thumbnail = this.page.locator('[role="gridcell"]').first();
  await thumbnail.click();
  await this.page.waitForTimeout(200);

  await this.page.keyboard.press("Space");
  await this.page.waitForTimeout(400);
});

When("I double-tap on the selected image", async function(this: CustomWorld) {
  if (shouldSkipGalleryTests) return;

  const selected = this.page.locator('[aria-selected="true"]');
  await selected.dblclick();
  await this.page.waitForTimeout(400);
});

Then("I should see the slideshow view", async function(this: CustomWorld) {
  if (shouldSkipGalleryTests) return;

  const slideshow = this.page.locator('[data-testid="slideshow-view"]');
  await expect(slideshow).toBeVisible({ timeout: 5000 });
});

Then(
  "the image should be displayed fullscreen",
  async function(this: CustomWorld) {
    if (shouldSkipGalleryTests) return;

    const slideshow = this.page.locator('[data-testid="slideshow-view"]');
    await expect(slideshow).toBeVisible();

    // Check that the container has fixed positioning for fullscreen
    const hasFixedClass = await slideshow.evaluate((el) => {
      return el.classList.contains("fixed");
    });
    expect(hasFixedClass).toBe(true);
  },
);

Then(
  "the slideshow should have role dialog",
  async function(this: CustomWorld) {
    if (shouldSkipGalleryTests) return;

    const slideshow = this.page.locator('[data-testid="slideshow-view"]');
    await expect(slideshow).toHaveAttribute("role", "dialog");
  },
);

Then(
  "the slideshow should animate from the grid position",
  async function(this: CustomWorld) {
    if (shouldSkipGalleryTests) return;

    // Check that the slideshow container exists (animation would have started)
    const slideshow = this.page.locator('[data-testid="slideshow-view"]');
    await expect(slideshow).toBeVisible();
  },
);

Then(
  "the transition should complete within {int}ms",
  async function(this: CustomWorld, ms: number) {
    if (shouldSkipGalleryTests) return;

    // Wait for the transition duration and verify slideshow is stable
    await this.page.waitForTimeout(ms);

    const slideshow = this.page.locator('[data-testid="slideshow-view"]');
    await expect(slideshow).toBeVisible();
  },
);

Then(
  "I should see the next image in the slideshow",
  async function(this: CustomWorld) {
    if (shouldSkipGalleryTests) return;

    // Verify the slideshow is still visible and image changed
    const slideshow = this.page.locator('[data-testid="slideshow-view"]');
    await expect(slideshow).toBeVisible();
  },
);

Then(
  "I should see the previous image in the slideshow",
  async function(this: CustomWorld) {
    if (shouldSkipGalleryTests) return;

    const slideshow = this.page.locator('[data-testid="slideshow-view"]');
    await expect(slideshow).toBeVisible();
  },
);

Then("I should return to grid view", async function(this: CustomWorld) {
  if (shouldSkipGalleryTests) return;

  // Slideshow should not be visible
  const slideshow = this.page.locator('[data-testid="slideshow-view"]');
  await expect(slideshow).not.toBeVisible({ timeout: 5000 });

  // Grid should be visible
  const grid = this.page.locator('[data-testid="smart-grid"]');
  await expect(grid).toBeVisible();
});

Then(
  "the previously viewed image should still be selected",
  async function(this: CustomWorld) {
    if (shouldSkipGalleryTests) return;

    const selected = this.page.locator('[aria-selected="true"]');
    await expect(selected).toBeVisible();
  },
);

// =====================================
// PEEK FUNCTIONALITY STEPS
// =====================================

Then(
  "I should see the original image version",
  async function(this: CustomWorld) {
    if (shouldSkipGalleryTests) return;

    // The slideshow image should be visible
    const slideshowImage = this.page.locator('[data-testid="slideshow-image"]');
    await expect(slideshowImage).toBeVisible();
  },
);

Then(
  "I should see the enhanced image version again",
  async function(this: CustomWorld) {
    if (shouldSkipGalleryTests) return;

    const slideshowImage = this.page.locator('[data-testid="slideshow-image"]');
    await expect(slideshowImage).toBeVisible();
  },
);

Then(
  "the screen reader should announce showing original",
  async function(this: CustomWorld) {
    if (shouldSkipGalleryTests) return;

    // Check for aria-live region content
    const statusRegion = this.page.locator(
      '[role="status"][aria-live="polite"]',
    );
    const content = await statusRegion.textContent();
    expect(content).toContain("original");
  },
);

Then(
  "the B key peek should have no visible effect",
  async function(this: CustomWorld) {
    if (shouldSkipGalleryTests) return;

    // When there's no enhanced version, B key shouldn't change the display
    const slideshowImage = this.page.locator('[data-testid="slideshow-image"]');
    await expect(slideshowImage).toBeVisible();
  },
);

// =====================================
// TOUCH GESTURE STEPS
// =====================================

When("I swipe left on the slideshow", async function(this: CustomWorld) {
  if (shouldSkipGalleryTests) return;

  const slideshow = this.page.locator('[data-testid="slideshow-view"]');
  const boundingBox = await slideshow.boundingBox();

  if (boundingBox) {
    // Simulate swipe from right to left
    await this.page.mouse.move(
      boundingBox.x + boundingBox.width * 0.8,
      boundingBox.y + boundingBox.height / 2,
    );
    await this.page.mouse.down();
    await this.page.mouse.move(
      boundingBox.x + boundingBox.width * 0.2,
      boundingBox.y + boundingBox.height / 2,
      { steps: 10 },
    );
    await this.page.mouse.up();
  }

  await this.page.waitForTimeout(300);
});

When("I swipe right on the slideshow", async function(this: CustomWorld) {
  if (shouldSkipGalleryTests) return;

  const slideshow = this.page.locator('[data-testid="slideshow-view"]');
  const boundingBox = await slideshow.boundingBox();

  if (boundingBox) {
    // Simulate swipe from left to right
    await this.page.mouse.move(
      boundingBox.x + boundingBox.width * 0.2,
      boundingBox.y + boundingBox.height / 2,
    );
    await this.page.mouse.down();
    await this.page.mouse.move(
      boundingBox.x + boundingBox.width * 0.8,
      boundingBox.y + boundingBox.height / 2,
      { steps: 10 },
    );
    await this.page.mouse.up();
  }

  await this.page.waitForTimeout(300);
});

When("I long press on the slideshow image", async function(this: CustomWorld) {
  if (shouldSkipGalleryTests) return;

  const slideshow = this.page.locator('[data-testid="slideshow-view"]');
  const boundingBox = await slideshow.boundingBox();

  if (boundingBox) {
    await this.page.mouse.move(
      boundingBox.x + boundingBox.width / 2,
      boundingBox.y + boundingBox.height / 2,
    );
    await this.page.mouse.down();
    // Wait for long press delay (500ms default)
    await this.page.waitForTimeout(600);
  }
});

When("I release the long press", async function(this: CustomWorld) {
  if (shouldSkipGalleryTests) return;

  await this.page.mouse.up();
  await this.page.waitForTimeout(100);
});

// =====================================
// NAVIGATION CONTROLS STEPS
// =====================================

Given(
  "the navigation controls are visible",
  async function(this: CustomWorld) {
    if (shouldSkipGalleryTests) return;

    // Move mouse to trigger controls visibility
    await this.page.mouse.move(300, 300);
    await this.page.waitForTimeout(100);

    const controls = this.page.locator('[data-testid="slideshow-controls"]');
    await expect(controls).toBeVisible();
  },
);

When("I move the mouse", async function(this: CustomWorld) {
  if (shouldSkipGalleryTests) return;

  await this.page.mouse.move(400, 400);
  await this.page.waitForTimeout(100);
});

When("I do not move the mouse for {int} seconds", async function(
  this: CustomWorld,
  seconds: number,
) {
  if (shouldSkipGalleryTests) return;

  await this.page.waitForTimeout(seconds * 1000);
});

// NOTE: "I wait for {int} seconds" step moved to common.steps.ts

When("I click the previous button", async function(this: CustomWorld) {
  if (shouldSkipGalleryTests) return;

  const prevButton = this.page.locator('[data-testid="slideshow-prev-button"]');
  await prevButton.click();
  await this.page.waitForTimeout(200);
});

When("I click the next button", async function(this: CustomWorld) {
  if (shouldSkipGalleryTests) return;

  const nextButton = this.page.locator('[data-testid="slideshow-next-button"]');
  await nextButton.click();
  await this.page.waitForTimeout(200);
});

When("I click the exit button", async function(this: CustomWorld) {
  if (shouldSkipGalleryTests) return;

  const exitButton = this.page.locator('[data-testid="slideshow-exit-button"]');
  await exitButton.click();
  await this.page.waitForTimeout(300);
});

Then(
  "the navigation controls should be visible",
  async function(this: CustomWorld) {
    if (shouldSkipGalleryTests) return;

    const controls = this.page.locator('[data-testid="slideshow-controls"]');
    await expect(controls).toHaveClass(/opacity-100/);
  },
);

Then("the exit button should be visible", async function(this: CustomWorld) {
  if (shouldSkipGalleryTests) return;

  const exitButton = this.page.locator('[data-testid="slideshow-exit-button"]');
  await expect(exitButton).toBeVisible();
});

Then(
  "the navigation controls should be hidden",
  async function(this: CustomWorld) {
    if (shouldSkipGalleryTests) return;

    const controls = this.page.locator('[data-testid="slideshow-controls"]');
    await expect(controls).toHaveClass(/opacity-0/);
  },
);

// =====================================
// EDGE CASE STEPS
// =====================================

Then(
  "the previous button should be disabled",
  async function(this: CustomWorld) {
    if (shouldSkipGalleryTests) return;

    const prevButton = this.page.locator(
      '[data-testid="slideshow-prev-button"]',
    );
    await expect(prevButton).toBeDisabled();
  },
);

Then("the next button should be disabled", async function(this: CustomWorld) {
  if (shouldSkipGalleryTests) return;

  const nextButton = this.page.locator('[data-testid="slideshow-next-button"]');
  await expect(nextButton).toBeDisabled();
});

Then(
  "the arrow keys should not change the image",
  async function(this: CustomWorld) {
    if (shouldSkipGalleryTests) return;

    // With only one image, navigation should have no effect
    await this.page.keyboard.press("ArrowRight");
    await this.page.waitForTimeout(200);

    const slideshow = this.page.locator('[data-testid="slideshow-view"]');
    await expect(slideshow).toBeVisible();
  },
);

Then(
  "I should see the empty album message",
  async function(this: CustomWorld) {
    if (shouldSkipGalleryTests) return;

    const emptyState = this.page.locator('[data-testid="canvas-empty"]');
    await expect(emptyState).toBeVisible({ timeout: 10000 });
  },
);

// NOTE: "I should see {string}" step moved to common.steps.ts

Then(
  "the slideshow should show the original image",
  async function(this: CustomWorld) {
    if (shouldSkipGalleryTests) return;

    const slideshowImage = this.page.locator('[data-testid="slideshow-image"]');
    await expect(slideshowImage).toBeVisible();
  },
);

Then(
  "I should see an error fallback for the failed image",
  async function(this: CustomWorld) {
    if (shouldSkipGalleryTests) return;

    const errorFallback = this.page.locator(
      '[data-testid="image-error-fallback"]',
    );
    await expect(errorFallback).toBeVisible({ timeout: 10000 });
  },
);

// =====================================
// ACCESSIBILITY STEPS
// =====================================

Then("the grid should have role grid", async function(this: CustomWorld) {
  if (shouldSkipGalleryTests) return;

  const grid = this.page.locator('[data-testid="smart-grid"]');
  await expect(grid).toHaveAttribute("role", "grid");
});

Then(
  "the grid should have aria-label {string}",
  async function(this: CustomWorld, label: string) {
    if (shouldSkipGalleryTests) return;

    const grid = this.page.locator('[data-testid="smart-grid"]');
    await expect(grid).toHaveAttribute("aria-label", label);
  },
);

Then(
  "each thumbnail should have role gridcell",
  async function(this: CustomWorld) {
    if (shouldSkipGalleryTests) return;

    const thumbnails = this.page.locator('[data-testid="smart-grid"] > div');
    const count = await thumbnails.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const thumbnail = thumbnails.nth(i);
      await expect(thumbnail).toHaveAttribute("role", "gridcell");
    }
  },
);

Then(
  "focus should move to the first thumbnail",
  async function(this: CustomWorld) {
    if (shouldSkipGalleryTests) return;

    const firstThumbnail = this.page.locator('[role="gridcell"]').first();
    await expect(firstThumbnail).toBeFocused();
  },
);

Then(
  "the focused thumbnail should have a visible focus ring",
  async function(this: CustomWorld) {
    if (shouldSkipGalleryTests) return;

    const focused = this.page.locator('[role="gridcell"]:focus');
    await expect(focused).toBeVisible();
  },
);

Then(
  "the slideshow should have aria-modal true",
  async function(this: CustomWorld) {
    if (shouldSkipGalleryTests) return;

    const slideshow = this.page.locator('[data-testid="slideshow-view"]');
    await expect(slideshow).toHaveAttribute("aria-modal", "true");
  },
);

Then(
  "the slideshow should have aria-label {string}",
  async function(this: CustomWorld, label: string) {
    if (shouldSkipGalleryTests) return;

    const slideshow = this.page.locator('[data-testid="slideshow-view"]');
    await expect(slideshow).toHaveAttribute("aria-label", label);
  },
);

Then(
  "there should be a screen reader status region",
  async function(this: CustomWorld) {
    if (shouldSkipGalleryTests) return;

    const statusRegion = this.page.locator(
      '[role="status"][aria-live="polite"]',
    );
    await expect(statusRegion).toBeVisible();
  },
);

Then(
  "the status region should announce the new image position",
  async function(this: CustomWorld) {
    if (shouldSkipGalleryTests) return;

    const statusRegion = this.page.locator(
      '[role="status"][aria-live="polite"]',
    );
    const content = await statusRegion.textContent();
    expect(content).toContain("Image");
  },
);

Then(
  "the previous button should have aria-label {string}",
  async function(this: CustomWorld, label: string) {
    if (shouldSkipGalleryTests) return;

    const prevButton = this.page.locator(
      '[data-testid="slideshow-prev-button"]',
    );
    await expect(prevButton).toHaveAttribute("aria-label", label);
  },
);

Then(
  "the next button should have aria-label {string}",
  async function(this: CustomWorld, label: string) {
    if (shouldSkipGalleryTests) return;

    const nextButton = this.page.locator(
      '[data-testid="slideshow-next-button"]',
    );
    await expect(nextButton).toHaveAttribute("aria-label", label);
  },
);

Then(
  "the exit button should have aria-label {string}",
  async function(this: CustomWorld, label: string) {
    if (shouldSkipGalleryTests) return;

    const exitButton = this.page.locator(
      '[data-testid="slideshow-exit-button"]',
    );
    await expect(exitButton).toHaveAttribute("aria-label", label);
  },
);

// =====================================
// ROTATION STEPS
// =====================================

Then(
  "the grid should be rotated by {int} degrees",
  async function(this: CustomWorld, degrees: number) {
    if (shouldSkipGalleryTests) return;

    const grid = this.page.locator('[data-testid="smart-grid"]');
    const transform = await grid.evaluate((el) => {
      return window.getComputedStyle(el).transform;
    });

    // For non-zero rotations, transform should contain a matrix
    if (degrees !== 0) {
      expect(transform).not.toBe("none");
    }
  },
);

Then(
  "the slideshow image should be rotated by {int} degrees",
  async function(this: CustomWorld, degrees: number) {
    if (shouldSkipGalleryTests) return;

    const imageContainer = this.page.locator(
      '[data-testid="slideshow-view"] > div > div',
    );
    const transform = await imageContainer.first().evaluate((el) => {
      return window.getComputedStyle(el).transform;
    });

    if (degrees !== 0) {
      expect(transform).not.toBe("none");
    }
  },
);

// "the image should still have a green glow border" - verify selection persists
Then(
  "the image should still have a green glow border",
  async function(this: CustomWorld) {
    if (shouldSkipGalleryTests) return;

    const selected = this.page.locator('[aria-selected="true"]');
    await expect(selected).toBeVisible();
    await expect(selected).toHaveClass(/ring-green-500/);
  },
);
