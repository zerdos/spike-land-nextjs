import type { BrowserContext, Page } from "@playwright/test";
import fs from "fs";
import path from "path";

/**
 * Path to the auth state file for session persistence
 * This file stores cookies to reuse sessions across test runs
 */
const AUTH_STATE_FILE = path.join(process.cwd(), "e2e/.auth-state.json");

/**
 * OAuth provider type for authentication
 */
export type OAuthProvider = "github" | "google";

/**
 * Authentication state stored in the auth state file
 */
interface AuthState {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: "Strict" | "Lax" | "None";
  }>;
  timestamp: number;
  baseUrl: string;
}

/**
 * Check if the saved auth state is still valid (not expired, same baseUrl)
 */
function isAuthStateValid(authState: AuthState, baseUrl: string): boolean {
  // Check if the baseUrl matches
  if (authState.baseUrl !== baseUrl) {
    console.log("[OAuth] Auth state baseUrl mismatch, re-authenticating...");
    return false;
  }

  // Check if any session cookie is expired
  const now = Date.now() / 1000;
  const sessionCookie = authState.cookies.find(
    (c) => c.name.includes("next-auth") || c.name.includes("session"),
  );
  if (sessionCookie && sessionCookie.expires > 0 && sessionCookie.expires < now) {
    console.log("[OAuth] Auth state expired, re-authenticating...");
    return false;
  }

  // Check if state is older than 24 hours
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  if (Date.now() - authState.timestamp > maxAge) {
    console.log("[OAuth] Auth state too old, re-authenticating...");
    return false;
  }

  return true;
}

/**
 * Load saved auth state from file
 */
function loadAuthState(): AuthState | null {
  if (!fs.existsSync(AUTH_STATE_FILE)) {
    return null;
  }

  try {
    const data = fs.readFileSync(AUTH_STATE_FILE, "utf-8");
    return JSON.parse(data) as AuthState;
  } catch (error) {
    console.warn("[OAuth] Failed to load auth state:", error);
    return null;
  }
}

/**
 * Save auth state to file for reuse
 */
async function saveAuthState(context: BrowserContext, baseUrl: string): Promise<void> {
  const cookies = await context.cookies();
  const authState: AuthState = {
    cookies,
    timestamp: Date.now(),
    baseUrl,
  };

  const dir = path.dirname(AUTH_STATE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(AUTH_STATE_FILE, JSON.stringify(authState, null, 2));
  console.log("[OAuth] Auth state saved for future test runs");
}

/**
 * Clear the saved auth state
 */
export function clearAuthState(): void {
  if (fs.existsSync(AUTH_STATE_FILE)) {
    fs.unlinkSync(AUTH_STATE_FILE);
    console.log("[OAuth] Auth state cleared");
  }
}

/**
 * Try to restore a saved session by applying cookies
 * Returns true if session was restored and is valid
 */
async function tryRestoreSession(
  context: BrowserContext,
  page: Page,
  baseUrl: string,
): Promise<boolean> {
  const authState = loadAuthState();

  if (!authState || !isAuthStateValid(authState, baseUrl)) {
    return false;
  }

  console.log("[OAuth] Attempting to restore saved session...");

  // Apply saved cookies
  await context.addCookies(authState.cookies);

  // Navigate to my-apps to check if session is valid
  await page.goto(`${baseUrl}/my-apps`);

  // Wait for navigation to complete
  try {
    await page.waitForLoadState("networkidle", { timeout: 10000 });
  } catch {
    // Network may still be active, continue checking
  }

  // Check if we're on the my-apps page (authenticated) or redirected to auth
  const currentUrl = page.url();
  if (currentUrl.includes("/auth/signin") || currentUrl.includes("/api/auth")) {
    console.log("[OAuth] Saved session expired, need to re-authenticate");
    return false;
  }

  console.log("[OAuth] Session restored successfully!");
  return true;
}

/**
 * Perform GitHub OAuth login
 */
async function performGitHubLogin(page: Page): Promise<void> {
  const username = process.env["GITHUB_TEST_USERNAME"];
  const password = process.env["GITHUB_TEST_PASSWORD"];

  if (!username || !password) {
    throw new Error(
      "[OAuth] GITHUB_TEST_USERNAME and GITHUB_TEST_PASSWORD environment variables are required for production testing",
    );
  }

  console.log("[OAuth] Performing GitHub login...");

  // Fill in GitHub login form
  await page.waitForSelector('input[name="login"]', { timeout: 30000 });
  await page.fill('input[name="login"]', username);
  await page.fill('input[name="password"]', password);

  // Submit the form
  await page.click('input[type="submit"]');

  // Handle 2FA if required (via authenticator app or SMS)
  // For CI, consider using GitHub personal access tokens or OAuth apps
  try {
    const twoFactorInput = page.locator('input[name="otp"]');
    if (await twoFactorInput.isVisible({ timeout: 3000 })) {
      const totpCode = process.env["GITHUB_TEST_TOTP_CODE"];
      if (!totpCode) {
        throw new Error(
          "[OAuth] 2FA required but GITHUB_TEST_TOTP_CODE not provided",
        );
      }
      await twoFactorInput.fill(totpCode);
      await page.click('button[type="submit"]');
    }
  } catch {
    // No 2FA required, continue
  }

  // Handle OAuth authorization page if this is first time
  try {
    const authorizeButton = page.getByRole("button", { name: /Authorize/i });
    if (await authorizeButton.isVisible({ timeout: 5000 })) {
      await authorizeButton.click();
    }
  } catch {
    // Already authorized, continue
  }
}

/**
 * Perform Google OAuth login
 */
async function performGoogleLogin(page: Page): Promise<void> {
  const email = process.env["GOOGLE_TEST_EMAIL"];
  const password = process.env["GOOGLE_TEST_PASSWORD"];

  if (!email || !password) {
    throw new Error(
      "[OAuth] GOOGLE_TEST_EMAIL and GOOGLE_TEST_PASSWORD environment variables are required for Google OAuth",
    );
  }

  console.log("[OAuth] Performing Google login...");

  // Enter email
  await page.waitForSelector('input[type="email"]', { timeout: 30000 });
  await page.fill('input[type="email"]', email);
  await page.click('button:has-text("Next"), #identifierNext');

  // Enter password
  await page.waitForSelector('input[type="password"]', { timeout: 10000 });
  await page.fill('input[type="password"]', password);
  await page.click('button:has-text("Next"), #passwordNext');
}

/**
 * Authenticate via OAuth on production spike.land
 *
 * This function handles:
 * 1. Restoring a saved session if available and valid
 * 2. Performing OAuth login if no valid session exists
 * 3. Saving the session for future test runs
 *
 * @param context - Playwright browser context
 * @param page - Playwright page
 * @param baseUrl - Base URL (e.g., "https://spike.land")
 * @param provider - OAuth provider ("github" or "google")
 * @returns true if authentication was successful
 */
export async function authenticateViaOAuth(
  context: BrowserContext,
  page: Page,
  baseUrl: string,
  provider: OAuthProvider = "github",
): Promise<boolean> {
  // Try to restore saved session first
  const restored = await tryRestoreSession(context, page, baseUrl);
  if (restored) {
    return true;
  }

  console.log(`[OAuth] Authenticating via ${provider}...`);

  // Navigate to sign-in page
  await page.goto(`${baseUrl}/auth/signin`);
  await page.waitForLoadState("networkidle", { timeout: 15000 });

  // Click the OAuth provider button
  const providerButton = page.getByRole("button", {
    name: new RegExp(provider, "i"),
  });

  if (!(await providerButton.isVisible({ timeout: 5000 }))) {
    throw new Error(`[OAuth] ${provider} sign-in button not found`);
  }

  await providerButton.click();

  // Perform provider-specific login
  if (provider === "github") {
    await performGitHubLogin(page);
  } else if (provider === "google") {
    await performGoogleLogin(page);
  }

  // Wait for redirect back to app
  try {
    await page.waitForURL(/\/my-apps/, { timeout: 30000 });
    console.log("[OAuth] Authentication successful!");

    // Save session for reuse
    await saveAuthState(context, baseUrl);
    return true;
  } catch (error) {
    console.error("[OAuth] Authentication failed:", error);
    return false;
  }
}

/**
 * Check if production authentication is configured
 */
export function isProductionAuthConfigured(): boolean {
  return !!(
    (process.env["GITHUB_TEST_USERNAME"] && process.env["GITHUB_TEST_PASSWORD"]) ||
    (process.env["GOOGLE_TEST_EMAIL"] && process.env["GOOGLE_TEST_PASSWORD"])
  );
}

/**
 * Get the configured OAuth provider
 */
export function getConfiguredProvider(): OAuthProvider | null {
  if (process.env["GITHUB_TEST_USERNAME"] && process.env["GITHUB_TEST_PASSWORD"]) {
    return "github";
  }
  if (process.env["GOOGLE_TEST_EMAIL"] && process.env["GOOGLE_TEST_PASSWORD"]) {
    return "google";
  }
  return null;
}
