import { expect, Locator, Page } from "@playwright/test";

/**
 * Environment-specific timeout configuration
 * CI environments typically need longer timeouts due to varying network conditions
 *
 * @note Why not use Playwright's built-in retry?
 * - Playwright's built-in retry uses exponential backoff which can be too aggressive
 * - We need consistent, predictable retry intervals for debugging
 * - Environment-specific timeouts (CI vs local) aren't supported by Playwright natively
 * - Custom error messages with context (selector, testId) are more debuggable
 */
export const TIMEOUTS = {
  DEFAULT: process.env.CI ? 10000 : 5000,
  LONG: process.env.CI ? 20000 : 10000,
  SHORT: process.env.CI ? 5000 : 2500,
  RETRY_INTERVAL: 500,
};

/**
 * Generic retry wrapper with consistent error handling and logging
 * Handles retry logic with proper error tracking and debugging output
 *
 * @param operation - Async operation to retry
 * @param options - Retry configuration
 * @param context - Description of operation for error messages
 * @returns Result of operation
 * @throws Error if operation fails after all retries
 *
 * @note About page.waitForTimeout():
 * - Used for frame-level synchronization between retries
 * - Ensures DOM has time to update between retry attempts
 * - Alternative would be exponential backoff, but fixed intervals are more predictable
 * - This is the recommended Playwright pattern for custom retry logic
 */
async function withRetry<T>(
  page: Page,
  operation: () => Promise<T>,
  options: {
    timeout?: number;
    retryInterval?: number;
  },
  context: string,
): Promise<T> {
  const timeout = options.timeout || TIMEOUTS.DEFAULT;
  const retryInterval = options.retryInterval || TIMEOUTS.RETRY_INTERVAL;
  const startTime = Date.now();
  let lastError: Error | undefined;

  while (Date.now() - startTime < timeout) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      // Log on final retry attempt
      if (Date.now() - startTime >= timeout - retryInterval) {
        console.error(
          `Final retry failed for ${context}: ${lastError.message}`,
        );
      }
      // Wait for frame to be painted before next retry
      await page.waitForTimeout(retryInterval);
    }
  }

  throw new Error(
    `${context} after ${timeout}ms. Last error: ${lastError?.message || "unknown"}`,
  );
}

/**
 * Waits for an element to be visible with retry logic
 * Useful for handling flaky selectors and race conditions
 *
 * @param page - Playwright Page instance
 * @param selector - CSS selector or data-testid
 * @param options - Configuration options
 * @returns The visible locator
 */
export async function waitForElementWithRetry(
  page: Page,
  selector: string,
  options: {
    timeout?: number;
    retryInterval?: number;
    state?: "visible" | "attached" | "hidden";
  } = {},
): Promise<Locator> {
  const timeout = options.timeout || TIMEOUTS.DEFAULT;
  const retryInterval = options.retryInterval || TIMEOUTS.RETRY_INTERVAL;
  const state = options.state || "visible";
  const startTime = Date.now();
  let lastError: Error | undefined;

  while (Date.now() - startTime < timeout) {
    try {
      const element = page.locator(selector);

      if (state === "visible") {
        await expect(element).toBeVisible({ timeout: retryInterval * 2 });
      } else if (state === "attached") {
        await expect(element).toBeAttached({ timeout: retryInterval * 2 });
      } else if (state === "hidden") {
        await expect(element).toBeHidden({ timeout: retryInterval * 2 });
      }

      return element;
    } catch (error) {
      lastError = error as Error;
      // Log retry attempts for debugging
      if (Date.now() - startTime >= timeout - retryInterval) {
        console.error(
          `Final retry failed for selector "${selector}": ${lastError.message}`,
        );
      }
      // Wait for a frame to be painted before retrying
      await page.waitForTimeout(retryInterval);
    }
  }

  throw new Error(
    `Element with selector "${selector}" not found in state "${state}" after ${timeout}ms. Last error: ${
      lastError?.message || "unknown"
    }`,
  );
}

/**
 * Waits for an element by test ID with retry logic
 * Preferred method for locating elements to avoid selector conflicts
 *
 * @param page - Playwright Page instance
 * @param testId - data-testid attribute value
 * @param options - Configuration options
 * @returns The visible locator
 */
export async function waitForTestId(
  page: Page,
  testId: string,
  options: {
    timeout?: number;
    state?: "visible" | "attached" | "hidden";
  } = {},
): Promise<Locator> {
  return waitForElementWithRetry(page, `[data-testid="${testId}"]`, options);
}

/**
 * Waits for a button by test ID and clicks it with retry logic
 * Handles cases where button might not be immediately clickable
 *
 * @param page - Playwright Page instance
 * @param testId - data-testid attribute value
 * @param options - Configuration options
 */
export async function clickButtonWithRetry(
  page: Page,
  testId: string,
  options: { timeout?: number; } = {},
): Promise<void> {
  return withRetry(
    page,
    async () => {
      const button = page.getByTestId(testId);
      await expect(button).toBeVisible({
        timeout: TIMEOUTS.RETRY_INTERVAL * 2,
      });
      await expect(button).toBeEnabled({
        timeout: TIMEOUTS.RETRY_INTERVAL * 2,
      });
      await button.click();
    },
    { timeout: options.timeout },
    `Button with testId "${testId}" not clickable`,
  );
}

/**
 * Waits for navigation and ensures page is fully loaded
 * Waits for network to be idle, which indicates page has finished loading
 *
 * @param page - Playwright Page instance
 * @param options - Configuration options
 */
export async function waitForPageLoad(
  page: Page,
  options: {
    timeout?: number;
    waitUntil?: "load" | "domcontentloaded" | "networkidle";
  } = {},
): Promise<void> {
  const timeout = options.timeout || TIMEOUTS.DEFAULT;
  const waitUntil = options.waitUntil || "networkidle";

  await page.waitForLoadState(waitUntil, { timeout });

  // NetworkIdle already ensures rendering is complete
  // No additional fixed timeout needed - let components drive their own loading states
}

/**
 * Fills an input field with retry logic
 * Ensures the field is visible and enabled before filling
 *
 * @param page - Playwright Page instance
 * @param testId - data-testid attribute value
 * @param value - Value to fill
 * @param options - Configuration options
 */
export async function fillInputWithRetry(
  page: Page,
  testId: string,
  value: string,
  options: { timeout?: number; } = {},
): Promise<void> {
  return withRetry(
    page,
    async () => {
      const input = page.getByTestId(testId);
      await expect(input).toBeVisible({ timeout: TIMEOUTS.RETRY_INTERVAL * 2 });
      await expect(input).toBeEnabled({ timeout: TIMEOUTS.RETRY_INTERVAL * 2 });
      await input.fill(value);

      // Verify the value was set correctly - use SHORT timeout for inputs with debouncing/validation
      await expect(input).toHaveValue(value, { timeout: TIMEOUTS.SHORT });
    },
    { timeout: options.timeout },
    `Input with testId "${testId}" not fillable`,
  );
}

/**
 * Waits for text to appear on the page with retry logic
 *
 * @param page - Playwright Page instance
 * @param text - Text or regex to match
 * @param options - Configuration options
 * @returns The locator containing the text
 */
export async function waitForTextWithRetry(
  page: Page,
  text: string | RegExp,
  options: { timeout?: number; exact?: boolean; } = {},
): Promise<Locator> {
  const exact = options.exact ?? false;
  return withRetry(
    page,
    async () => {
      const element = page.getByText(text, { exact });
      await expect(element).toBeVisible({
        timeout: TIMEOUTS.RETRY_INTERVAL * 2,
      });
      return element;
    },
    { timeout: options.timeout },
    `Text "${text}" not found`,
  );
}
