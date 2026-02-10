import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { TIMEOUTS, waitForElementWithRetry, waitForPageLoad } from "../helpers/retry-helper";

export class CanvasEditorPage {
  constructor(private page: Page) {}

  // Navigation
  async navigate(albumId: string, token?: string) {
    let url = `/canvas/${albumId}`;
    if (token) {
      url += `?token=${token}`;
    }
    await this.page.goto(url);
    await waitForPageLoad(this.page);
  }

  async navigateWithParams(
    albumId: string,
    params: {
      token?: string;
      rotation?: string;
      interval?: string;
      order?: string;
    },
  ) {
    const searchParams = new URLSearchParams();
    if (params.token) searchParams.set("token", params.token);
    if (params.rotation) searchParams.set("rotation", params.rotation);
    if (params.interval) searchParams.set("interval", params.interval);
    if (params.order) searchParams.set("order", params.order);

    const url = `/canvas/${albumId}?${searchParams.toString()}`;
    await this.page.goto(url);
    await waitForPageLoad(this.page);
  }

  // Canvas Container Elements
  async getCanvasContainer() {
    return this.page.locator('[data-testid="canvas-container"]').first();
  }

  async getCanvasEmpty() {
    return this.page.locator('[data-testid="canvas-empty"]');
  }

  async getAlbumTitle() {
    return this.page.locator('[data-testid="album-title"]');
  }

  async getEmptyAlbumMessage() {
    return this.page.getByText(/No images in this album/i);
  }

  // Grid Elements
  async getSmartGrid() {
    return this.page.locator('[data-testid="smart-grid"]');
  }

  async getFirstThumbnail() {
    return this.page.locator('[data-testid^="grid-thumbnail-"]').first();
  }

  async getStartSlideshowButton() {
    return this.page.locator('[data-testid="start-slideshow-button"]');
  }

  // Header / Toolbar Elements (visible in grid mode)
  async getToolbar() {
    return this.page.locator('[data-testid="canvas-toolbar"]');
  }

  // Slideshow Elements
  async getSlideshowView() {
    return this.page.locator('[data-testid="slideshow-view"]');
  }

  async getSlideshowImage() {
    return this.page.locator('[data-testid="slideshow-image"]');
  }

  async getImageCounter() {
    return this.page.locator('[data-testid="image-counter"]');
  }

  async getSlideshowControls() {
    return this.page.locator('[data-testid="slideshow-controls"]');
  }

  async getNextButton() {
    return this.page.locator('[data-testid="slideshow-next-button"]');
  }

  async getPreviousButton() {
    return this.page.locator('[data-testid="slideshow-prev-button"]');
  }

  async getExitButton() {
    return this.page.locator('[data-testid="slideshow-exit-button"]');
  }

  // Rotation Controls (in slideshow)
  async getRotateClockwiseButton() {
    return this.page.locator('[data-testid="rotate-cw-button"]');
  }

  async getRotateCounterClockwiseButton() {
    return this.page.locator('[data-testid="rotate-ccw-button"]');
  }

  // Error States
  async getImageErrorPlaceholder() {
    return this.page.locator('[data-testid="image-error-fallback"]').first();
  }

  // Floating Hint
  async getFloatingHint() {
    return this.page.locator('[data-testid="floating-hint"]');
  }

  // Actions - Thumbnail Selection
  async clickFirstThumbnail() {
    const thumbnail = await this.getFirstThumbnail();
    await expect(thumbnail).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
    await thumbnail.click();
    await this.page.waitForTimeout(300);
  }

  // Actions - Slideshow Entry
  async clickStartSlideshow() {
    const button = await this.getStartSlideshowButton();
    await expect(button).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
    await expect(button).toBeEnabled({ timeout: TIMEOUTS.DEFAULT });
    await button.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Enter slideshow by selecting first thumbnail then clicking Start Slideshow.
   */
  async enterSlideshow() {
    await this.clickFirstThumbnail();
    await this.clickStartSlideshow();
  }

  /**
   * Enter slideshow via double-tap (for touch devices).
   */
  async enterSlideshowViaDoubleTap() {
    const thumbnail = await this.getFirstThumbnail();
    await expect(thumbnail).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
    await thumbnail.dblclick();
    await this.page.waitForTimeout(500);
  }

  // Actions - Slideshow Navigation
  async clickNextButton() {
    const button = await this.getNextButton();
    await button.click();
    await this.page.waitForTimeout(300);
  }

  async clickPreviousButton() {
    const button = await this.getPreviousButton();
    await button.click();
    await this.page.waitForTimeout(300);
  }

  async pressArrowKey(direction: "left" | "right") {
    await this.page.keyboard.press(
      direction === "left" ? "ArrowLeft" : "ArrowRight",
    );
    await this.page.waitForTimeout(300);
  }

  // Actions - Rotation
  async clickRotateClockwise() {
    const button = await this.getRotateClockwiseButton();
    await button.click();
    await this.page.waitForTimeout(200);
  }

  async clickRotateCounterClockwise() {
    const button = await this.getRotateCounterClockwiseButton();
    await button.click();
    await this.page.waitForTimeout(200);
  }

  // Actions - Touch gestures (for mobile simulation)
  async swipeLeft() {
    const slideshow = await this.getSlideshowView();
    const box = await slideshow.boundingBox();
    if (box) {
      await this.page.mouse.move(
        box.x + box.width * 0.8,
        box.y + box.height / 2,
      );
      await this.page.mouse.down();
      await this.page.mouse.move(
        box.x + box.width * 0.2,
        box.y + box.height / 2,
        { steps: 10 },
      );
      await this.page.mouse.up();
    }
    await this.page.waitForTimeout(300);
  }

  async swipeRight() {
    const slideshow = await this.getSlideshowView();
    const box = await slideshow.boundingBox();
    if (box) {
      await this.page.mouse.move(
        box.x + box.width * 0.2,
        box.y + box.height / 2,
      );
      await this.page.mouse.down();
      await this.page.mouse.move(
        box.x + box.width * 0.8,
        box.y + box.height / 2,
        { steps: 10 },
      );
      await this.page.mouse.up();
    }
    await this.page.waitForTimeout(300);
  }

  // Actions - Mouse movement
  async moveMouseOverCanvas() {
    const canvas = await this.getCanvasContainer();
    const box = await canvas.boundingBox();
    if (box) {
      await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    }
  }

  async moveMouseOverSlideshow() {
    const slideshow = await this.getSlideshowView();
    const box = await slideshow.boundingBox();
    if (box) {
      await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    }
    await this.page.waitForTimeout(200);
  }

  // Verification Methods
  async verifyCanvasVisible() {
    const canvas = await this.getCanvasContainer();
    await expect(canvas).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  }

  async verifyEmptyState() {
    const empty = await this.getCanvasEmpty();
    await expect(empty).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  }

  async verifyToolbarVisible() {
    const toolbar = await this.getToolbar();
    await expect(toolbar).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  }

  async verifySlideshowVisible() {
    const slideshow = await this.getSlideshowView();
    await expect(slideshow).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  }

  async verifySlideshowNotVisible() {
    const slideshow = await this.getSlideshowView();
    await expect(slideshow).not.toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  }

  async verifySlideshowControlsVisible() {
    const controls = await this.getSlideshowControls();
    // Controls have opacity-based visibility, check CSS opacity
    await expect(controls).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
    const opacity = await controls.evaluate((el) =>
      window.getComputedStyle(el).opacity
    );
    expect(opacity).toBe("1");
  }

  async verifySlideshowControlsHidden() {
    const controls = await this.getSlideshowControls();
    // Controls use opacity-0 class when hidden, but element stays in DOM
    const opacity = await controls.evaluate((el) =>
      window.getComputedStyle(el).opacity
    );
    expect(opacity).toBe("0");
  }

  async verifyImageCounter(expected: string) {
    const counter = await this.getImageCounter();
    await expect(counter).toContainText(expected, {
      timeout: TIMEOUTS.DEFAULT,
    });
  }

  async verifyImageRotation(degrees: number) {
    const slideshow = await this.getSlideshowView();
    // The rotation is applied to a div wrapping the image
    const imageWrapper = slideshow.locator('[data-testid="slideshow-image"]').locator("..");
    const transform = await imageWrapper.evaluate((el) =>
      window.getComputedStyle(el).transform
    );
    if (degrees === 0) {
      expect(transform === "none" || transform.includes("matrix(1, 0, 0, 1"))
        .toBeTruthy();
    } else {
      expect(transform).toContain("matrix");
    }
  }

  async getDisplayedImageSrc() {
    const image = await this.getSlideshowImage();
    return image.getAttribute("src");
  }
}
