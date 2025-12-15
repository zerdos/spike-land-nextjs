import { IWorldOptions, World } from "@cucumber/cucumber";
import { Browser, BrowserContext, chromium, Page } from "@playwright/test";
import { startCoverage, stopCoverage } from "./helpers/coverage-helper";

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
    this.browser = await chromium.launch({
      headless: process.env.CI === "true",
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
