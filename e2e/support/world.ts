import type { IWorldOptions } from "@cucumber/cucumber";
import { World } from "@cucumber/cucumber";
import type { Browser, BrowserContext, Page } from "@playwright/test";
import { chromium } from "@playwright/test";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { startCoverage, stopCoverage } from "./helpers/coverage-helper";

// Load environment variables from .env.local if it exists
// Use quiet: true to suppress verbose logging in CI
if (fs.existsSync(path.resolve(process.cwd(), ".env.local"))) {
  dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
} else {
  // Fallback to .env
  dotenv.config({ quiet: true });
}

export interface CucumberWorldConstructorParams {
  parameters: { [key: string]: string; };
}

export class CustomWorld extends World {
  browser!: Browser;
  protected _context!: BrowserContext;
  protected _page!: Page;
  baseUrl: string;

  get context(): BrowserContext {
    return this._context;
  }
  set context(c: BrowserContext) {
    this._context = c;
  }
  get page(): Page {
    return this._page;
  }
  set page(p: Page) {
    this._page = p;
  }

  constructor(options: IWorldOptions) {
    super(options);
    // Use deployed URL in CI, localhost for local development
    this.baseUrl = process.env.BASE_URL || "http://localhost:3000";
  }

  /**
   * Get extra HTTP headers for E2E test authentication bypass
   */
  protected getExtraHTTPHeaders(): Record<string, string> | undefined {
    const extraHTTPHeaders: Record<string, string> = {};

    // Add E2E bypass header if secret is configured
    // Sanitize the value to remove any newlines or whitespace that could cause
    // "Invalid header value" errors in Chromium
    const e2eBypassSecret = process.env.E2E_BYPASS_SECRET?.trim().replace(/[\r\n]/g, "");
    if (e2eBypassSecret) {
      extraHTTPHeaders["x-e2e-auth-bypass"] = e2eBypassSecret;
    }

    return Object.keys(extraHTTPHeaders).length > 0 ? extraHTTPHeaders : undefined;
  }

  async init() {
    // Docker/CI environment needs additional Chromium flags for stability
    const isCI = process.env.CI === "true";
    this.browser = await chromium.launch({
      headless: process.env.HEADLESS !== "false",
      args: isCI
        ? [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage", // Prevents crashes in Docker with limited /dev/shm
          "--disable-gpu",
          "--disable-software-rasterizer",
          "--disable-extensions",
          "--disable-background-networking",
          "--disable-default-apps",
          "--no-first-run",
          "--disable-features=TranslateUI",
          // Memory optimization flags (note: --single-process removed as it causes crashes when recreating contexts)
          "--disable-accelerated-2d-canvas",
          "--disable-renderer-backgrounding",
          "--disable-backgrounding-occluded-windows",
          "--js-flags=--max-old-space-size=512",
        ]
        : [],
    });

    this.context = await this.browser.newContext({
      baseURL: this.baseUrl,
      viewport: { width: 1280, height: 900 }, // Taller viewport for sidebar visibility
      extraHTTPHeaders: this.getExtraHTTPHeaders(),
    });
    this.page = await this.context.newPage();

    // Set custom timeouts for actions and navigation
    this.page.setDefaultTimeout(15000); // Action timeout
    this.page.setDefaultNavigationTimeout(30000); // Navigation timeout

    // Start coverage collection if enabled
    await startCoverage(this.page);
  }

  /**
   * Initialize or reinitialize context with touch device support.
   * This creates a mobile viewport with hasTouch enabled for tap/swipe gestures.
   */
  async initWithTouch() {
    // Close existing page and context if they exist
    if (this.page) {
      await stopCoverage(this.page);
      await this.page.close();
    }
    if (this.context) {
      await this.context.close();
    }

    // Create new context with touch support
    this.context = await this.browser.newContext({
      baseURL: this.baseUrl,
      viewport: { width: 375, height: 667 }, // Mobile viewport
      hasTouch: true,
      extraHTTPHeaders: this.getExtraHTTPHeaders(),
    });
    this.page = await this.context.newPage();

    // Set custom timeouts for actions and navigation
    this.page.setDefaultTimeout(15000); // Action timeout
    this.page.setDefaultNavigationTimeout(30000); // Navigation timeout

    // Start coverage collection on new page
    await startCoverage(this.page);
  }

  async destroy() {
    // Stop coverage collection before closing
    if (this.page) {
      await stopCoverage(this.page);
    }

    await this.page?.close();
    await this.context?.close();
    await this.browser?.close();
  }
}

// NOTE: setWorldConstructor is NOT called here because VideoWallWorld (which extends CustomWorld)
// is set as the world constructor in video-wall-world.ts. This allows VideoWallWorld to be used
// for all scenarios, while maintaining backward compatibility with step definitions that expect CustomWorld.
