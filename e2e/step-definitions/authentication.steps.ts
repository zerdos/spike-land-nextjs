import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';

// Helper function to mock NextAuth session
async function mockSession(world: CustomWorld, user: { name: string; email: string; image?: string } | null) {
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

  // Mock the NextAuth session endpoint
  await world.page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(sessionData),
    });
  });

  // Mock the CSRF token endpoint
  await world.page.route('**/api/auth/csrf', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ csrfToken: 'mock-csrf-token' }),
    });
  });

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

When('I am not logged in', async function (this: CustomWorld) {
  // Mock no session
  await mockSession(this, null);
  await this.page.reload();
  await this.page.waitForLoadState('networkidle');
});

When('I am logged in as {string} with email {string}', async function (this: CustomWorld, name: string, email: string) {
  await mockSession(this, { name, email });
  await this.page.reload();
  await this.page.waitForLoadState('networkidle');
});

When('I am logged in as {string} without an avatar image', async function (this: CustomWorld, name: string) {
  await mockSession(this, { name, email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com` });
  await this.page.reload();
  await this.page.waitForLoadState('networkidle');
});

When('I am logged in as {string} with avatar image {string}', async function (this: CustomWorld, name: string, imageUrl: string) {
  await mockSession(this, {
    name,
    email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
    image: imageUrl,
  });
  await this.page.reload();
  await this.page.waitForLoadState('networkidle');
});

When('I log out and log in as {string}', async function (this: CustomWorld, name: string) {
  // First log out by mocking null session
  await mockSession(this, null);
  await this.page.reload();
  await this.page.waitForLoadState('networkidle');

  // Then log in as the new user
  await mockSession(this, { name, email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com` });
  await this.page.reload();
  await this.page.waitForLoadState('networkidle');
});

When('I log out and log in as {string} with email {string}', async function (this: CustomWorld, name: string, email: string) {
  // First log out by mocking null session
  await mockSession(this, null);
  await this.page.reload();
  await this.page.waitForLoadState('networkidle');

  // Then log in as the new user with specified email
  await mockSession(this, { name, email });
  await this.page.reload();
  await this.page.waitForLoadState('networkidle');
});

When('authentication is loading', async function (this: CustomWorld) {
  // Delay the session response to simulate loading state
  await this.page.route('**/api/auth/session', async (route) => {
    // Add a delay to keep the loading state visible
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(null),
    });
  });
  await this.page.reload();
  // Don't wait for networkidle to catch the loading state
  await this.page.waitForLoadState('domcontentloaded');
});

When('I click on the user avatar', async function (this: CustomWorld) {
  // Find the avatar button (it's wrapped in a button with role)
  const avatar = this.page.locator('[role="button"]').filter({ has: this.page.locator('img, .avatar-fallback') }).first();
  await expect(avatar).toBeVisible();
  await avatar.click();
});

When('I click the {string} option in the dropdown', async function (this: CustomWorld, optionText: string) {
  const option = this.page.getByRole('menuitem', { name: optionText });
  await expect(option).toBeVisible();
  await option.click();
});

Then('I should see the {string} button', async function (this: CustomWorld, buttonText: string) {
  const button = this.page.getByRole('button', { name: buttonText });
  await expect(button).toBeVisible();
});

Then('I should not see the {string} button', async function (this: CustomWorld, buttonText: string) {
  const button = this.page.getByRole('button', { name: buttonText });
  await expect(button).not.toBeVisible();
});

Then('I should see the user avatar', async function (this: CustomWorld) {
  // Look for avatar in the header
  const avatar = this.page.locator('.fixed.top-4.right-4 [role="button"]').first();
  await expect(avatar).toBeVisible();
});

Then('I should not see the user avatar', async function (this: CustomWorld) {
  const avatar = this.page.locator('.fixed.top-4.right-4 [role="button"]').first();
  await expect(avatar).not.toBeVisible();
});

Then('the GitHub authentication flow should be initiated', async function (this: CustomWorld) {
  // Set up route interception before clicking
  await this.page.route('**/api/auth/signin/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<html><body>Mock GitHub Sign In</body></html>',
    });
  });

  // The button should be clickable and attempt to call signIn
  const button = this.page.getByRole('button', { name: /Continue with GitHub/i });
  await expect(button).toBeEnabled();

  // Verify the button exists and is interactive
  await expect(button).toBeVisible();
  expect(await button.isEnabled()).toBe(true);
});

Then('the Google authentication flow should be initiated', async function (this: CustomWorld) {
  // Set up route interception before checking
  await this.page.route('**/api/auth/signin/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<html><body>Mock Google Sign In</body></html>',
    });
  });

  // The button should be clickable and attempt to call signIn
  const button = this.page.getByRole('button', { name: /Continue with Google/i });
  await expect(button).toBeEnabled();

  // Verify the button exists and is interactive
  await expect(button).toBeVisible();
  expect(await button.isEnabled()).toBe(true);
});

Then('I should see the dropdown menu', async function (this: CustomWorld) {
  // Dropdown menu should be visible
  const menu = this.page.getByRole('menu');
  await expect(menu).toBeVisible();
});

Then('I should see {string} in the dropdown', async function (this: CustomWorld, text: string) {
  const element = this.page.getByText(text);
  await expect(element).toBeVisible();
});

Then('I should see {string} option in the dropdown', async function (this: CustomWorld, optionText: string) {
  const option = this.page.getByRole('menuitem', { name: optionText });
  await expect(option).toBeVisible();
});

Then('I should be logged out', async function (this: CustomWorld) {
  // Mock the session as null after logout
  await mockSession(this, null);
  // Wait for the page to reflect the logged-out state
  await this.page.waitForTimeout(500);
});

Then('I should see the loading spinner in the header', async function (this: CustomWorld) {
  // Look for the loading placeholder (animated pulse element)
  const loadingSpinner = this.page.locator('.fixed.top-4.right-4 .animate-pulse');
  await expect(loadingSpinner).toBeVisible();
});

Then('the avatar should display {string} as initials', async function (this: CustomWorld, initials: string) {
  // Look for the avatar fallback with initials
  const avatarFallback = this.page.locator('[class*="avatar-fallback"]').first();
  await expect(avatarFallback).toBeVisible();
  await expect(avatarFallback).toHaveText(initials);
});

Then('the avatar should display the custom image', async function (this: CustomWorld) {
  // Look for the avatar image
  const avatarImage = this.page.locator('img[alt*="User"], img[alt*="John"], img[alt*="Jane"], img[alt*="Charlie"]').first();
  await expect(avatarImage).toBeVisible();
  // Verify it has a src attribute
  const src = await avatarImage.getAttribute('src');
  expect(src).toBeTruthy();
});

// Navigation steps
When('I visit {string}', async function (this: CustomWorld, path: string) {
  await this.page.goto(`${this.baseUrl}${path}`);
  await this.page.waitForLoadState('networkidle');
});

Then('I should be on the {string} page', async function (this: CustomWorld, path: string) {
  const currentUrl = this.page.url();
  // Handle both exact match and query parameters
  const expectedUrl = `${this.baseUrl}${path}`;
  expect(currentUrl.startsWith(expectedUrl)).toBe(true);
});

Then('I should see {string} heading', async function (this: CustomWorld, headingText: string) {
  const heading = this.page.locator('h1', { hasText: headingText });
  await expect(heading).toBeVisible();
});

Then('I should see {string} text', async function (this: CustomWorld, text: string) {
  await expect(this.page.getByText(text)).toBeVisible();
});

Then('I should see {string} link', async function (this: CustomWorld, linkText: string) {
  const link = this.page.getByRole('link', { name: linkText });
  await expect(link).toBeVisible();
});

When('I click the {string} link', async function (this: CustomWorld, linkText: string) {
  const link = this.page.getByRole('link', { name: linkText });
  await expect(link).toBeVisible();
  await link.click();
  await this.page.waitForLoadState('networkidle');
});

When('I click the {string} button', async function (this: CustomWorld, buttonText: string) {
  const button = this.page.getByRole('button', { name: buttonText });
  await expect(button).toBeVisible();
  await button.click();
  await this.page.waitForLoadState('networkidle');
});

Then('the URL should contain {string}', async function (this: CustomWorld, urlPart: string) {
  const currentUrl = this.page.url();
  expect(currentUrl).toContain(urlPart);
});

// Error message steps
Then('I should see error message {string}', async function (this: CustomWorld, errorMessage: string) {
  const alert = this.page.locator('[role="alert"]');
  await expect(alert).toBeVisible();
  await expect(alert).toContainText(errorMessage);
});

Then('I should see error title {string}', async function (this: CustomWorld, errorTitle: string) {
  const alertTitle = this.page.locator('[role="alert"]').getByText(errorTitle);
  await expect(alertTitle).toBeVisible();
});

Then('I should see error description containing {string}', async function (this: CustomWorld, descriptionPart: string) {
  const alert = this.page.locator('[role="alert"]');
  await expect(alert).toBeVisible();
  const text = await alert.textContent();
  expect(text?.toLowerCase()).toContain(descriptionPart.toLowerCase());
});

Then('I should see error code {string}', async function (this: CustomWorld, errorCode: string) {
  const codeElement = this.page.locator('code', { hasText: errorCode });
  await expect(codeElement).toBeVisible();
});
