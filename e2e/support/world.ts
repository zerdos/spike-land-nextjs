import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import { Browser, BrowserContext, Page, chromium } from '@playwright/test';

export interface CucumberWorldConstructorParams {
  parameters: { [key: string]: string };
}

export class CustomWorld extends World {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  baseUrl: string;

  constructor(options: IWorldOptions) {
    super(options);
    // Use deployed URL in CI, localhost for local development
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  }

  async init() {
    this.browser = await chromium.launch({
      headless: process.env.CI === 'true',
    });
    this.context = await this.browser.newContext({
      baseURL: this.baseUrl,
    });
    this.page = await this.context.newPage();
  }

  async destroy() {
    await this.page?.close();
    await this.context?.close();
    await this.browser?.close();
  }
}

setWorldConstructor(CustomWorld);
