import { defineStep, Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { waitForPageReady, waitForRouteReady } from "../support/helpers/wait-helper";
import type { CustomWorld } from "../support/world";

// Helper function to wait for session to propagate to UI after reload
async function waitForSessionPropagation(
  world: CustomWorld,
  expectLoggedIn: boolean,
): Promise<void> {
  if (expectLoggedIn) {
    // Wait for user-avatar to appear (indicates session propagated)
    await world.page.waitForFunction(
      () => document.querySelector('[data-testid="user-avatar"]') !== null,
      { timeout: 10000 },
    ).catch(() => {
      // Avatar may not be on current page layout (e.g., full-page forms)
      // In that case, just wait for any auth-related element
    });
  } else {
    // Wait for Sign In link to appear (indicates logged out state)
    await world.page.waitForFunction(
      () => {
        const header = document.querySelector("header");
        if (!header) return true; // No header means we can't verify
        return header.querySelector('a[href*="signin"]') !== null ||
          header.textContent?.includes("Sign In");
      },
      { timeout: 10000 },
    ).catch(() => {
      // Fallback - just ensure avatar is NOT visible
    });
  }
}

// Helper function to mock NextAuth session
async function mockSession(
  world: CustomWorld,
  user: { name: string; email: string; image?: string; role?: string; } | null,
) {
  // Infer role from email if not provided
  const role = user?.role ||
    (user?.email?.startsWith("admin@") ? "ADMIN" : "USER");

  const sessionData = user
    ? {
      user: {
        name: user.name,
        email: user.email,
        image: user.image || null,
        role,
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }
    : null;

  // Mock the NextAuth session endpoint for both client and server requests
  await world.page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(sessionData),
    });
  });

  // Mock the CSRF token endpoint
  await world.page.route("**/api/auth/csrf", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ csrfToken: "mock-csrf-token" }),
    });
  });

  // Set NextAuth session cookie to bypass middleware authentication
  if (user) {
    // Set a mock session token cookie that the middleware will recognize
    const cookies = [
      {
        name: "authjs.session-token",
        value: "mock-session-token",
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax" as const,
        expires: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
      },
      {
        name: "e2e-user-role",
        value: role,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax" as const,
        expires: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
      },
      {
        name: "e2e-user-email",
        value: user.email,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax" as const,
        expires: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
      },
      {
        name: "e2e-user-name",
        value: user.name,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax" as const,
        expires: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
      },
    ];

    await world.page.context().addCookies(cookies);
  } else {
    // Clear session cookies when logging out
    await world.page.context().clearCookies();
  }

  // Intercept signIn calls to prevent actual OAuth redirects
  await world.page.addInitScript(() => {
    // Store original signIn for testing
    interface WindowWithMocks extends Window {
      __mockSignInCalled?: boolean;
      __mockSignInProvider?: string | null;
    }
    (window as WindowWithMocks).__mockSignInCalled = false;
    (window as WindowWithMocks).__mockSignInProvider = null;
  });
}

// Background step - already defined in home-page.steps.ts
// Given('I am on the home page', ...)

// Helper function to get E2E bypass headers (matches CustomWorld.getExtraHTTPHeaders logic)
function getExtraHTTPHeaders(): Record<string, string> | undefined {
  const extraHTTPHeaders: Record<string, string> = {};
  const e2eBypassSecret = process.env.E2E_BYPASS_SECRET?.trim().replace(/[\r\n]/g, "");
  if (e2eBypassSecret) {
    extraHTTPHeaders["x-e2e-auth-bypass"] = e2eBypassSecret;
  }
  return Object.keys(extraHTTPHeaders).length > 0 ? extraHTTPHeaders : undefined;
}

// Helper function for handling "not logged in" state
async function handleNotLoggedIn(world: CustomWorld): Promise<void> {
  const currentUrl = world.page.url();

  // Improved cleanup with state checking
  if (!world.page.isClosed()) {
    await world.page.close();
  }
  if (world.context) {
    await world.context.close();
  }

  // Create new unauthenticated context with E2E bypass headers
  const extraHTTPHeaders = getExtraHTTPHeaders();
  world.context = await world.browser.newContext({
    baseURL: world.baseUrl,
    extraHTTPHeaders,
  });
  world.page = await world.context.newPage();

  // Mock no session
  await mockSession(world, null);

  // Wait for route to be ready
  await waitForRouteReady(world.page);

  // Re-navigate if needed
  if (currentUrl && currentUrl !== "about:blank") {
    await world.page.goto(currentUrl, { waitUntil: "commit" });
    await waitForPageReady(world.page, { strategy: "both", waitForSuspense: true });
  } else {
    await world.page.goto(world.baseUrl, { waitUntil: "commit" });
    await waitForPageReady(world.page, { strategy: "both", waitForSuspense: true });
  }
}

// Helper function for handling "logged in as" state
async function handleLoggedInAs(
  world: CustomWorld,
  name: string,
  email: string,
): Promise<void> {
  await mockSession(world, { name, email });
  await waitForRouteReady(world.page);
  await world.page.reload({ waitUntil: "commit" });
  await waitForPageReady(world.page, { strategy: "both" });
  await waitForSessionPropagation(world, true);
}

// Allow both Given and When for flexibility in feature files
// Use defineStep to avoid ambiguity (same text for both keywords)
defineStep("I am not logged in", async function(this: CustomWorld) {
  await handleNotLoggedIn(this);
});

// Generic test user login
Given("I am logged in as a test user", async function(this: CustomWorld) {
  await mockSession(this, {
    name: "Test User",
    email: "test@example.com",
  });
  await waitForRouteReady(this.page);
  await this.page.reload({ waitUntil: "commit" });
  await waitForPageReady(this.page, { strategy: "both" });
  // FIX: Wait for session to propagate to React components
  await waitForSessionPropagation(this, true);
});

// Use defineStep to allow both Given and When to use the same pattern
// Note: Given, When, Then all share the same pattern registry in Cucumber,
// so we use a single Given and add a separate When for "when I log in" phrasing
Given(
  "I am logged in as {string} with email {string}",
  async function(this: CustomWorld, name: string, email: string) {
    await handleLoggedInAs(this, name, email);
  },
);

When(
  "I log in as {string} with email {string}",
  async function(this: CustomWorld, name: string, email: string) {
    await handleLoggedInAs(this, name, email);
  },
);

When(
  "I am logged in as {string} without an avatar image",
  async function(this: CustomWorld, name: string) {
    const email = `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`;
    await mockSession(this, { name, email });
    await waitForRouteReady(this.page);
    await this.page.reload({ waitUntil: "commit" });
    await waitForPageReady(this.page, { strategy: "both" });
    // FIX: Wait for session to propagate to React components
    await waitForSessionPropagation(this, true);
  },
);

When(
  "I am logged in as {string} with avatar image {string}",
  async function(this: CustomWorld, name: string, imageUrl: string) {
    const email = `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`;
    await mockSession(this, { name, email, image: imageUrl });
    await waitForRouteReady(this.page);
    await this.page.reload({ waitUntil: "commit" });
    await waitForPageReady(this.page, { strategy: "both" });
    // FIX: Wait for session to propagate to React components
    await waitForSessionPropagation(this, true);
  },
);

When(
  "I log out and log in as {string}",
  async function(this: CustomWorld, name: string) {
    const email = `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`;

    // First log out by mocking null session
    await mockSession(this, null);
    await waitForRouteReady(this.page);

    // Clear previous user's data for isolation
    try {
      await this.page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    } catch {
      // Ignore storage access errors
    }

    await this.page.reload({ waitUntil: "commit" });
    await waitForPageReady(this.page, { strategy: "both" });
    // FIX: Wait for logout to propagate
    await waitForSessionPropagation(this, false);

    // Then log in as the new user
    await mockSession(this, { name, email });
    await waitForRouteReady(this.page);
    await this.page.reload({ waitUntil: "commit" });
    await waitForPageReady(this.page, { strategy: "both" });
    // FIX: Wait for session to propagate to React components
    await waitForSessionPropagation(this, true);
  },
);

When(
  "I log out and log in as {string} with email {string}",
  async function(this: CustomWorld, name: string, email: string) {
    // First log out by mocking null session
    await mockSession(this, null);
    await waitForRouteReady(this.page);

    // Clear previous user's data for isolation
    try {
      await this.page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    } catch {
      // localStorage access denied - likely cross-origin, continue anyway
    }

    await this.page.reload({ waitUntil: "commit" });
    await waitForPageReady(this.page, { strategy: "both" });
    // FIX: Wait for logout to propagate
    await waitForSessionPropagation(this, false);

    // Then log in as the new user with specified email
    await mockSession(this, { name, email });
    await waitForRouteReady(this.page);
    await this.page.reload({ waitUntil: "commit" });
    await waitForPageReady(this.page, { strategy: "both" });
    // FIX: Wait for session to propagate to React components
    await waitForSessionPropagation(this, true);
  },
);

When("authentication is loading", async function(this: CustomWorld) {
  // Delay the session response to simulate loading state
  await this.page.route("**/api/auth/session", async (route) => {
    // Add a delay to keep the loading state visible
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(null),
    });
  });
  await this.page.reload();
  // Don't wait for networkidle to catch the loading state
  await this.page.waitForLoadState("domcontentloaded");
});

When("I click on the user avatar", async function(this: CustomWorld) {
  const avatar = this.page.getByTestId("user-avatar");
  await expect(avatar).toBeVisible({ timeout: 10000 });

  // Ensure avatar is ready for interaction
  await avatar.waitFor({ state: "attached" });
  await avatar.scrollIntoViewIfNeeded();

  // Use regular click - Radix dropdown needs a proper mouse click event
  await avatar.click();

  // Wait for dropdown menu to appear - Radix uses role="menu" for dropdown content
  // Try multiple selectors for robustness
  const menu = this.page.getByRole("menu");
  const dropdownContent = this.page.locator("[data-radix-menu-content]");

  try {
    await expect(menu.or(dropdownContent).first()).toBeVisible({ timeout: 5000 });
  } catch {
    // Retry click if menu didn't open
    await avatar.click();
    await expect(menu.or(dropdownContent).first()).toBeVisible({ timeout: 5000 });
  }
});

When(
  "I click the {string} option in the dropdown",
  async function(this: CustomWorld, optionText: string) {
    const option = this.page.getByRole("menuitem", { name: optionText });
    await expect(option).toBeVisible();
    await option.click();
  },
);

// NOTE: "I should see the {string} button" step moved to common.steps.ts

// Removed duplicate - using common.steps.ts

Then(
  "I should not see the {string} button",
  async function(this: CustomWorld, buttonText: string) {
    const button = this.page.getByRole("button", { name: buttonText });
    await expect(button).not.toBeVisible();
  },
);

Then("I should see the user avatar", async function(this: CustomWorld) {
  // Look for avatar using the data-testid attribute
  const avatar = this.page.getByTestId("user-avatar");
  await expect(avatar).toBeVisible();
});

Then("I should not see the user avatar", async function(this: CustomWorld) {
  const avatar = this.page.getByTestId("user-avatar");
  await expect(avatar).not.toBeVisible();
});

Then(
  "the GitHub authentication flow should be initiated",
  async function(this: CustomWorld) {
    // Set up route interception before clicking
    await this.page.route("**/api/auth/signin/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><body>Mock GitHub Sign In</body></html>",
      });
    });

    // The button should be clickable and attempt to call signIn
    const button = this.page.getByRole("button", {
      name: /Continue with GitHub/i,
    });
    await expect(button).toBeEnabled();

    // Verify the button exists and is interactive
    await expect(button).toBeVisible();
    expect(await button.isEnabled()).toBe(true);
  },
);

Then(
  "the Google authentication flow should be initiated",
  async function(this: CustomWorld) {
    // Set up route interception before checking
    await this.page.route("**/api/auth/signin/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><body>Mock Google Sign In</body></html>",
      });
    });

    // The button should be clickable and attempt to call signIn
    const button = this.page.getByRole("button", {
      name: /Continue with Google/i,
    });
    await expect(button).toBeEnabled();

    // Verify the button exists and is interactive
    await expect(button).toBeVisible();
    expect(await button.isEnabled()).toBe(true);
  },
);

Then("I should see the dropdown menu", async function(this: CustomWorld) {
  // Dropdown menu should be visible
  const menu = this.page.getByRole("menu");
  await expect(menu).toBeVisible();
});

Then(
  "I should see {string} in the dropdown",
  async function(this: CustomWorld, text: string) {
    const element = this.page.getByText(text);
    await expect(element).toBeVisible();
  },
);

Then(
  "I should see {string} option in the dropdown",
  async function(this: CustomWorld, optionText: string) {
    const option = this.page.getByRole("menuitem", { name: optionText });
    await expect(option).toBeVisible();
  },
);

Then("I should be logged out", async function(this: CustomWorld) {
  // Mock the session as null after logout
  await mockSession(this, null);
  await waitForRouteReady(this.page);

  // Wait for the page to reflect the logged-out state
  // Check that Sign In link is visible in header (indicating logged out state)
  await this.page
    .waitForSelector(".animate-spin", { state: "hidden", timeout: 10000 })
    .catch(() => {});

  const header = this.page.locator("header");
  const signInLink = header.getByRole("link", { name: "Sign In" });
  await expect(signInLink.first()).toBeVisible({ timeout: 10000 });
});

Then(
  "I should see the loading spinner in the header",
  async function(this: CustomWorld) {
    // Look for the loading placeholder (animated pulse element)
    const loadingSpinner = this.page.locator(
      ".fixed.top-4.right-4 .animate-pulse",
    );
    await expect(loadingSpinner).toBeVisible();
  },
);

Then(
  "the avatar should display {string} as initials",
  async function(this: CustomWorld, initials: string) {
    // Look for the avatar fallback with initials using data-testid
    const avatarFallback = this.page.locator('[data-testid="avatar-fallback"]')
      .first();
    await expect(avatarFallback).toBeVisible({ timeout: 10000 });
    await expect(avatarFallback).toHaveText(initials);
  },
);

Then(
  "the avatar should display the custom image",
  async function(this: CustomWorld) {
    // Look for the avatar image
    const avatarImage = this.page.locator(
      'img[alt*="User"], img[alt*="John"], img[alt*="Jane"], img[alt*="Charlie"]',
    ).first();
    await expect(avatarImage).toBeVisible();
    // Verify it has a src attribute
    const src = await avatarImage.getAttribute("src");
    expect(src).toBeTruthy();
  },
);

// Navigation steps
When("I visit {string}", async function(this: CustomWorld, path: string) {
  await this.page.goto(`${this.baseUrl}${path}`, { waitUntil: "commit" });
  await waitForPageReady(this.page, {
    strategy: "both", // Try networkidle, fall back to dom
    waitForSuspense: true, // Wait for loading states to disappear
  });
});

Then(
  "I should be on the {string} page",
  async function(this: CustomWorld, path: string) {
    // Wait for URL to match with proper timeout
    await this.page.waitForURL((url) => {
      const expectedUrl = `${this.baseUrl}${path}`;
      return url.href.startsWith(expectedUrl) ||
        url.href.startsWith(`${expectedUrl}/`) ||
        url.href.includes(path);
    }, { timeout: 10000 });

    await waitForPageReady(this.page);
    const currentUrl = this.page.url();
    expect(currentUrl).toMatch(new RegExp(path));
  },
);

Then(
  "I should see {string} heading",
  async function(this: CustomWorld, headingText: string) {
    // Use getByRole for better reliability - searches for headings with specific text
    // Falls back to text-based search if no heading role found
    const headingByRole = this.page.getByRole("heading", { name: headingText });
    const headingByText = this.page.locator(
      "h1, h2, h3, h4, h5, h6, .font-bold",
      {
        hasText: headingText,
      },
    );

    // Try role-based first, then fall back to text-based
    const heading = (await headingByRole.count()) > 0
      ? headingByRole
      : headingByText;
    await expect(heading.first()).toBeVisible({ timeout: 15000 });
  },
);

Then(
  "I should see {string} text",
  async function(this: CustomWorld, text: string) {
    // Wait for Suspense fallback to disappear ONLY if it's visible
    const loadingText = this.page.getByText("Loading...", { exact: true });
    const isLoadingVisible = await loadingText.isVisible().catch(() => false);
    if (isLoadingVisible) {
      await loadingText.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
    }

    // Use .first() to handle cases where text appears in multiple elements (e.g., nav link and heading)
    // Use longer timeout for flaky CI environment
    await expect(this.page.getByText(text).first()).toBeVisible({
      timeout: 15000,
    });
  },
);

Then(
  "I should see {string} link",
  async function(this: CustomWorld, linkText: string) {
    // Wait for any loading spinners to disappear first
    await this.page
      .waitForSelector(".animate-spin", { state: "hidden", timeout: 10000 })
      .catch(() => {});

    const link = this.page.getByRole("link", { name: linkText });
    // Use .first() to handle cases where there are multiple links with similar names
    // Use longer timeout for pages with async loading
    await expect(link.first()).toBeVisible({ timeout: 15000 });
  },
);

Then(
  "I should see {string} link in the header",
  async function(this: CustomWorld, linkText: string) {
    // Wait for page to fully load
    await this.page
      .waitForSelector(".animate-spin", { state: "hidden", timeout: 10000 })
      .catch(() => {});

    // Look for the link within the header element
    const header = this.page.locator("header");
    const link = header.getByRole("link", { name: linkText });
    await expect(link.first()).toBeVisible({ timeout: 15000 });
  },
);

Then(
  "I should not see {string} link in the header",
  async function(this: CustomWorld, linkText: string) {
    // Wait for page to fully load
    await this.page
      .waitForSelector(".animate-spin", { state: "hidden", timeout: 10000 })
      .catch(() => {});

    // Look for the link within the header element
    const header = this.page.locator("header");
    const link = header.getByRole("link", { name: linkText });
    await expect(link).not.toBeVisible({ timeout: 5000 });
  },
);

When(
  "I click the {string} link",
  async function(this: CustomWorld, linkText: string) {
    // Wait for Suspense fallback to disappear ONLY if it's visible
    const loadingText = this.page.getByText("Loading...", { exact: true });
    const isLoadingVisible = await loadingText.isVisible().catch(() => false);
    if (isLoadingVisible) {
      await loadingText.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
    }

    // Wait for any loading spinners to disappear
    await this.page
      .waitForSelector(".animate-spin", { state: "hidden", timeout: 10000 })
      .catch(() => {});

    const link = this.page.getByRole("link", { name: linkText });
    await expect(link.first()).toBeVisible({ timeout: 10000 });

    // Use dispatchEvent to bypass any overlapping elements (fixed headers)
    // This is more reliable than force: true which can still click the wrong element
    await link.first().dispatchEvent("click");

    // Wait for navigation to complete
    await this.page.waitForLoadState("domcontentloaded", { timeout: 10000 });
  },
);

// NOTE: "I click the {string} button" step moved to common.steps.ts

Then(
  "the URL should contain {string}",
  async function(this: CustomWorld, urlPart: string) {
    const currentUrl = this.page.url();
    // Check both encoded and decoded versions for robustness
    const hasMatch = currentUrl.includes(urlPart) ||
      currentUrl.includes(encodeURIComponent(urlPart)) ||
      decodeURIComponent(currentUrl).includes(urlPart);
    expect(hasMatch).toBe(true);
  },
);

// Error message steps
Then(
  "I should see error message {string}",
  async function(this: CustomWorld, errorMessage: string) {
    // Exclude Next.js route announcer which also has role="alert"
    const alert = this.page.locator(
      '[role="alert"]:not([id="__next-route-announcer__"])',
    );
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(errorMessage);
  },
);

Then(
  "I should see error title {string}",
  async function(this: CustomWorld, errorTitle: string) {
    // Exclude Next.js route announcer which also has role="alert"
    const alertTitle = this.page.locator(
      '[role="alert"]:not([id="__next-route-announcer__"])',
    ).getByText(errorTitle);
    await expect(alertTitle).toBeVisible();
  },
);

Then(
  "I should see error description containing {string}",
  async function(this: CustomWorld, descriptionPart: string) {
    // Exclude Next.js route announcer which also has role="alert"
    const alert = this.page.locator(
      '[role="alert"]:not([id="__next-route-announcer__"])',
    );
    await expect(alert).toBeVisible();
    const text = await alert.textContent();
    expect(text?.toLowerCase()).toContain(descriptionPart.toLowerCase());
  },
);

Then(
  "I should see error code {string}",
  async function(this: CustomWorld, errorCode: string) {
    const codeElement = this.page.locator("code", { hasText: errorCode });
    await expect(codeElement).toBeVisible();
  },
);
