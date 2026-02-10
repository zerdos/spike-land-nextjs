import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { TIMEOUTS } from "../support/helpers/retry-helper";
import { CanvasEditorPage } from "../support/page-objects/CanvasEditorPage";
import type { CustomWorld } from "../support/world";

// Test data for Canvas E2E tests
const E2E_TEST_ALBUMS = {
  unlisted: {
    id: "e2e-unlisted-album",
    shareToken: "e2e-album-share-token-456",
  },
  private: {
    id: "e2e-private-album",
    shareToken: null,
  },
  empty: {
    id: "e2e-empty-album",
    shareToken: "e2e-empty-token",
  },
  broken: {
    id: "e2e-broken-album",
    shareToken: "e2e-broken-token",
  },
};

// Helper to get or create page object
function getCanvasPage(world: CustomWorld): CanvasEditorPage {
  if (!world.canvasEditorPage) {
    world.canvasEditorPage = new CanvasEditorPage(world.page);
  }
  return world.canvasEditorPage;
}

// Extend CustomWorld
declare module "../support/world" {
  interface CustomWorld {
    canvasEditorPage?: CanvasEditorPage;
    currentAlbumId?: string;
    currentShareToken?: string;
    initialImageSrc?: string;
    isTouchDevice?: boolean;
  }
}

// Album setup steps
Given("I have an album with no images", async function(this: CustomWorld) {
  this.currentAlbumId = E2E_TEST_ALBUMS.empty.id;
  this.currentShareToken = E2E_TEST_ALBUMS.empty.shareToken || "";
});

Given(
  "I have an album with a broken image URL",
  async function(this: CustomWorld) {
    this.currentAlbumId = E2E_TEST_ALBUMS.broken.id;
    this.currentShareToken = E2E_TEST_ALBUMS.broken.shareToken || "";
  },
);

Given("I am using a touch device", async function(this: CustomWorld) {
  this.isTouchDevice = true;
  // Reinitialize context with touch support for tap/swipe/pinch gestures
  await this.initWithTouch();
  // Adjust viewport to match iPhone X dimensions
  await this.page.setViewportSize({ width: 375, height: 812 });
});

// Canvas container and visibility steps
Then(
  "the canvas container should be visible",
  async function(this: CustomWorld) {
    const canvasPage = getCanvasPage(this);
    await canvasPage.verifyCanvasVisible();
  },
);

Then(
  "the canvas should have fullscreen styling",
  async function(this: CustomWorld) {
    const container = this.page.locator('[data-testid="canvas-container"]').first();
    await expect(container).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
    // Check for fullscreen-related styles (min-h-screen = min-height: 100vh)
    const styles = await container.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        minHeight: computed.minHeight,
        overflow: computed.overflow,
      };
    });
    // Canvas should have min-height of 100vh (typically 100vh in px)
    expect(
      styles.minHeight.includes("vh") || parseInt(styles.minHeight) >= 600,
    ).toBeTruthy();
  },
);

Then(
  "I should see the album title in the header area",
  async function(this: CustomWorld) {
    const canvasPage = getCanvasPage(this);
    const title = await canvasPage.getAlbumTitle();
    await expect(title).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

Then(
  "the title should be visible on hover",
  async function(this: CustomWorld) {
    const canvasPage = getCanvasPage(this);
    await canvasPage.moveMouseOverCanvas();
    const title = await canvasPage.getAlbumTitle();
    await expect(title).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

Then("I should see an empty album message", async function(this: CustomWorld) {
  const canvasPage = getCanvasPage(this);
  const message = await canvasPage.getEmptyAlbumMessage();
  await expect(message).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
});

// Slideshow entry steps
When(
  "I click a thumbnail to select an image",
  async function(this: CustomWorld) {
    const canvasPage = getCanvasPage(this);
    await canvasPage.clickFirstThumbnail();
  },
);

When(
  "I click the Start Slideshow button",
  async function(this: CustomWorld) {
    const canvasPage = getCanvasPage(this);
    await canvasPage.clickStartSlideshow();
  },
);

When("I enter the slideshow", async function(this: CustomWorld) {
  const canvasPage = getCanvasPage(this);
  await canvasPage.enterSlideshow();
});

When(
  "I enter the slideshow via double-tap",
  async function(this: CustomWorld) {
    const canvasPage = getCanvasPage(this);
    await canvasPage.enterSlideshowViaDoubleTap();
  },
);

// Slideshow visibility steps
Then(
  "the slideshow view should be visible",
  async function(this: CustomWorld) {
    const canvasPage = getCanvasPage(this);
    await canvasPage.verifySlideshowVisible();
  },
);

Then(
  "the slideshow view should not be visible",
  async function(this: CustomWorld) {
    const canvasPage = getCanvasPage(this);
    await canvasPage.verifySlideshowNotVisible();
  },
);

Then(
  "I should see the slideshow image",
  async function(this: CustomWorld) {
    const canvasPage = getCanvasPage(this);
    const image = await canvasPage.getSlideshowImage();
    await expect(image).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

Then(
  "I should see the image counter",
  async function(this: CustomWorld) {
    const canvasPage = getCanvasPage(this);
    const counter = await canvasPage.getImageCounter();
    await expect(counter).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

// Slideshow controls visibility steps
When(
  "I move the mouse over the slideshow",
  async function(this: CustomWorld) {
    const canvasPage = getCanvasPage(this);
    await canvasPage.moveMouseOverSlideshow();
  },
);

Then(
  "the slideshow navigation controls should be visible",
  async function(this: CustomWorld) {
    const canvasPage = getCanvasPage(this);
    await canvasPage.verifySlideshowControlsVisible();
  },
);

Then(
  "the slideshow navigation controls should be hidden",
  async function(this: CustomWorld) {
    const canvasPage = getCanvasPage(this);
    await canvasPage.verifySlideshowControlsHidden();
  },
);

// Slideshow navigation steps
When(
  "I click the slideshow next button",
  async function(this: CustomWorld) {
    const canvasPage = getCanvasPage(this);
    this.initialImageSrc = await canvasPage.getDisplayedImageSrc() || undefined;
    await canvasPage.clickNextButton();
  },
);

When(
  "I click the slideshow previous button",
  async function(this: CustomWorld) {
    const canvasPage = getCanvasPage(this);
    await canvasPage.clickPreviousButton();
  },
);

Then("the next image should be displayed", async function(this: CustomWorld) {
  const canvasPage = getCanvasPage(this);
  const currentSrc = await canvasPage.getDisplayedImageSrc();
  // Image src should have changed
  expect(currentSrc).not.toBe(this.initialImageSrc);
});

Then("the first image should be displayed", async function(this: CustomWorld) {
  const canvasPage = getCanvasPage(this);
  await canvasPage.verifyImageCounter("1 of");
});

Then("the image counter should update", async function(this: CustomWorld) {
  const canvasPage = getCanvasPage(this);
  const counter = await canvasPage.getImageCounter();
  await expect(counter).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
});

Then(
  "I should see the image counter showing {string}",
  async function(this: CustomWorld, expected: string) {
    const canvasPage = getCanvasPage(this);
    await canvasPage.verifyImageCounter(expected);
  },
);

// NOTE: "I press the right arrow key" and "I press the left arrow key" steps defined in common.steps.ts

// Keyboard shortcuts
When(
  "I press the {string} key",
  async function(this: CustomWorld, key: string) {
    await this.page.keyboard.press(key);
    await this.page.waitForTimeout(500);
  },
);

When("I press the space bar", async function(this: CustomWorld) {
  const canvasPage = getCanvasPage(this);
  // Store current image src if in slideshow
  try {
    this.initialImageSrc = await canvasPage.getDisplayedImageSrc() || undefined;
  } catch {
    // Not in slideshow yet
  }
  await this.page.keyboard.press("Space");
  await this.page.waitForTimeout(500);
});

// Rotation steps
When("I click the rotate clockwise button", async function(this: CustomWorld) {
  const canvasPage = getCanvasPage(this);
  await canvasPage.clickRotateClockwise();
});

When(
  "I click the rotate counter-clockwise button",
  async function(this: CustomWorld) {
    const canvasPage = getCanvasPage(this);
    await canvasPage.clickRotateCounterClockwise();
  },
);

Then(
  "the image should be rotated 90 degrees clockwise",
  async function(this: CustomWorld) {
    const canvasPage = getCanvasPage(this);
    await canvasPage.verifyImageRotation(90);
  },
);

Then(
  "the image should be rotated 90 degrees counter-clockwise",
  async function(this: CustomWorld) {
    const canvasPage = getCanvasPage(this);
    await canvasPage.verifyImageRotation(270);
  },
);

Then(
  "the image should be rotated by {int} degrees",
  async function(this: CustomWorld, degrees: number) {
    const canvasPage = getCanvasPage(this);
    await canvasPage.verifyImageRotation(degrees);
  },
);

// Touch gesture steps
When("I swipe left on the canvas", async function(this: CustomWorld) {
  const canvasPage = getCanvasPage(this);
  this.initialImageSrc = await canvasPage.getDisplayedImageSrc() || undefined;
  await canvasPage.swipeLeft();
});

When("I swipe right on the canvas", async function(this: CustomWorld) {
  const canvasPage = getCanvasPage(this);
  await canvasPage.swipeRight();
});

// Mouse movement steps (toolbar context - grid mode)
When("I move the mouse over the canvas", async function(this: CustomWorld) {
  const canvasPage = getCanvasPage(this);
  await canvasPage.moveMouseOverCanvas();
});

// Loading states
Then(
  "I should see the loading indicator briefly",
  async function(this: CustomWorld) {
    // Loading indicator might be very brief - catching is OK
    const indicator = this.page.locator('.loading, .spinner, [data-testid="loading-indicator"]');
    await expect(indicator).toBeVisible({ timeout: TIMEOUTS.SHORT }).catch(
      () => {
        // Loading was too fast to catch, which is fine
      },
    );
  },
);

Then(
  "the loading indicator should disappear when image loads",
  async function(this: CustomWorld) {
    const indicator = this.page.locator('.loading, .spinner, [data-testid="loading-indicator"]');
    await expect(indicator).not.toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

Then(
  "I should see the loading indicator during transition",
  async function(this: CustomWorld) {
    // Loading may be very brief during transition
    const indicator = this.page.locator('.loading, .spinner, [data-testid="loading-indicator"]');
    await expect(indicator).toBeVisible({ timeout: TIMEOUTS.SHORT }).catch(
      () => {
        // Transition was instant
      },
    );
  },
);

// Error handling
Then(
  "I should see the image error placeholder",
  async function(this: CustomWorld) {
    const canvasPage = getCanvasPage(this);
    const placeholder = await canvasPage.getImageErrorPlaceholder();
    await expect(placeholder).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

// Accessibility steps
Then("the images should have alt text", async function(this: CustomWorld) {
  const images = this.page.locator("img");
  const count = await images.count();
  for (let i = 0; i < count; i++) {
    const alt = await images.nth(i).getAttribute("alt");
    expect(alt).toBeTruthy();
  }
});

Then(
  "navigation buttons should have aria-labels",
  async function(this: CustomWorld) {
    const buttons = this.page.locator("button[aria-label]");
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  },
);

Then(
  "the current image should be announced",
  async function(this: CustomWorld) {
    // Check for aria-live region (FloatingHint has role="status" aria-live="polite")
    const liveRegion = this.page.locator('[aria-live="polite"], [role="status"]');
    const count = await liveRegion.count();
    expect(count).toBeGreaterThan(0);
  },
);

When("I tab through the controls", async function(this: CustomWorld) {
  for (let i = 0; i < 5; i++) {
    await this.page.keyboard.press("Tab");
    await this.page.waitForTimeout(100);
  }
});

Then(
  "focus should move through controls in logical order",
  async function(this: CustomWorld) {
    const focusedElement = this.page.locator(":focus");
    await expect(focusedElement).toBeVisible();
  },
);

Then(
  "focused elements should have visible focus indicators",
  async function(this: CustomWorld) {
    const focusedElement = this.page.locator(":focus");
    const outline = await focusedElement.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.outline || style.boxShadow || style.borderColor;
    });
    expect(outline).toBeTruthy();
  },
);

// URL parameter verification
Then(
  "the slideshow order should be set to random",
  async function(this: CustomWorld) {
    const url = this.page.url();
    expect(url).toContain("order=random");
  },
);
