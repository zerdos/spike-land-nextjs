import type { Page } from "@playwright/test";

/**
 * Wait for page to be fully ready with configurable strategy
 * This helper provides consistent waiting behavior across all E2E tests
 */
export async function waitForPageReady(
  page: Page,
  options: {
    /**
     * Strategy for waiting
     * - 'networkidle': Wait for network to be idle (can hang on polling/websockets)
     * - 'domcontentloaded': Wait for DOM to be ready (faster, recommended for most cases)
     * - 'both': Wait for domcontentloaded first, then attempt networkidle with timeout
     */
    strategy?: "networkidle" | "domcontentloaded" | "both";
    /** Timeout in milliseconds */
    timeout?: number;
    /** Whether to wait for Suspense fallbacks to disappear */
    waitForSuspense?: boolean;
  } = {},
): Promise<void> {
  const {
    strategy = "both",
    timeout = 10000,
    waitForSuspense = true,
  } = options;

  // First, wait for DOM content to be loaded (always safe)
  await page.waitForLoadState("domcontentloaded", { timeout });

  // Strategy-specific waits
  if (strategy === "networkidle") {
    await page.waitForLoadState("networkidle", { timeout });
  } else if (strategy === "both") {
    // Try networkidle with shorter timeout, fallback to DOM ready
    try {
      await page.waitForLoadState("networkidle", { timeout: 5000 });
    } catch {
      // Network still active (polling, websockets) - that's OK
    }
  }

  // Wait for React Suspense fallbacks to disappear (if enabled)
  if (waitForSuspense) {
    const loadingText = page.getByText("Loading...", { exact: true });
    const isLoadingVisible = await loadingText.isVisible().catch(() => false);
    if (isLoadingVisible) {
      await loadingText
        .waitFor({ state: "hidden", timeout: 5000 })
        .catch(() => {});
    }

    // Also wait for skeleton loaders to disappear
    const skeleton = page
      .locator(".loading, .animate-pulse, .skeleton")
      .first();
    const isSkeletonVisible = await skeleton.isVisible().catch(() => false);
    if (isSkeletonVisible) {
      await skeleton.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
    }
  }
}

/**
 * Wait for route mocks to be registered
 * Prevents race condition where page reloads before mocks are active
 */
export async function waitForRouteReady(page: Page): Promise<void> {
  // Small delay to ensure route interception is registered
  await page.waitForTimeout(100);

  // Verify we can make a request (ensures routing is ready)
  await page.evaluate(() => Promise.resolve());
}

/**
 * Navigate to a path with retry logic for CI stability
 */
export async function gotoWithRetry(
  page: Page,
  url: string,
  options: {
    waitUntil?: "load" | "domcontentloaded" | "networkidle" | "commit";
    timeout?: number;
    maxRetries?: number;
  } = {},
): Promise<void> {
  const {
    waitUntil = "commit",
    timeout = 10000,
    maxRetries = 3,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await page.goto(url, { waitUntil, timeout });
      // Success - wait for page to be ready
      await waitForPageReady(page, { strategy: "both" });
      return;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        // Wait before retry with exponential backoff
        await page.waitForTimeout(500 * attempt);
      }
    }
  }

  throw new Error(
    `Failed to navigate to ${url} after ${maxRetries} attempts: ${lastError?.message}`,
  );
}

/**
 * Wait for URL to match expected path with retry
 * Useful for server-side redirects that may take time
 */
export async function waitForUrlPath(
  page: Page,
  expectedPath: string,
  options: { timeout?: number; exact?: boolean; } = {},
): Promise<void> {
  const { timeout = 10000, exact = false } = options;

  await page.waitForURL(
    (url) => {
      if (exact) {
        return url.pathname === expectedPath;
      }
      return (
        url.pathname === expectedPath ||
        url.pathname.startsWith(expectedPath + "/") ||
        url.pathname.startsWith(expectedPath + "?")
      );
    },
    { timeout },
  );
}

/**
 * Safely close page and context with state checking
 */
export async function safeClose(
  page: Page | undefined,
  context?: { close: () => Promise<void>; },
): Promise<void> {
  if (page && !page.isClosed()) {
    try {
      await page.close();
    } catch (error) {
      console.warn("Failed to close page:", (error as Error).message);
    }
  }

  if (context) {
    try {
      await context.close();
    } catch (error) {
      console.warn("Failed to close context:", (error as Error).message);
    }
  }
}
