/**
 * E2E Authentication Bypass Helper Utilities
 *
 * These utilities help verify and debug E2E authentication bypass in smoke tests.
 * The bypass mechanism uses both server-side (cookies + header) and client-side
 * (API route interception) approaches to handle both server and client components.
 */

import type { Page } from "@playwright/test";

/**
 * Verify that E2E auth bypass is working correctly
 *
 * This checks both:
 * 1. Server-side bypass: Cookies are set and header is being sent
 * 2. Client-side bypass: API route interception is active
 *
 * @param page - Playwright page instance
 * @returns Promise resolving to true if bypass is working, false otherwise
 */
export async function verifyAuthBypass(page: Page): Promise<boolean> {
  try {
    console.log("[Auth Bypass] Verifying E2E auth bypass...");

    // Check if E2E cookies are set
    const cookies = await page.context().cookies();
    const e2eCookies = cookies.filter((c) =>
      c.name.startsWith("e2e-")
    );

    console.log(
      `[Auth Bypass] Found ${e2eCookies.length} E2E cookies:`,
      e2eCookies.map((c) => c.name),
    );

    if (e2eCookies.length < 3) {
      console.error(
        "[Auth Bypass] Missing E2E cookies. Expected at least 3 (role, email, name)",
      );
      return false;
    }

    // Check if session API is being intercepted
    // We'll make a request and verify it returns mock data
    const sessionResponse = await page.evaluate(async () => {
      try {
        const response = await fetch("/api/auth/session");
        const data = await response.json();
        return {
          ok: response.ok,
          status: response.status,
          hasUser: !!data?.user,
          userId: data?.user?.id,
        };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    console.log("[Auth Bypass] Session API check:", sessionResponse);

    if (!sessionResponse.ok || !sessionResponse.hasUser) {
      console.error("[Auth Bypass] Session API not returning mock user");
      return false;
    }

    console.log("[Auth Bypass] ✓ E2E auth bypass verified successfully");
    return true;
  } catch (error) {
    console.error(
      "[Auth Bypass] Error verifying auth bypass:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

/**
 * Wait for auth to be fully initialized
 *
 * This waits for:
 * 1. Session API to be available
 * 2. Session data to be populated
 * 3. Client-side auth hooks to finish loading
 *
 * @param page - Playwright page instance
 * @param options - Wait options
 * @returns Promise that resolves when auth is ready
 */
export async function waitForAuthReady(
  page: Page,
  options: {
    timeout?: number;
    expectAuthenticated?: boolean;
  } = {},
): Promise<void> {
  const { timeout = 10000, expectAuthenticated = true } = options;

  console.log(
    `[Auth Bypass] Waiting for auth to be ready (timeout: ${timeout}ms)...`,
  );

  try {
    await page.waitForFunction(
      async (expected) => {
        try {
          const response = await fetch("/api/auth/session");
          if (!response.ok) return false;

          const data = await response.json();
          const hasUser = !!data?.user;

          // If we expect authenticated, wait for user data
          // If we expect unauthenticated, wait for no user data
          return expected ? hasUser : !hasUser;
        } catch {
          return false;
        }
      },
      expectAuthenticated,
      { timeout },
    );

    console.log("[Auth Bypass] ✓ Auth ready");
  } catch (error) {
    console.error(
      "[Auth Bypass] Timeout waiting for auth:",
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}

/**
 * Capture detailed auth state for debugging
 *
 * This captures:
 * 1. All cookies (E2E and auth-related)
 * 2. Session API response
 * 3. Client-side session state (if available)
 * 4. Request headers
 *
 * @param page - Playwright page instance
 * @returns Promise resolving to debug information object
 */
export async function debugAuthState(page: Page): Promise<Record<string, unknown>> {
  console.log("[Auth Bypass] Capturing auth state for debugging...");

  try {
    // Get all cookies
    const allCookies = await page.context().cookies();
    const e2eCookies = allCookies.filter((c) => c.name.startsWith("e2e-"));
    const authCookies = allCookies.filter((c) =>
      c.name.includes("session") || c.name.includes("auth")
    );

    // Get session API response
    const sessionData = await page.evaluate(async () => {
      try {
        const response = await fetch("/api/auth/session");
        return {
          status: response.status,
          ok: response.ok,
          data: await response.json(),
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // Get client-side session state (if useSession hook is available)
    const clientSessionState = await page.evaluate(() => {
      // Check if window has any session-related state
      const anyWindow = window as unknown as { __NEXT_DATA__?: unknown };
      return {
        hasNextData: !!anyWindow.__NEXT_DATA__,
        url: window.location.href,
      };
    });

    const debugInfo = {
      timestamp: new Date().toISOString(),
      url: page.url(),
      cookies: {
        total: allCookies.length,
        e2e: e2eCookies.map((c) => ({ name: c.name, value: c.value })),
        auth: authCookies.map((c) => ({
          name: c.name,
          value: c.value.substring(0, 20) + "...",
        })),
      },
      session: sessionData,
      clientState: clientSessionState,
    };

    console.log("[Auth Bypass] Debug info:", JSON.stringify(debugInfo, null, 2));

    return debugInfo;
  } catch (error) {
    const errorInfo = {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    };
    console.error("[Auth Bypass] Error capturing debug info:", errorInfo);
    return errorInfo;
  }
}

/**
 * Retry an action with auth bypass verification
 *
 * This is useful for flaky operations that may fail due to auth timing issues.
 * It will:
 * 1. Verify auth bypass is working
 * 2. Attempt the action
 * 3. If it fails, capture debug info and retry
 *
 * @param page - Playwright page instance
 * @param action - Async function to execute
 * @param options - Retry options
 * @returns Promise resolving to the action result
 */
export async function retryWithAuthBypass<T>(
  page: Page,
  action: () => Promise<T>,
  options: {
    maxRetries?: number;
    delayMs?: number;
    verifyBeforeRetry?: boolean;
  } = {},
): Promise<T> {
  const {
    maxRetries = 3,
    delayMs = 1000,
    verifyBeforeRetry = true,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Auth Bypass] Attempt ${attempt}/${maxRetries}...`);

      // Verify auth bypass before retry (except first attempt)
      if (attempt > 1 && verifyBeforeRetry) {
        const isValid = await verifyAuthBypass(page);
        if (!isValid) {
          console.error(
            `[Auth Bypass] Auth bypass verification failed on attempt ${attempt}`,
          );
          await debugAuthState(page);

          // Wait before next retry
          if (attempt < maxRetries) {
            console.log(`[Auth Bypass] Waiting ${delayMs}ms before retry...`);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
          continue;
        }
      }

      // Execute the action
      const result = await action();
      console.log(`[Auth Bypass] ✓ Action succeeded on attempt ${attempt}`);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(
        `[Auth Bypass] Attempt ${attempt} failed:`,
        lastError.message,
      );

      // Capture debug info on failure
      await debugAuthState(page);

      // Wait before next retry
      if (attempt < maxRetries) {
        const backoffDelay = delayMs * attempt; // Exponential backoff
        console.log(`[Auth Bypass] Waiting ${backoffDelay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      }
    }
  }

  // All retries failed
  throw new Error(
    `Action failed after ${maxRetries} attempts. Last error: ${lastError?.message}`,
  );
}
