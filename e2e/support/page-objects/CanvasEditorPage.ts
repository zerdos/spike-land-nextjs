import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { TIMEOUTS, waitForPageLoad } from "../helpers/retry-helper";

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
    return this.page.locator(
      '[data-testid="canvas-container"], .canvas-container, div.bg-black',
    )
      .first();
  }

  async getMainImage() {
    return this.page.locator('[data-testid="canvas-image"], img').first();
  }

  async getAlbumTitle() {
    return this.page.locator('[data-testid="album-title"]');
  }

  async getEmptyAlbumMessage() {
    return this.page.getByText(/Add photos to your album|No images/i);
  }

  // Toolbar Elements
  async getToolbar() {
    return this.page.locator('[data-testid="canvas-toolbar"], .canvas-toolbar');
  }

  async getZoomInButton() {
    return this.page.locator(
      '[data-testid="zoom-in-button"], button[aria-label*="zoom in" i]',
    );
  }

  async getZoomOutButton() {
    return this.page.locator(
      '[data-testid="zoom-out-button"], button[aria-label*="zoom out" i]',
    );
  }

  async getResetZoomButton() {
    return this.page.locator(
      '[data-testid="reset-zoom-button"], button[aria-label*="reset" i]',
    );
  }

  async getZoomLevelIndicator() {
    return this.page.locator('[data-testid="zoom-level"]');
  }

  async getNextArrowButton() {
    return this.page.locator(
      '[data-testid="next-button"], button[aria-label*="next" i]',
    );
  }

  async getPreviousArrowButton() {
    return this.page.locator(
      '[data-testid="prev-button"], button[aria-label*="previous" i]',
    );
  }

  async getImageCounter() {
    return this.page.locator('[data-testid="image-counter"]');
  }

  async getFullscreenButton() {
    return this.page.locator(
      '[data-testid="fullscreen-button"], button[aria-label*="fullscreen" i]',
    );
  }

  async getExitFullscreenButton() {
    return this.page.locator(
      '[data-testid="exit-fullscreen-button"], button[aria-label*="exit fullscreen" i]',
    );
  }

  // Slideshow Controls
  async getPlayButton() {
    return this.page.locator(
      '[data-testid="play-button"], button[aria-label*="play" i]',
    );
  }

  async getPauseButton() {
    return this.page.locator(
      '[data-testid="pause-button"], button[aria-label*="pause" i]',
    );
  }

  async getSlideshowSettings() {
    return this.page.locator('[data-testid="slideshow-settings"]');
  }

  async getIntervalSelector() {
    return this.page.locator(
      '[data-testid="interval-selector"], [data-testid="interval-input"]',
    );
  }

  async getSlideshowControls() {
    return this.page.locator('[data-testid="slideshow-controls"]');
  }

  // Rotation Controls
  async getRotateClockwiseButton() {
    return this.page.locator(
      '[data-testid="rotate-cw-button"], button[aria-label*="clockwise" i]',
    );
  }

  async getRotateCounterClockwiseButton() {
    return this.page.locator(
      '[data-testid="rotate-ccw-button"], button[aria-label*="counter" i]',
    );
  }

  // Share Elements
  async getShareButton() {
    return this.page.locator(
      '[data-testid="share-button"], button[aria-label*="share" i]',
    );
  }

  async getShareDialog() {
    return this.page.locator('[role="dialog"]', { hasText: /share/i });
  }

  async getShareableUrl() {
    return this.page.locator('[data-testid="shareable-url"]');
  }

  async getCopyUrlButton() {
    return this.page.locator('[data-testid="copy-url-button"]');
  }

  // Loading States
  async getLoadingIndicator() {
    return this.page.locator(
      '[data-testid="loading-indicator"], .loading, .spinner',
    );
  }

  async getImageErrorPlaceholder() {
    return this.page.locator('[data-testid="image-error"], .image-error');
  }

  async getRetryButton() {
    return this.page.locator("button", { hasText: /retry/i });
  }

  // Actions - Navigation
  async clickNextArrow() {
    const button = await this.getNextArrowButton();
    await button.click();
    await this.page.waitForTimeout(300);
  }

  async clickPreviousArrow() {
    const button = await this.getPreviousArrowButton();
    await button.click();
    await this.page.waitForTimeout(300);
  }

  async pressArrowKey(direction: "left" | "right") {
    await this.page.keyboard.press(
      direction === "left" ? "ArrowLeft" : "ArrowRight",
    );
    await this.page.waitForTimeout(300);
  }

  // Actions - Zoom
  async clickZoomIn() {
    const button = await this.getZoomInButton();
    await button.click();
    await this.page.waitForTimeout(200);
  }

  async clickZoomOut() {
    const button = await this.getZoomOutButton();
    await button.click();
    await this.page.waitForTimeout(200);
  }

  async clickResetZoom() {
    const button = await this.getResetZoomButton();
    await button.click();
    await this.page.waitForTimeout(200);
  }

  async doubleClickImage() {
    const image = await this.getMainImage();
    await image.dblclick();
    await this.page.waitForTimeout(300);
  }

  // Actions - Fullscreen
  async clickFullscreen() {
    const button = await this.getFullscreenButton();
    await button.click();
    await this.page.waitForTimeout(500);
  }

  async exitFullscreen() {
    await this.page.keyboard.press("Escape");
    await this.page.waitForTimeout(500);
  }

  // Actions - Slideshow
  async clickPlaySlideshow() {
    const button = await this.getPlayButton();
    await button.click();
  }

  async clickPauseSlideshow() {
    const button = await this.getPauseButton();
    await button.click();
  }

  async openSlideshowSettings() {
    const settings = await this.getSlideshowSettings();
    if (await settings.isVisible()) {
      await settings.click();
    } else {
      // Try a settings/gear icon button
      const settingsButton = this.page.locator(
        '[data-testid="settings-button"], button[aria-label*="settings" i]',
      );
      await settingsButton.click();
    }
    await this.page.waitForTimeout(300);
  }

  async selectInterval(seconds: string) {
    const selector = await this.getIntervalSelector();
    await selector.click();
    const option = this.page.getByText(`${seconds}s`);
    await option.click();
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

  // Actions - Share
  async clickShare() {
    const button = await this.getShareButton();
    await button.click();
    await this.page.waitForTimeout(300);
  }

  async clickCopyUrl() {
    const button = await this.getCopyUrlButton();
    await button.click();
    await this.page.waitForTimeout(300);
  }

  // Actions - Touch gestures (for mobile simulation)
  async swipeLeft() {
    const canvas = await this.getCanvasContainer();
    const box = await canvas.boundingBox();
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
    const canvas = await this.getCanvasContainer();
    const box = await canvas.boundingBox();
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

  // Verification Methods
  async verifyCanvasVisible() {
    const canvas = await this.getCanvasContainer();
    await expect(canvas).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  }

  async verifyImageVisible() {
    const image = await this.getMainImage();
    await expect(image).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  }

  async verifyToolbarVisible() {
    const toolbar = await this.getToolbar();
    await expect(toolbar).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  }

  async verifyToolbarHidden() {
    const toolbar = await this.getToolbar();
    await expect(toolbar).not.toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  }

  async verifyImageCounter(expected: string) {
    const counter = await this.getImageCounter();
    await expect(counter).toContainText(expected, {
      timeout: TIMEOUTS.DEFAULT,
    });
  }

  async verifyZoomLevel(level: string) {
    const indicator = await this.getZoomLevelIndicator();
    await expect(indicator).toContainText(level, { timeout: TIMEOUTS.DEFAULT });
  }

  async verifyImageZoomed() {
    const image = await this.getMainImage();
    const transform = await image.evaluate((el) => window.getComputedStyle(el).transform);
    // Zoomed images typically have a scale transform
    expect(transform).not.toBe("none");
  }

  async verifyImageAtOriginalSize() {
    const image = await this.getMainImage();
    const transform = await image.evaluate((el) => window.getComputedStyle(el).transform);
    // Original size either has no transform or matrix(1, 0, 0, 1, 0, 0)
    expect(transform === "none" || transform.includes("matrix(1, 0, 0, 1"))
      .toBeTruthy();
  }

  async verifyImageRotation(degrees: number) {
    const image = await this.getMainImage();
    const transform = await image.evaluate((el) => window.getComputedStyle(el).transform);
    // Rotation transforms create matrix values
    if (degrees === 0) {
      expect(transform === "none" || transform.includes("matrix(1, 0, 0, 1"))
        .toBeTruthy();
    } else {
      expect(transform).toContain("matrix");
    }
  }

  async verifySlideshowRunning() {
    const pauseButton = await this.getPauseButton();
    await expect(pauseButton).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  }

  async verifySlideshowStopped() {
    const playButton = await this.getPlayButton();
    await expect(playButton).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  }

  async getDisplayedImageSrc() {
    const image = await this.getMainImage();
    return image.getAttribute("src");
  }

  async verifyShareDialogVisible() {
    const dialog = await this.getShareDialog();
    await expect(dialog).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  }
}
