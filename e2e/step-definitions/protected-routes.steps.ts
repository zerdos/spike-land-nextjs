import { Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { assertUrlPath } from "../support/helpers/assertion-helper";
import { getCurrentUrl, getQueryParam, navigateToPath } from "../support/helpers/navigation-helper";
import { CustomWorld } from "../support/world";

When(
  "I navigate to {string}",
  async function(this: CustomWorld, path: string) {
    await navigateToPath(this.page, this.baseUrl, path);
  },
);

When(
  "I complete GitHub authentication as {string} with email {string}",
  async function(this: CustomWorld, name: string, email: string) {
    // Extract callbackUrl from current URL before switching context
    const currentUrl = new URL(this.page.url());
    const encodedCallback = currentUrl.searchParams.get("callbackUrl");
    const redirectUrl = encodedCallback
      ? decodeURIComponent(encodedCallback)
      : "/";

    // Close current context (which has no bypass header for unauthenticated flow)
    await this.page.close();
    await this.context.close();

    // Create a new context WITH the E2E bypass header (simulating authenticated user)
    const e2eBypassSecret = process.env.E2E_BYPASS_SECRET;
    const extraHTTPHeaders: Record<string, string> = {};
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

    // Set up session mock for client-side requests
    await this.page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { name, email, image: null },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }),
      });
    });

    // Navigate to the callback URL
    await this.page.goto(redirectUrl);
    await this.page.waitForLoadState("networkidle");
  },
);

When(
  "I complete Google authentication as {string} with email {string}",
  async function(this: CustomWorld, name: string, email: string) {
    // Extract callbackUrl from current URL before switching context
    const currentUrl = new URL(this.page.url());
    const encodedCallback = currentUrl.searchParams.get("callbackUrl");
    const redirectUrl = encodedCallback
      ? decodeURIComponent(encodedCallback)
      : "/";

    // Close current context (which has no bypass header for unauthenticated flow)
    await this.page.close();
    await this.context.close();

    // Create a new context WITH the E2E bypass header (simulating authenticated user)
    const e2eBypassSecret = process.env.E2E_BYPASS_SECRET;
    const extraHTTPHeaders: Record<string, string> = {};
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

    // Set up session mock for client-side requests
    await this.page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { name, email, image: null },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }),
      });
    });

    // Navigate to the callback URL
    await this.page.goto(redirectUrl);
    await this.page.waitForLoadState("networkidle");
  },
);

When("my session expires", async function(this: CustomWorld) {
  // Get current URL to navigate back to after context switch
  const currentUrl = this.page.url();
  const currentPath = new URL(currentUrl).pathname;

  // Close current page and context (which has bypass header)
  await this.page.close();
  await this.context.close();

  // Create a new context WITHOUT the E2E bypass header
  // This simulates a truly expired/unauthenticated session
  this.context = await this.browser.newContext({
    baseURL: this.baseUrl,
    // No extraHTTPHeaders - no bypass
  });
  this.page = await this.context.newPage();

  // Mock no session for client-side requests
  await this.page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(null),
    });
  });

  // Navigate back to the protected route - should redirect to home
  await this.page.goto(currentPath);
  await this.page.waitForLoadState("networkidle");
});

When(
  "I attempt to access the following protected routes:",
  async function(this: CustomWorld, dataTable: { raw: () => string[][]; }) {
    const routes = dataTable.raw().map((row) => row[0]).filter((
      r,
    ): r is string => !!r);
    this.attach(JSON.stringify({ routes }), "application/json");

    for (const route of routes) {
      await navigateToPath(this.page, this.baseUrl, route);
      // Wait for redirect to auth/signin page (proxy.ts line 228 redirects here)
      await this.page.waitForURL((url) => url.pathname === "/auth/signin", {
        timeout: 10000,
      });

      const currentUrl = await getCurrentUrl(this.page);
      const url = new URL(currentUrl);
      expect(url.pathname).toBe("/auth/signin");

      const callbackUrl = await getQueryParam(this.page, "callbackUrl");
      expect(callbackUrl).toBeTruthy();
    }
  },
);

// NOTE: "I should be redirected to {string}" and "the URL should contain {string}" steps are defined in my-apps.steps.ts and authentication.steps.ts

Then(
  "I should remain on {string}",
  async function(this: CustomWorld, expectedPath: string) {
    await this.page.waitForTimeout(300);
    await assertUrlPath(this.page, expectedPath);
  },
);

// NOTE: "I should see {string} heading" step is defined in authentication.steps.ts

Then("I should not be redirected", async function(this: CustomWorld) {
  await this.page.waitForTimeout(300);
  const currentUrl = await getCurrentUrl(this.page);
  expect(currentUrl).toContain(this.baseUrl);
});

Then(
  "all routes should redirect to home with callback URLs",
  async function(this: CustomWorld) {
    const currentUrl = await getCurrentUrl(this.page);
    const url = new URL(currentUrl);

    // Protected routes redirect to /auth/signin, not home page
    expect(url.pathname).toBe("/auth/signin");

    const callbackUrl = await getQueryParam(this.page, "callbackUrl");
    expect(callbackUrl).toBeTruthy();
  },
);

Then(
  "I should be on {string}",
  async function(this: CustomWorld, expectedPath: string) {
    // Wait for URL to stabilize (handles client-side redirects from useEffect)
    await this.page
      .waitForURL((url) => url.pathname === expectedPath, { timeout: 10000 })
      .catch(() => {});
    await assertUrlPath(this.page, expectedPath);
  },
);
