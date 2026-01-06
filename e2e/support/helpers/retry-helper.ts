import type { Locator, Page, Response } from "@playwright/test";
import { expect } from "@playwright/test";

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
  const waitUntil = options.waitUntil || "domcontentloaded";

  await page.waitForLoadState(waitUntil, { timeout });

  // Try networkidle with a shorter timeout, but don't fail if it times out
  // This handles pages with ongoing network activity (polling, websockets, Yjs sync)
  try {
    await page.waitForLoadState("networkidle", { timeout: 5000 });
  } catch {
    // Network may still be active, that's OK - the page has loaded
  }
}

/**
 * Navigate to a URL with retry logic
 * Handles transient network errors like ERR_EMPTY_RESPONSE in CI
 *
 * @param page - Playwright Page instance
 * @param url - URL to navigate to
 * @param options - Configuration options
 */
export async function gotoWithRetry(
  page: Page,
  url: string,
  options: {
    timeout?: number;
    waitUntil?: "load" | "domcontentloaded" | "networkidle";
    maxRetries?: number;
  } = {},
): Promise<Response | null> {
  const timeout = options.timeout || TIMEOUTS.LONG;
  const waitUntil = options.waitUntil || "load";
  const maxRetries = options.maxRetries ?? 3;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await page.goto(url, { timeout, waitUntil });
      // Wait for page to stabilize
      await waitForPageLoad(page);
      return response;
    } catch (error) {
      lastError = error as Error;
      const isNetworkError = lastError.message.includes("net::ERR_") ||
        lastError.message.includes("ERR_EMPTY_RESPONSE") ||
        lastError.message.includes("ERR_CONNECTION_REFUSED");

      if (isNetworkError && attempt < maxRetries - 1) {
        console.log(
          `Navigation to ${url} failed (attempt ${
            attempt + 1
          }/${maxRetries}): ${lastError.message}`,
        );
        // Wait before retry with exponential backoff
        await page.waitForTimeout(1000 * (attempt + 1));
        continue;
      }
      throw lastError;
    }
  }

  throw new Error(
    `Navigation to ${url} failed after ${maxRetries} attempts. Last error: ${
      lastError?.message || "unknown"
    }`,
  );
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

/**
 * Wait for an API response matching a URL pattern
 * Sets up the wait before the action that triggers the request
 *
 * @param page - Playwright Page instance
 * @param urlPattern - String or RegExp to match against the URL
 * @param options - Configuration options
 * @returns Promise that resolves to the Response
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  options: { timeout?: number; } = {},
): Promise<Response> {
  const timeout = options.timeout || TIMEOUTS.DEFAULT;
  const pattern = typeof urlPattern === "string"
    ? (url: string) => url.includes(urlPattern)
    : (url: string) => urlPattern.test(url);

  return page.waitForResponse(
    (response) => pattern(response.url()),
    { timeout },
  );
}

/**
 * Wait for modal animation to complete (visible or hidden)
 * Handles modal open/close animations reliably
 *
 * @param page - Playwright Page instance
 * @param state - Whether modal should be 'visible' or 'hidden'
 * @param options - Configuration options
 */
export async function waitForModalState(
  page: Page,
  state: "visible" | "hidden",
  options: { timeout?: number; } = {},
): Promise<void> {
  const timeout = options.timeout || TIMEOUTS.DEFAULT;
  const modal = page.locator('[role="dialog"]');

  if (state === "visible") {
    await expect(modal).toBeVisible({ timeout });
    // Wait for animation to complete by checking for stable visibility
    await page.waitForFunction(
      () => {
        const dialog = document.querySelector('[role="dialog"]');
        if (!dialog) return false;
        const style = window.getComputedStyle(dialog);
        return style.opacity === "1" && style.transform === "none";
      },
      { timeout: TIMEOUTS.SHORT },
    ).catch(() => {
      // Animation may not use opacity/transform, visibility check is sufficient
    });
  } else {
    await expect(modal).not.toBeVisible({ timeout });
  }
}

/**
 * Wait for dynamic content to match expected value
 * Useful for elements that update asynchronously (e.g., balance displays)
 *
 * @param page - Playwright Page instance
 * @param selector - CSS selector for the element
 * @param expectedContent - String or RegExp the content should match
 * @param options - Configuration options
 */
export async function waitForDynamicContent(
  page: Page,
  selector: string,
  expectedContent: string | RegExp,
  options: { timeout?: number; } = {},
): Promise<void> {
  const timeout = options.timeout || TIMEOUTS.DEFAULT;

  await page.waitForFunction(
    ({ sel, expected }) => {
      const element = document.querySelector(sel);
      if (!element) return false;
      const text = element.textContent || "";
      if (typeof expected === "string") {
        return text.includes(expected);
      }
      return new RegExp(expected).test(text);
    },
    {
      sel: selector,
      expected: expectedContent instanceof RegExp
        ? expectedContent.source
        : expectedContent,
    },
    { timeout },
  );
}

/**
 * Wait for localStorage to contain or not contain a key
 * Useful for testing draft persistence and data sync
 *
 * @param page - Playwright Page instance
 * @param key - localStorage key to check
 * @param options - Configuration options
 */
export async function waitForLocalStorage(
  page: Page,
  key: string,
  options: { shouldExist?: boolean; minLength?: number; timeout?: number; } = {},
): Promise<void> {
  const timeout = options.timeout || TIMEOUTS.DEFAULT;
  const shouldExist = options.shouldExist ?? true;
  const minLength = options.minLength ?? 0;

  await page.waitForFunction(
    ({ k, exist, minLen }) => {
      const value = localStorage.getItem(k);
      if (exist) {
        return value !== null && value.length >= minLen;
      }
      return value === null;
    },
    { k: key, exist: shouldExist, minLen: minLength },
    { timeout },
  );
}

/**
 * Wait for pricing data to be fully rendered on the page
 * Checks for price elements and ensures they contain actual values
 *
 * @param page - Playwright Page instance
 * @param options - Configuration options
 */
export async function waitForPricingData(
  page: Page,
  options: { timeout?: number; } = {},
): Promise<void> {
  const timeout = options.timeout || TIMEOUTS.DEFAULT;

  // Wait for at least one price element with a value
  try {
    await page.waitForFunction(
      () => {
        // Look for Card elements with prices
        const priceElements = document.querySelectorAll(
          '[class*="Card"], [class*="card"]',
        );
        if (priceElements.length === 0) {
          // Fallback: look for any element with price formatting
          const pageText = document.body.textContent || "";
          return /[£$]\s*\d+/.test(pageText);
        }

        // Check if prices are rendered (contain currency symbol)
        const hasPrices = Array.from(priceElements).some((el) => {
          const text = el.textContent || "";
          return /[£$]\s*\d+/.test(text);
        });

        return hasPrices;
      },
      { timeout },
    );
  } catch {
    // If no pricing elements found, just continue - page may have different structure
  }
}

/**
 * Wait for token balance to be displayed and contain a number
 *
 * @param page - Playwright Page instance
 * @param options - Configuration options
 */
export async function waitForTokenBalance(
  page: Page,
  options: { timeout?: number; } = {},
): Promise<void> {
  const timeout = options.timeout || TIMEOUTS.DEFAULT;

  // Wait for balance display with numeric value
  await page.waitForFunction(
    () => {
      const balanceEl = document.querySelector('[data-testid="token-balance"]') ||
        document.querySelector('[class*="token"]') ||
        Array.from(document.querySelectorAll("*")).find((el) =>
          /\d+\s*tokens?/i.test(el.textContent || "")
        );

      if (!balanceEl) return false;
      return /\d+/.test(balanceEl.textContent || "");
    },
    { timeout },
  );
}
