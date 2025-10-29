import { Page, Locator, expect } from '@playwright/test';

/**
 * Environment-specific timeout configuration
 * CI environments typically need longer timeouts due to varying network conditions
 */
export const TIMEOUTS = {
  DEFAULT: process.env.CI ? 10000 : 5000,
  LONG: process.env.CI ? 20000 : 10000,
  SHORT: process.env.CI ? 5000 : 2500,
  RETRY_INTERVAL: 500,
};

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
    state?: 'visible' | 'attached' | 'hidden';
  } = {}
): Promise<Locator> {
  const timeout = options.timeout || TIMEOUTS.DEFAULT;
  const retryInterval = options.retryInterval || TIMEOUTS.RETRY_INTERVAL;
  const state = options.state || 'visible';
  const startTime = Date.now();
  let lastError: Error | undefined;

  while (Date.now() - startTime < timeout) {
    try {
      const element = page.locator(selector);

      if (state === 'visible') {
        await expect(element).toBeVisible({ timeout: retryInterval * 2 });
      } else if (state === 'attached') {
        await expect(element).toBeAttached({ timeout: retryInterval * 2 });
      } else if (state === 'hidden') {
        await expect(element).toBeHidden({ timeout: retryInterval * 2 });
      }

      return element;
    } catch (error) {
      lastError = error as Error;
      // Log retry attempts for debugging
      if (Date.now() - startTime >= timeout - retryInterval) {
        console.error(`Final retry failed for selector "${selector}": ${lastError.message}`);
      }
      // Wait for a frame to be painted before retrying
      await page.waitForTimeout(retryInterval);
    }
  }

  throw new Error(
    `Element with selector "${selector}" not found in state "${state}" after ${timeout}ms. Last error: ${lastError?.message || 'unknown'}`
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
    state?: 'visible' | 'attached' | 'hidden';
  } = {}
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
  options: { timeout?: number } = {}
): Promise<void> {
  const timeout = options.timeout || TIMEOUTS.DEFAULT;
  const startTime = Date.now();
  let lastError: Error | undefined;

  while (Date.now() - startTime < timeout) {
    try {
      const button = page.getByTestId(testId);
      await expect(button).toBeVisible({ timeout: TIMEOUTS.RETRY_INTERVAL * 2 });
      await expect(button).toBeEnabled({ timeout: TIMEOUTS.RETRY_INTERVAL * 2 });
      await button.click();
      return;
    } catch (error) {
      lastError = error as Error;
      if (Date.now() - startTime >= timeout - TIMEOUTS.RETRY_INTERVAL) {
        console.error(`Failed to click button "${testId}": ${lastError.message}`);
      }
      // Wait for a frame before retrying
      await page.waitForTimeout(TIMEOUTS.RETRY_INTERVAL);
    }
  }

  throw new Error(
    `Button with testId "${testId}" not clickable after ${timeout}ms. Last error: ${lastError?.message || 'unknown'}`
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
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  } = {}
): Promise<void> {
  const timeout = options.timeout || TIMEOUTS.DEFAULT;
  const waitUntil = options.waitUntil || 'networkidle';

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
  options: { timeout?: number } = {}
): Promise<void> {
  const timeout = options.timeout || TIMEOUTS.DEFAULT;
  const startTime = Date.now();
  let lastError: Error | undefined;

  while (Date.now() - startTime < timeout) {
    try {
      const input = page.getByTestId(testId);
      await expect(input).toBeVisible({ timeout: TIMEOUTS.RETRY_INTERVAL * 2 });
      await expect(input).toBeEnabled({ timeout: TIMEOUTS.RETRY_INTERVAL * 2 });
      await input.fill(value);

      // Verify the value was set correctly - use SHORT timeout for inputs with debouncing/validation
      await expect(input).toHaveValue(value, { timeout: TIMEOUTS.SHORT });
      return;
    } catch (error) {
      lastError = error as Error;
      if (Date.now() - startTime >= timeout - TIMEOUTS.RETRY_INTERVAL) {
        console.error(`Failed to fill input "${testId}": ${lastError.message}`);
      }
      // Wait for a frame before retrying
      await page.waitForTimeout(TIMEOUTS.RETRY_INTERVAL);
    }
  }

  throw new Error(
    `Input with testId "${testId}" not fillable after ${timeout}ms. Last error: ${lastError?.message || 'unknown'}`
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
  options: { timeout?: number; exact?: boolean } = {}
): Promise<Locator> {
  const timeout = options.timeout || TIMEOUTS.DEFAULT;
  const exact = options.exact ?? false;
  const startTime = Date.now();
  let lastError: Error | undefined;

  while (Date.now() - startTime < timeout) {
    try {
      const element = page.getByText(text, { exact });
      await expect(element).toBeVisible({ timeout: TIMEOUTS.RETRY_INTERVAL * 2 });
      return element;
    } catch (error) {
      lastError = error as Error;
      if (Date.now() - startTime >= timeout - TIMEOUTS.RETRY_INTERVAL) {
        console.error(`Failed to find text "${text}": ${lastError.message}`);
      }
      // Wait for a frame before retrying
      await page.waitForTimeout(TIMEOUTS.RETRY_INTERVAL);
    }
  }

  throw new Error(
    `Text "${text}" not found after ${timeout}ms. Last error: ${lastError?.message || 'unknown'}`
  );
}
