import type { IWorldOptions } from "@cucumber/cucumber";
import { World } from "@cucumber/cucumber";
import type { Browser, BrowserContext, Page } from "@playwright/test";
import { chromium } from "@playwright/test";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { startCoverage, stopCoverage } from "./helpers/coverage-helper";

// Load environment variables from .env.local if it exists
if (fs.existsSync(path.resolve(process.cwd(), ".env.local"))) {
  dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
} else {
  // Fallback to .env
  dotenv.config();
}

export interface CucumberWorldConstructorParams {
  parameters: { [key: string]: string; };
}

export class CustomWorld extends World {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  baseUrl: string;

  constructor(options: IWorldOptions) {
    super(options);
    // Use deployed URL in CI, localhost for local development
    this.baseUrl = process.env.BASE_URL || "http://localhost:3000";
  }

  async init() {
    // Docker/CI environment needs additional Chromium flags for stability
    const isCI = process.env.CI === "true";
    this.browser = await chromium.launch({
      headless: isCI,
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
          // Additional memory optimization flags
          "--single-process", // Run in single process mode to reduce memory
          "--disable-accelerated-2d-canvas",
          "--disable-renderer-backgrounding",
          "--disable-backgrounding-occluded-windows",
          "--js-flags=--max-old-space-size=512",
        ]
        : [],
    });

    // Prepare extra HTTP headers for E2E test authentication bypass
    const extraHTTPHeaders: Record<string, string> = {};

    // Add E2E bypass header if secret is configured
    const e2eBypassSecret = process.env.E2E_BYPASS_SECRET;
    if (e2eBypassSecret) {
      extraHTTPHeaders["x-e2e-auth-bypass"] = e2eBypassSecret;
    }

    this.context = await this.browser.newContext({
      baseURL: this.baseUrl,
      viewport: { width: 1280, height: 900 }, // Taller viewport for sidebar visibility
      extraHTTPHeaders: Object.keys(extraHTTPHeaders).length > 0
        ? extraHTTPHeaders
        : undefined,
    });
    this.page = await this.context.newPage();

    // Start coverage collection if enabled
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
