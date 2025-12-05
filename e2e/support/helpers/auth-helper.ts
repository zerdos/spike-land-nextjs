import { Page } from "@playwright/test";

export interface MockUser {
  name: string;
  email: string;
  image?: string;
}

export async function mockSession(page: Page, user: MockUser | null) {
  const sessionData = user
    ? {
      user: {
        name: user.name,
        email: user.email,
        image: user.image || null,
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }
    : null;

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

  await page.addInitScript(() => {
    interface WindowWithMocks extends Window {
      __mockSignInCalled?: boolean;
      __mockSignInProvider?: string | null;
    }
    (window as WindowWithMocks).__mockSignInCalled = false;
    (window as WindowWithMocks).__mockSignInProvider = null;
  });
}

export async function mockLogin(page: Page, name: string, email: string, image?: string) {
  await mockSession(page, { name, email, image });
  await page.reload();
  await page.waitForLoadState("networkidle");
}

export async function mockLogout(page: Page) {
  await mockSession(page, null);
  await page.reload();
  await page.waitForLoadState("networkidle");
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

export async function mockAuthCallback(page: Page, user: MockUser, callbackUrl?: string) {
  await mockSession(page, user);

  const redirectUrl = callbackUrl || "/";
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
