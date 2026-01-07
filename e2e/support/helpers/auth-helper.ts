import type { Page } from "@playwright/test";
import { waitForRouteReady } from "./wait-helper";

export interface MockUser {
  name: string;
  email: string;
  image?: string;
  role?: string;
}

/**
 * Mock NextAuth session with proper route registration
 * CRITICAL: This version prevents race conditions by ensuring routes
 * are registered before any page operations
 */
export async function mockSession(page: Page, user: MockUser | null) {
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

  // Set up route interceptors FIRST
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(sessionData),
    });
  });

  await page.route("**/api/auth/csrf", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ csrfToken: "mock-csrf-token" }),
    });
  });

  // CRITICAL FIX: Wait for routes to be registered before continuing
  await waitForRouteReady(page);

  await page.addInitScript(() => {
    interface WindowWithMocks extends Window {
      __mockSignInCalled?: boolean;
      __mockSignInProvider?: string | null;
    }
    (window as WindowWithMocks).__mockSignInCalled = false;
    (window as WindowWithMocks).__mockSignInProvider = null;
  });
}

export async function mockLogin(
  page: Page,
  name: string,
  email: string,
  image?: string,
  role?: string,
) {
  await mockSession(page, { name, email, image, role });
  // CRITICAL: Wait for routes to be ready before reload
  await waitForRouteReady(page);
  await page.reload({ waitUntil: "commit" });
  // Use domcontentloaded first, then try networkidle with timeout
  await page.waitForLoadState("domcontentloaded");
  try {
    await page.waitForLoadState("networkidle", { timeout: 5000 });
  } catch {
    // Network may still be active (polling), that's OK
  }
}

export async function mockLogout(page: Page) {
  await mockSession(page, null);
  // Clear storage for isolation
  try {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  } catch {
    // Ignore SecurityError on about:blank
  }
  await waitForRouteReady(page);
  await page.reload({ waitUntil: "commit" });
  await page.waitForLoadState("domcontentloaded");
  try {
    await page.waitForLoadState("networkidle", { timeout: 5000 });
  } catch {
    // Network may still be active, that's OK
  }
}

export async function mockSignInRoutes(page: Page) {
  await page.route("**/api/auth/signin/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<html><body>Mock Sign In</body></html>",
    });
  });
}

export async function mockAuthCallback(
  page: Page,
  user: MockUser,
  callbackUrl?: string,
) {
  await mockSession(page, user);

  // Extract callbackUrl from current URL if not provided
  let redirectUrl = callbackUrl;
  if (!redirectUrl) {
    const currentUrl = new URL(page.url());
    const encodedCallback = currentUrl.searchParams.get("callbackUrl");
    redirectUrl = encodedCallback ? decodeURIComponent(encodedCallback) : "/";
  }

  await page.goto(redirectUrl);
  await page.waitForLoadState("networkidle");
}

export async function mockSessionExpired(page: Page) {
  const expiredSession = {
    user: {
      name: "Expired User",
      email: "expired@example.com",
      image: null,
    },
    expires: new Date(Date.now() - 1000).toISOString(),
  };

  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(expiredSession),
    });
  });
}
