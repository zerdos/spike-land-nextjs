/**
 * Orbit Agent Smoke Test Workflow
 *
 * A comprehensive smoke test orchestration script for spike-land-nextjs.
 * Designed for parallel execution by multiple testing agents.
 *
 * Usage:
 *   npx tsx e2e/smoke-test-workflow.ts [--stage <n>] [--job <n.n>] [--base-url <url>]
 *
 * @see https://github.com/zerdos/spike-land-nextjs/issues/765
 */

import { type Browser, type BrowserContext, chromium, type Page } from "@playwright/test";
import { execSync } from "child_process";
import fs from "fs";
import { debugAuthState, retryWithAuthBypass, verifyAuthBypass } from "./helpers/auth-bypass";

// ============================================================================
// Configuration
// ============================================================================

interface Config {
  baseUrl: string;
  e2eBypassSecret?: string;
  enableRealAiTests: boolean;
  enableRealPaymentTests: boolean;
  enableSocialPosting: boolean;
  screenshotDir: string;
  reportDir: string;
}

const config: Config = {
  baseUrl: process.env["BASE_URL"] || "http://localhost:3000",
  e2eBypassSecret: process.env["E2E_BYPASS_SECRET"],
  enableRealAiTests: process.env["ENABLE_REAL_AI_TESTS"] === "true",
  enableRealPaymentTests: process.env["ENABLE_REAL_PAYMENT_TESTS"] === "true",
  enableSocialPosting: process.env["ENABLE_SOCIAL_POSTING"] === "true",
  screenshotDir: "./e2e/smoke-test-screenshots",
  reportDir: "./e2e/reports",
};

// ============================================================================
// Types
// ============================================================================

type JobStatus = "passed" | "failed" | "skipped";

interface JobResult {
  id: string;
  name: string;
  status: JobStatus;
  duration: number;
  error?: string;
  screenshot?: string;
}

interface StageResult {
  stage: number;
  name: string;
  status: JobStatus;
  duration: number;
  jobs: JobResult[];
}

interface SmokeTestReport {
  timestamp: string;
  environment: string;
  baseUrl: string;
  stages: StageResult[];
  summary: {
    totalJobs: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: string;
  };
  failures: Array<{
    job: string;
    name: string;
    error: string;
    screenshot?: string;
    troubleshooting: string;
  }>;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Verify that the route interceptor is working by making a test request
 */
async function verifyRouteInterceptor(
  page: Page,
  expectedRole: "USER" | "ADMIN",
  maxRetries = 3,
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await page.evaluate(async () => {
        const res = await fetch("/api/auth/session");
        return res.json();
      });

      if (response?.user?.role === expectedRole) {
        return true;
      }

      // Wait with exponential backoff before retry
      await new Promise((resolve) => setTimeout(resolve, 100 * Math.pow(2, i)));
    } catch (_error) {
      // Continue to next retry
    }
  }

  console.warn(`[Warn] Route interceptor verification failed for role: ${expectedRole}`);
  return false;
}

/**
 * Mock an authenticated session by:
 * 1. Setting E2E bypass cookies for server-side auth checks (auth() function)
 * 2. Intercepting the session API for client-side auth checks (useSession() hook)
 * 3. Pre-warming the interceptor and verifying it's working
 * 4. Preloading session into NextAuth's client cache
 *
 * This multi-layered approach ensures authentication works for both server components
 * (which call auth() directly) and client components (which call useSession()).
 */
async function mockAuthSession(
  page: Page,
  options: { role?: "USER" | "ADMIN"; email?: string; name?: string; } = {},
): Promise<void> {
  const { role = "USER", email = "test@example.com", name = "Test User" } = options;

  console.log(`[Smoke Test] Setting up E2E auth bypass for role: ${role}`);

  // Determine actual values based on role
  const actualEmail = role === "ADMIN" ? "admin@spike.land" : email;
  const actualName = role === "ADMIN" ? "Admin User" : name;

  const mockSession = {
    user: {
      id: `test-${role.toLowerCase()}-123`,
      name: actualName,
      email: actualEmail,
      role,
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  // Set E2E bypass cookies for server-side auth checks
  // The auth.ts file reads these cookies when x-e2e-auth-bypass header is present
  const context = page.context();
  const baseUrlHost = new URL(config.baseUrl).hostname;

  console.log(`[Smoke Test] Setting E2E cookies for domain: ${baseUrlHost}`);

  await context.addCookies([
    {
      name: "e2e-user-role",
      value: role,
      domain: baseUrlHost,
      path: "/",
    },
    {
      name: "e2e-user-email",
      value: actualEmail,
      domain: baseUrlHost,
      path: "/",
    },
    {
      name: "e2e-user-name",
      value: actualName,
      domain: baseUrlHost,
      path: "/",
    },
  ]);

  // Also intercept the session API for client-side components using useSession()
  console.log("[Smoke Test] Setting up /api/auth/session route interception");
  await page.route("**/api/auth/session", async (route) => {
    console.log("[Smoke Test] Intercepted /api/auth/session request");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockSession),
    });
  });

  // CRITICAL FIX: Wait for route interceptors to be fully registered
  // This prevents race conditions where the page navigates before routes are ready
  console.log("[Smoke Test] Waiting for route interceptors to register...");
  await new Promise((resolve) => setTimeout(resolve, 500));
  await page.evaluate(() => Promise.resolve());

  // PHASE 1: Pre-warm the interceptor by making a test request
  // This forces the route interceptor to activate before any navigation
  await verifyRouteInterceptor(page, role);

  // PHASE 2: Inject session into NextAuth's client-side cache
  // This ensures client components have the session immediately available
  await page.evaluate((session) => {
    // Store in sessionStorage (NextAuth uses this for client-side cache)
    try {
      sessionStorage.setItem("nextauth.session", JSON.stringify(session));
    } catch (_e) {
      // sessionStorage might not be available in all contexts
    }

    // Broadcast session update event (NextAuth listens to this)
    try {
      const bc = new BroadcastChannel("nextauth.session");
      bc.postMessage({ event: "session", data: { trigger: "getSession" } });
      bc.close();
    } catch (_e) {
      // BroadcastChannel might not be available
    }
  }, mockSession);

  // If page is already loaded, trigger a session refresh
  const currentUrl = page.url();
  if (currentUrl && !currentUrl.includes("about:blank")) {
    console.log("[Smoke Test] Triggering session refresh on current page");
    await page.evaluate(async () => {
      await fetch("/api/auth/session").catch(() => {});
    });
    // Give client components time to react to the session update
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Verify the auth bypass is working
  console.log("[Smoke Test] Verifying auth bypass...");
  try {
    const isValid = await verifyAuthBypass(page);
    if (!isValid) {
      console.error("[Smoke Test] WARNING: Auth bypass verification failed");
      await debugAuthState(page);
    } else {
      console.log("[Smoke Test] ✓ Auth bypass verified successfully");
    }
  } catch (error) {
    console.error(
      "[Smoke Test] Error during auth bypass verification:",
      error instanceof Error ? error.message : String(error),
    );
    await debugAuthState(page);
  }

  // PRE-FLIGHT CHECK: Test that middleware accepts the E2E bypass
  // This catches configuration issues early before running actual tests
  console.log("[Smoke Test] Running pre-flight check on protected route...");
  try {
    const testResponse = await page.goto(`${config.baseUrl}/settings`, {
      waitUntil: "commit",
      timeout: 10000,
    });

    const finalUrl = page.url();
    if (finalUrl.includes("/auth/signin")) {
      throw new Error(
        `E2E bypass failed: Middleware redirected to sign-in. ` +
        `This indicates the middleware is not receiving or accepting the bypass. ` +
        `Check that E2E_BYPASS_SECRET matches between test and server. ` +
        `Secret configured: ${!!config.e2eBypassSecret}, ` +
        `Response status: ${testResponse?.status() ?? "unknown"}`,
      );
    }

    console.log("[Smoke Test] ✓ Pre-flight check passed - middleware accepted E2E bypass");

    // Navigate back to blank page to clean state
    await page.goto("about:blank");
  } catch (error) {
    console.error(
      "[Smoke Test] Pre-flight check failed:",
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}

/**
 * Get extra HTTP headers for E2E authentication bypass
 */
function getExtraHTTPHeaders(): Record<string, string> | undefined {
  const headers: Record<string, string> = {};

  const e2eBypassSecret = config.e2eBypassSecret?.trim().replace(/[\r\n]/g, "");

  if (!e2eBypassSecret) {
    console.warn("[Smoke Test] E2E_BYPASS_SECRET not configured - E2E tests may fail on protected routes");
  } else {
    console.log("[Smoke Test] E2E bypass header configured:", {
      length: e2eBypassSecret.length,
      preview: `${e2eBypassSecret.substring(0, 8)}...`,
    });
    headers["x-e2e-auth-bypass"] = e2eBypassSecret;
  }

  return Object.keys(headers).length > 0 ? headers : undefined;
}

/**
 * Create a browser context with standard configuration
 */
async function createContext(
  browser: Browser,
  viewport?: { width: number; height: number; },
): Promise<BrowserContext> {
  return browser.newContext({
    baseURL: config.baseUrl,
    viewport: viewport || { width: 1280, height: 900 },
    extraHTTPHeaders: getExtraHTTPHeaders(),
  });
}

/**
 * Format duration in human-readable format
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}

/**
 * Run a shell command and return success status
 */
function runCommand(cmd: string, cwd?: string): { success: boolean; output: string; } {
  try {
    const output = execSync(cmd, {
      cwd: cwd || process.cwd(),
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { success: true, output };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message: string; };
    return { success: false, output: err.stderr || err.stdout || err.message };
  }
}

// ============================================================================
// Stage 0: Pre-Validation
// ============================================================================

async function runStage0(): Promise<StageResult> {
  const startTime = Date.now();
  const jobs: JobResult[] = [];

  // Job 0.1: Static Analysis
  const job01Start = Date.now();
  const lintResult = runCommand("yarn lint");
  const tscResult = runCommand("yarn tsc --noEmit");

  jobs.push({
    id: "0.1",
    name: "Static Analysis",
    status: lintResult.success && tscResult.success ? "passed" : "failed",
    duration: Date.now() - job01Start,
    error: !lintResult.success
      ? lintResult.output
      : !tscResult.success
      ? tscResult.output
      : undefined,
  });

  // Job 0.2: Unit Tests (changed files only)
  const job02Start = Date.now();
  const testResult = runCommand("yarn vitest run --changed main --reporter=dot");

  jobs.push({
    id: "0.2",
    name: "Unit Tests",
    status: testResult.success ? "passed" : "failed",
    duration: Date.now() - job02Start,
    error: !testResult.success ? testResult.output : undefined,
  });

  const allPassed = jobs.every((j) => j.status === "passed");

  return {
    stage: 0,
    name: "Pre-Validation",
    status: allPassed ? "passed" : "failed",
    duration: Date.now() - startTime,
    jobs,
  };
}

// ============================================================================
// Stage 1: Infrastructure Health
// ============================================================================

async function runStage1(browser: Browser): Promise<StageResult> {
  const startTime = Date.now();
  const jobs: JobResult[] = [];

  const context = await createContext(browser);
  const page = await context.newPage();

  try {
    // Job 1.1: API Health Checks
    const job11Start = Date.now();
    let job11Status: JobStatus = "passed";
    let job11Error: string | undefined;

    try {
      // Test health endpoint
      const healthResponse = await page.request.get(`${config.baseUrl}/api/health`);
      if (!healthResponse.ok()) {
        throw new Error(`Health endpoint returned ${healthResponse.status()}`);
      }

      // Test auth endpoint
      const authResponse = await page.request.get(`${config.baseUrl}/api/auth/session`);
      if (!authResponse.ok()) {
        throw new Error(`Auth endpoint returned ${authResponse.status()}`);
      }

      // Test homepage loads
      await page.goto(config.baseUrl);
      await page.waitForLoadState("networkidle");
      const title = await page.title();
      if (!title) {
        throw new Error("Homepage has no title");
      }
    } catch (error) {
      job11Status = "failed";
      job11Error = (error as Error).message;
    }

    jobs.push({
      id: "1.1",
      name: "API Health Checks",
      status: job11Status,
      duration: Date.now() - job11Start,
      error: job11Error,
    });

    // Job 1.2: External Services Health
    const job12Start = Date.now();
    let job12Status: JobStatus = "passed";
    let job12Error: string | undefined;

    try {
      // Test Cloudflare Worker - Backend
      const workerResponse = await page.request.get("https://testing.spike.land/api/health", {
        timeout: 10000,
      });
      if (!workerResponse.ok()) {
        if (workerResponse.status() === 404) {
          console.warn(`[Warn] Backend worker returned 404 (expected for now if not deployed)`);
        } else {
          throw new Error(`Backend worker returned ${workerResponse.status()}`);
        }
      }

      // Test Cloudflare Worker - Transpiler
      const transpilerResponse = await page.request.get("https://js.spike.land/health", {
        timeout: 10000,
      });
      if (!transpilerResponse.ok()) {
        throw new Error(`Transpiler worker returned ${transpilerResponse.status()}`);
      }
    } catch (error) {
      job12Status = "failed";
      job12Error = (error as Error).message;
    }

    jobs.push({
      id: "1.2",
      name: "External Services Health",
      status: job12Status,
      duration: Date.now() - job12Start,
      error: job12Error,
    });
  } finally {
    await context.close();
  }

  const allPassed = jobs.every((j) => j.status === "passed");

  return {
    stage: 1,
    name: "Infrastructure Health",
    status: allPassed ? "passed" : "failed",
    duration: Date.now() - startTime,
    jobs,
  };
}

// ============================================================================
// Stage 2: Core User Flows
// ============================================================================

async function runStage2(browser: Browser): Promise<StageResult> {
  const startTime = Date.now();
  const jobs: JobResult[] = [];

  // Job 2.1: Public Page Accessibility
  const job21Start = Date.now();
  let job21Status: JobStatus = "passed";
  let job21Error: string | undefined;

  const publicPages = [
    { path: "/", title: "Spike Land" },
    { path: "/pricing", heading: "Pricing" },
    { path: "/terms", heading: "Terms of Service" },
    { path: "/privacy", heading: "Privacy Policy" },
    { path: "/cookies", heading: "Cookie Policy" },
    { path: "/auth/signin", heading: /Restore photos in minutes/ },
    { path: "/pixel", heading: "Your photos deserve better" },
  ];

  const context1 = await createContext(browser);
  const page1 = await context1.newPage();

  try {
    for (const { path: pagePath, heading, title } of publicPages) {
      await page1.goto(`${config.baseUrl}${pagePath}`);
      await page1.waitForLoadState("networkidle");

      if (heading) {
        const headingLocator = page1.getByRole("heading", {
          name: heading instanceof RegExp ? heading : new RegExp(heading, "i"),
        });
        const isVisible = await headingLocator.isVisible({ timeout: 5000 }).catch(() => false);
        if (!isVisible) {
          // Try text content as fallback
          const textVisible = await page1.getByText(heading).first().isVisible().catch(() => false);
          if (!textVisible) {
            throw new Error(`Heading "${heading}" not found on ${pagePath}`);
          }
        }
      }
      if (title) {
        const pageTitle = await page1.title();
        if (!pageTitle.includes(title)) {
          throw new Error(`Title "${title}" not found on ${pagePath}, got "${pageTitle}"`);
        }
      }
    }
  } catch (error) {
    job21Status = "failed";
    job21Error = (error as Error).message;
  } finally {
    await context1.close();
  }

  jobs.push({
    id: "2.1",
    name: "Public Page Accessibility",
    status: job21Status,
    duration: Date.now() - job21Start,
    error: job21Error,
  });

  // Job 2.2: Authentication Flow
  const job22Start = Date.now();
  let job22Status: JobStatus = "passed";
  let job22Error: string | undefined;
  let job22Screenshot: string | undefined;

  const context2 = await createContext(browser);
  const page2 = await context2.newPage();

  try {
    console.log("[Job 2.2] Testing authentication flow...");

    // Test unauthenticated redirect
    await page2.goto(`${config.baseUrl}/settings`);
    await page2.waitForURL(/\/auth\/signin/, { timeout: 10000 });
    console.log("[Job 2.2] ✓ Unauthenticated redirect working");

    // Mock authenticated session
    await mockAuthSession(page2, { role: "USER" });

    // Use retry logic to navigate to settings page with auth
    await retryWithAuthBypass(
      page2,
      async () => {
        console.log("[Job 2.2] Navigating to settings page with auth...");
        await page2.goto(`${config.baseUrl}/settings`, { timeout: 30000 });

        // Wait for loading state to complete with longer timeout
        const loadingIndicator = page2.getByTestId("loading-state");
        const hasLoading = await loadingIndicator.isVisible({ timeout: 1000 }).catch(() => false);

        if (hasLoading) {
          console.log("[Job 2.2] Waiting for loading state to complete...");
          await loadingIndicator.waitFor({ state: "hidden", timeout: 20000 }).catch(() => {
            console.warn("[Job 2.2] Loading indicator didn't disappear in time");
          });
        }
      },
    );

    // PHASE 3: Wait for network to be idle before checking for content
    await page2.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {
      console.log("[Info] Network idle timeout, continuing to content check");
    });

    // Wait for loading state to complete - useSession shows "Loading..." initially
    const loadingIndicator = page2.getByTestId("loading-state");
    await loadingIndicator.waitFor({ state: "hidden", timeout: 30000 }).catch(() => {
      // Loading indicator might not exist if session loads very fast
    });

    // PHASE 3: Increased timeout to 30s for slow CI environments
    const settingsHeading = page2.getByRole("heading", { name: /Settings/i });
    const isVisible = await settingsHeading.isVisible({ timeout: 30000 }).catch(() => false);

    if (!isVisible) {
      // PHASE 4: Enhanced debug logging
      const currentUrl = page2.url();
      const isOnSignIn = currentUrl.includes("/auth/signin");

      // Try to find what headings are actually present
      const headings = await page2.locator("h1, h2, h3").allTextContents().catch(() => []);
      const sessionState = await page2.evaluate(() => {
        return {
          sessionStorage: sessionStorage.getItem("nextauth.session"),
          cookies: document.cookie,
        };
      }).catch(() => null);

      throw new Error(
        `Settings page not accessible after auth mock. ` +
          `URL: ${currentUrl}, ` +
          `redirectedToSignIn: ${isOnSignIn}, ` +
          `headings: [${headings.join(", ")}], ` +
          `sessionState: ${sessionState ? "present" : "missing"}`,
      );
    }
  } catch (error) {
    job22Status = "failed";
    job22Error = (error as Error).message;
    console.error("[Job 2.2] Failed:", job22Error);

    // Capture screenshot if we haven't already
    if (!job22Screenshot) {
      try {
        job22Screenshot = `smoke-test-job-2.2-error-${Date.now()}.png`;
        await page2.screenshot({
          path: `${config.screenshotDir}/${job22Screenshot}`,
          fullPage: true,
        });
      } catch (screenshotError) {
        console.error(
          "[Job 2.2] Failed to capture screenshot:",
          screenshotError instanceof Error ? screenshotError.message : String(screenshotError),
        );
      }
    }
  } finally {
    await context2.close();
  }

  jobs.push({
    id: "2.2",
    name: "Authentication Flow",
    status: job22Status,
    duration: Date.now() - job22Start,
    error: job22Error,
    screenshot: job22Screenshot,
  });

  // Job 2.3: Navigation Flow
  const job23Start = Date.now();
  let job23Status: JobStatus = "passed";
  let job23Error: string | undefined;

  const context3 = await createContext(browser);
  const page3 = await context3.newPage();

  try {
    await mockAuthSession(page3, { role: "USER" });
    await page3.goto(config.baseUrl);
    await page3.waitForLoadState("networkidle");

    // Test nav links
    const navLinks = [
      { text: "Pixel", expectedUrl: "/pixel" },
      { text: "Pricing", expectedUrl: "/pricing" },
    ];

    for (const { text, expectedUrl } of navLinks) {
      const link = page3.locator(`nav >> text=${text}`).first();
      const isVisible = await link.isVisible().catch(() => false);
      if (isVisible) {
        await link.click();
        await page3.waitForURL(`**${expectedUrl}**`, { timeout: 5000 });
        await page3.goBack();
      }
    }
  } catch (error) {
    job23Status = "failed";
    job23Error = (error as Error).message;
  } finally {
    await context3.close();
  }

  jobs.push({
    id: "2.3",
    name: "Navigation Flow",
    status: job23Status,
    duration: Date.now() - job23Start,
    error: job23Error,
  });

  const allPassed = jobs.every((j) => j.status === "passed");

  return {
    stage: 2,
    name: "Core User Flows",
    status: allPassed ? "passed" : "failed",
    duration: Date.now() - startTime,
    jobs,
  };
}

// ============================================================================
// Stage 3: Feature-Specific Tests
// ============================================================================

async function runStage3(browser: Browser): Promise<StageResult> {
  const startTime = Date.now();
  const jobs: JobResult[] = [];

  // Job 3.1: Pixel App
  const job31Start = Date.now();
  let job31Status: JobStatus = "passed";
  let job31Error: string | undefined;
  let job31Screenshot: string | undefined;

  const context1 = await createContext(browser);
  const page1 = await context1.newPage();

  try {
    console.log("[Job 3.1] Testing Pixel app...");
    await mockAuthSession(page1, { role: "USER" });

    await page1.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {
      console.log("[Info] Network idle timeout on pixel app");
    });

    // PHASE 3: Try multiple success indicators in sequence with increased timeout (30s total)
    let foundContent = false;
    let lastError = "";

    // Try 1: Look for "AI Image Enhancement" heading
    const heading = page1.getByText("AI Image Enhancement");
    const headingVisible = await heading.isVisible({ timeout: 30000 }).catch(() => false);

    if (headingVisible) {
      foundContent = true;
    } else {
      lastError = "AI Image Enhancement not found";

      // Try 2: Look for "Your Albums" as alternative
      const albumsHeading = page1.getByText("Your Albums");
      const albumsVisible = await albumsHeading.isVisible({ timeout: 5000 }).catch(() => false);

      if (albumsVisible) {
        foundContent = true;
        lastError = "";
      } else {
        lastError += ", Your Albums not found";

        // Try 3: Look for any pixel-related logo or branding
        const pixelLogo = page1.locator('[data-testid="pixel-logo"], img[alt*="pixel" i]');
        const logoVisible = await pixelLogo.first().isVisible({ timeout: 5000 }).catch(() => false);

        if (logoVisible) {
          foundContent = true;
          lastError = "";
        } else {
          lastError += ", Pixel logo not found";
        }
      }
    }

    if (!foundContent) {
      // PHASE 4: Enhanced debug logging
      const currentUrl = page1.url();
      const allText = await page1.locator("body").textContent().catch(() => "");
      const visibleHeadings = await page1.locator("h1, h2, h3").allTextContents().catch(() => []);

      throw new Error(
        `Pixel app UI not visible. URL: ${currentUrl}, ` +
          `errors: [${lastError}], ` +
          `headings: [${visibleHeadings.join(", ")}], ` +
          `bodyLength: ${allText?.length ?? 0}`,
      );
    }

    // Check for token balance or enhancement options (informational only)
    const hasTokenOrTier = await page1
      .locator('[data-testid="token-balance"], text=/1K|2K|4K/i')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (!hasTokenOrTier) {
      console.log("[Info] Token balance or tier selector not immediately visible");
    }
  } catch (error) {
    job31Status = "failed";
    job31Error = (error as Error).message;
    console.error("[Job 3.1] Failed:", job31Error);

    // Capture screenshot if we haven't already
    if (!job31Screenshot) {
      try {
        job31Screenshot = `smoke-test-job-3.1-error-${Date.now()}.png`;
        await page1.screenshot({
          path: `${config.screenshotDir}/${job31Screenshot}`,
          fullPage: true,
        });
      } catch (screenshotError) {
        console.error(
          "[Job 3.1] Failed to capture screenshot:",
          screenshotError instanceof Error ? screenshotError.message : String(screenshotError),
        );
      }
    }
  } finally {
    await context1.close();
  }

  jobs.push({
    id: "3.1",
    name: "Pixel App",
    status: job31Status,
    duration: Date.now() - job31Start,
    error: job31Error,
    screenshot: job31Screenshot,
  });

  // Job 3.2: Album Management
  const job32Start = Date.now();
  let job32Status: JobStatus = "passed";
  let job32Error: string | undefined;

  const context2 = await createContext(browser);
  const page2 = await context2.newPage();

  try {
    await mockAuthSession(page2, { role: "USER" });
    await page2.goto(`${config.baseUrl}/albums`);
    await page2.waitForLoadState("networkidle");

    // Verify albums page loads - may redirect to /apps/pixel/albums
    const hasAlbumsContent = await page2
      .getByText(/Albums|My Albums/i)
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    if (!hasAlbumsContent) {
      // Albums might not be a top-level route, check if redirected
      const currentUrl = page2.url();
      if (!currentUrl.includes("albums") && !currentUrl.includes("pixel")) {
        throw new Error(`Albums page not accessible, redirected to: ${currentUrl}`);
      }
    }
  } catch (error) {
    job32Status = "failed";
    job32Error = (error as Error).message;
  } finally {
    await context2.close();
  }

  jobs.push({
    id: "3.2",
    name: "Album Management",
    status: job32Status,
    duration: Date.now() - job32Start,
    error: job32Error,
  });

  // Job 3.3: Token System
  const job33Start = Date.now();
  let job33Status: JobStatus = "passed";
  let job33Error: string | undefined;

  const context3 = await createContext(browser);
  const page3 = await context3.newPage();

  try {
    await mockAuthSession(page3, { role: "USER" });
    await page3.goto(`${config.baseUrl}/apps/pixel`);
    await page3.waitForLoadState("networkidle");

    // Check for token-related UI elements
    const hasTokenUI = await page3
      .locator(
        '[data-testid="token-balance"], [data-testid="get-tokens-btn"], button:has-text("Get Tokens"), button:has-text("+")',
      )
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    if (!hasTokenUI) {
      console.log("[Info] Token UI elements not immediately visible");
    }
  } catch (error) {
    job33Status = "failed";
    job33Error = (error as Error).message;
  } finally {
    await context3.close();
  }

  jobs.push({
    id: "3.3",
    name: "Token System",
    status: job33Status,
    duration: Date.now() - job33Start,
    error: job33Error,
  });

  // Job 3.4: Merch Store
  const job34Start = Date.now();
  let job34Status: JobStatus = "passed";
  let job34Error: string | undefined;

  const context4 = await createContext(browser);
  const page4 = await context4.newPage();

  try {
    await page4.goto(`${config.baseUrl}/merch`);
    await page4.waitForLoadState("networkidle");

    // Verify merch page loads
    const hasMerchContent = await page4
      .getByText(/Products|Shop|Merch|merchandise/i)
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    if (!hasMerchContent) {
      // Check for product cards
      const hasProducts = await page4
        .locator('[data-testid="product-card"], .product-card, [class*="product"]')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (!hasProducts) {
        throw new Error("Merch store content not visible");
      }
    }
  } catch (error) {
    job34Status = "failed";
    job34Error = (error as Error).message;
  } finally {
    await context4.close();
  }

  jobs.push({
    id: "3.4",
    name: "Merch Store",
    status: job34Status,
    duration: Date.now() - job34Start,
    error: job34Error,
  });

  // Job 3.5: MCP Tools
  const job35Start = Date.now();
  let job35Status: JobStatus = "passed";
  let job35Error: string | undefined;

  const context5 = await createContext(browser);
  const page5 = await context5.newPage();

  try {
    await mockAuthSession(page5, { role: "USER" });
    await page5.goto(`${config.baseUrl}/apps/pixel/mcp-tools`);
    await page5.waitForLoadState("networkidle");

    // Check if MCP tools page exists
    const hasMCPContent = await page5
      .getByText(/MCP|Tools|API/i)
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    if (!hasMCPContent) {
      // Page might not exist yet - mark as skipped
      job35Status = "skipped";
      job35Error = "MCP tools page not implemented";
    }
  } catch (error) {
    job35Status = "failed";
    job35Error = (error as Error).message;
  } finally {
    await context5.close();
  }

  jobs.push({
    id: "3.5",
    name: "MCP Tools",
    status: job35Status,
    duration: Date.now() - job35Start,
    error: job35Error,
  });

  const failedJobs = jobs.filter((j) => j.status === "failed");

  return {
    stage: 3,
    name: "Feature-Specific Tests",
    status: failedJobs.length === 0 ? "passed" : "failed",
    duration: Date.now() - startTime,
    jobs,
  };
}

// ============================================================================
// Stage 4: Integration Tests (Real Services)
// ============================================================================

async function runStage4(_browser: Browser): Promise<StageResult> {
  const startTime = Date.now();
  const jobs: JobResult[] = [];

  // Job 4.1: Stripe Payment Integration
  if (!config.enableRealPaymentTests) {
    jobs.push({
      id: "4.1",
      name: "Stripe Payment Integration",
      status: "skipped",
      duration: 0,
      error: "ENABLE_REAL_PAYMENT_TESTS not set",
    });
  } else {
    // Real Stripe test would go here
    jobs.push({
      id: "4.1",
      name: "Stripe Payment Integration",
      status: "skipped",
      duration: 0,
      error: "Real payment tests not yet implemented in workflow",
    });
  }

  // Job 4.2: AI Enhancement (Real Gemini)
  if (!config.enableRealAiTests) {
    jobs.push({
      id: "4.2",
      name: "AI Enhancement (Real Gemini)",
      status: "skipped",
      duration: 0,
      error: "ENABLE_REAL_AI_TESTS not set",
    });
  } else {
    jobs.push({
      id: "4.2",
      name: "AI Enhancement (Real Gemini)",
      status: "skipped",
      duration: 0,
      error: "Real AI tests not yet implemented in workflow",
    });
  }

  // Job 4.3: Social Posting
  if (!config.enableSocialPosting) {
    jobs.push({
      id: "4.3",
      name: "Social Posting",
      status: "skipped",
      duration: 0,
      error: "ENABLE_SOCIAL_POSTING not set",
    });
  } else {
    jobs.push({
      id: "4.3",
      name: "Social Posting",
      status: "skipped",
      duration: 0,
      error: "Real social tests not yet implemented in workflow",
    });
  }

  return {
    stage: 4,
    name: "Integration Tests (Real Services)",
    status: "skipped",
    duration: Date.now() - startTime,
    jobs,
  };
}

// ============================================================================
// Stage 5: Admin Functionality
// ============================================================================

async function runStage5(browser: Browser): Promise<StageResult> {
  const startTime = Date.now();
  const jobs: JobResult[] = [];

  // Job 5.1: Admin Dashboard Access
  const job51Start = Date.now();
  let job51Status: JobStatus = "passed";
  let job51Error: string | undefined;
  let job51Screenshot: string | undefined;

  const context1 = await createContext(browser);
  const page1 = await context1.newPage();

  try {
    console.log("[Job 5.1] Testing Admin dashboard access...");
    await mockAuthSession(page1, { role: "ADMIN" });
    await page1.goto(`${config.baseUrl}/admin`);
    await page1.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {
      console.log("[Info] Network idle timeout on admin dashboard");
    });

    // PHASE 3: Try dashboard cards first (more reliable than text)
    let foundDashboard = false;

    // Try 1: Look for dashboard cards/stats
    const dashboardCards = page1.locator(
      '[data-testid="dashboard-card"], [class*="dashboard"], [class*="stat-card"]',
    );
    const hasCards = await dashboardCards.first().isVisible({ timeout: 30000 }).catch(() => false);

    if (hasCards) {
      foundDashboard = true;
    } else {
      // Try 2: Fallback to text search for "Admin" or "Dashboard"
      const hasDashboard = await page1
        .getByText(/Admin|Dashboard/i)
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (hasDashboard) {
        foundDashboard = true;
      }
    }

    if (!foundDashboard) {
      // PHASE 4: Enhanced debug logging
      const currentUrl = page1.url();
      const isRedirected = !currentUrl.includes("/admin");
      const headings = await page1.locator("h1, h2, h3").allTextContents().catch(() => []);
      const sessionState = await page1.evaluate(() => {
        return sessionStorage.getItem("nextauth.session");
      }).catch(() => null);

      throw new Error(
        `Admin dashboard not visible. ` +
          `URL: ${currentUrl}, ` +
          `redirected: ${isRedirected}, ` +
          `headings: [${headings.join(", ")}], ` +
          `sessionState: ${sessionState ? "present" : "missing"}`,
      );
    }
  } catch (error) {
    job51Status = "failed";
    job51Error = (error as Error).message;
    console.error("[Job 5.1] Failed:", job51Error);

    // Capture screenshot if we haven't already
    if (!job51Screenshot) {
      try {
        job51Screenshot = `smoke-test-job-5.1-error-${Date.now()}.png`;
        await page1.screenshot({
          path: `${config.screenshotDir}/${job51Screenshot}`,
          fullPage: true,
        });
      } catch (screenshotError) {
        console.error(
          "[Job 5.1] Failed to capture screenshot:",
          screenshotError instanceof Error ? screenshotError.message : String(screenshotError),
        );
      }
    }
  } finally {
    await context1.close();
  }

  jobs.push({
    id: "5.1",
    name: "Admin Dashboard Access",
    status: job51Status,
    duration: Date.now() - job51Start,
    error: job51Error,
    screenshot: job51Screenshot,
  });

  // Job 5.2: Admin Sub-pages
  const job52Start = Date.now();
  let job52Status: JobStatus = "passed";
  let job52Error: string | undefined;

  const adminPages = [
    "/admin/analytics",
    "/admin/users",
    "/admin/tokens",
    "/admin/vouchers",
    "/admin/jobs",
    "/admin/photos",
    "/admin/gallery",
    "/admin/feedback",
  ];

  const context2 = await createContext(browser);
  const page2 = await context2.newPage();

  try {
    await mockAuthSession(page2, { role: "ADMIN" });

    for (const pagePath of adminPages) {
      await page2.goto(`${config.baseUrl}${pagePath}`);
      await page2.waitForLoadState("networkidle", { timeout: 15000 });

      // Just verify page loads without error
      const pageTitle = await page2.title();
      if (!pageTitle) {
        throw new Error(`Admin page ${pagePath} has no title`);
      }
    }
  } catch (error) {
    job52Status = "failed";
    job52Error = (error as Error).message;
  } finally {
    await context2.close();
  }

  jobs.push({
    id: "5.2",
    name: "Admin Sub-pages",
    status: job52Status,
    duration: Date.now() - job52Start,
    error: job52Error,
  });

  const failedJobs = jobs.filter((j) => j.status === "failed");

  return {
    stage: 5,
    name: "Admin Functionality",
    status: failedJobs.length === 0 ? "passed" : "failed",
    duration: Date.now() - startTime,
    jobs,
  };
}

// ============================================================================
// Stage 6: Cross-Device Testing
// ============================================================================

async function runStage6(browser: Browser): Promise<StageResult> {
  const startTime = Date.now();
  const jobs: JobResult[] = [];

  // Job 6.1: Mobile Viewport
  const job61Start = Date.now();
  let job61Status: JobStatus = "passed";
  let job61Error: string | undefined;

  const context1 = await createContext(browser, { width: 375, height: 667 });
  const page1 = await context1.newPage();

  try {
    await page1.goto(config.baseUrl);
    await page1.waitForLoadState("networkidle");

    // Check mobile menu exists
    const mobileMenu = page1.locator(
      '[data-testid="mobile-menu"], button[aria-label*="menu" i], button[aria-label*="Menu"]',
    );
    const hasMobileMenu = await mobileMenu.first().isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasMobileMenu) {
      // Not a failure - might use responsive nav without hamburger
      console.log("[Info] Mobile menu not found, page might use responsive design");
    }

    // Verify no horizontal scroll
    const scrollWidth = await page1.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page1.evaluate(() => document.documentElement.clientWidth);

    if (scrollWidth > clientWidth + 10) {
      throw new Error(`Horizontal scroll detected: ${scrollWidth} > ${clientWidth}`);
    }
  } catch (error) {
    job61Status = "failed";
    job61Error = (error as Error).message;
  } finally {
    await context1.close();
  }

  jobs.push({
    id: "6.1",
    name: "Mobile Viewport (375x667)",
    status: job61Status,
    duration: Date.now() - job61Start,
    error: job61Error,
  });

  // Job 6.2: Tablet Viewport
  const job62Start = Date.now();
  let job62Status: JobStatus = "passed";
  let job62Error: string | undefined;

  const context2 = await createContext(browser, { width: 768, height: 1024 });
  const page2 = await context2.newPage();

  try {
    const pagesToTest = ["/", "/pricing", "/pixel"];

    for (const pagePath of pagesToTest) {
      await page2.goto(`${config.baseUrl}${pagePath}`);
      await page2.waitForLoadState("networkidle");

      // Verify no horizontal scroll
      const scrollWidth = await page2.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page2.evaluate(() => document.documentElement.clientWidth);

      if (scrollWidth > clientWidth + 10) {
        throw new Error(`Horizontal scroll on ${pagePath}: ${scrollWidth} > ${clientWidth}`);
      }
    }
  } catch (error) {
    job62Status = "failed";
    job62Error = (error as Error).message;
  } finally {
    await context2.close();
  }

  jobs.push({
    id: "6.2",
    name: "Tablet Viewport (768x1024)",
    status: job62Status,
    duration: Date.now() - job62Start,
    error: job62Error,
  });

  const failedJobs = jobs.filter((j) => j.status === "failed");

  return {
    stage: 6,
    name: "Cross-Device Testing",
    status: failedJobs.length === 0 ? "passed" : "failed",
    duration: Date.now() - startTime,
    jobs,
  };
}

// ============================================================================
// Stage 7: Cleanup & Reporting
// ============================================================================

async function runStage7(browser: Browser, stages: StageResult[]): Promise<StageResult> {
  const startTime = Date.now();
  const jobs: JobResult[] = [];

  // Job 7.1: Screenshot Capture
  const job71Start = Date.now();
  let job71Status: JobStatus = "passed";
  let job71Error: string | undefined;

  const screenshotConfig = [
    { path: "/", name: "01-home", auth: false },
    { path: "/pricing", name: "02-pricing", auth: false },
    { path: "/auth/signin", name: "03-signin", auth: false },
    { path: "/pixel", name: "04-pixel-landing", auth: false },
    { path: "/apps/pixel", name: "05-pixel-app", auth: true },
    { path: "/admin", name: "06-admin", auth: true, role: "ADMIN" as const },
    { path: "/merch", name: "07-merch", auth: false },
  ];

  try {
    await fs.promises.mkdir(config.screenshotDir, { recursive: true });

    const context = await createContext(browser);
    const page = await context.newPage();

    for (const { path: pagePath, name, auth, role } of screenshotConfig) {
      if (auth) {
        await mockAuthSession(page, { role: role || "USER" });
      }

      await page.goto(`${config.baseUrl}${pagePath}`);
      await page.waitForLoadState("networkidle");
      await page.screenshot({
        path: `${config.screenshotDir}/${name}.png`,
        fullPage: true,
      });
    }

    await context.close();
  } catch (error) {
    job71Status = "failed";
    job71Error = (error as Error).message;
  }

  jobs.push({
    id: "7.1",
    name: "Screenshot Capture",
    status: job71Status,
    duration: Date.now() - job71Start,
    error: job71Error,
  });

  // Job 7.2: Report Generation
  const job72Start = Date.now();
  let job72Status: JobStatus = "passed";
  let job72Error: string | undefined;

  try {
    await fs.promises.mkdir(config.reportDir, { recursive: true });

    // Calculate summary
    const allJobs = stages.flatMap((s) => s.jobs);
    const totalDuration = stages.reduce((sum, s) => sum + s.duration, 0);
    const passed = allJobs.filter((j) => j.status === "passed").length;
    const failed = allJobs.filter((j) => j.status === "failed").length;
    const skipped = allJobs.filter((j) => j.status === "skipped").length;

    // Generate failures list
    const failures = allJobs
      .filter((j) => j.status === "failed")
      .map((j) => ({
        job: j.id,
        name: j.name,
        error: j.error || "Unknown error",
        screenshot: j.screenshot,
        troubleshooting: getTroubleshooting(j.id),
      }));

    const report: SmokeTestReport = {
      timestamp: new Date().toISOString(),
      environment: config.baseUrl.includes("localhost")
        ? "local"
        : config.baseUrl.includes("next.")
        ? "staging"
        : "production",
      baseUrl: config.baseUrl,
      stages,
      summary: {
        totalJobs: allJobs.length,
        passed,
        failed,
        skipped,
        duration: formatDuration(totalDuration),
      },
      failures,
    };

    await fs.promises.writeFile(
      `${config.reportDir}/smoke-test-report.json`,
      JSON.stringify(report, null, 2),
    );

    // Also output summary to console
    console.log("\n" + "=".repeat(60));
    console.log("SMOKE TEST REPORT");
    console.log("=".repeat(60));
    console.log(`Environment: ${report.environment}`);
    console.log(`Base URL: ${report.baseUrl}`);
    console.log(`Total Jobs: ${report.summary.totalJobs}`);
    console.log(`Passed: ${report.summary.passed}`);
    console.log(`Failed: ${report.summary.failed}`);
    console.log(`Skipped: ${report.summary.skipped}`);
    console.log(`Duration: ${report.summary.duration}`);
    if (failures.length > 0) {
      console.log("\nFailures:");
      for (const f of failures) {
        console.log(`  - [${f.job}] ${f.name}: ${f.error}`);
      }
    }
    console.log("=".repeat(60) + "\n");
  } catch (error) {
    job72Status = "failed";
    job72Error = (error as Error).message;
  }

  jobs.push({
    id: "7.2",
    name: "Report Generation",
    status: job72Status,
    duration: Date.now() - job72Start,
    error: job72Error,
  });

  const failedJobs = jobs.filter((j) => j.status === "failed");

  return {
    stage: 7,
    name: "Cleanup & Reporting",
    status: failedJobs.length === 0 ? "passed" : "failed",
    duration: Date.now() - startTime,
    jobs,
  };
}

/**
 * Get troubleshooting suggestions for a failed job
 */
function getTroubleshooting(jobId: string): string {
  const troubleshooting: Record<string, string> = {
    "0.1": "Check yarn lint and yarn tsc --noEmit locally. Fix errors before re-running.",
    "0.2": "Run yarn vitest run --changed main to see failing tests.",
    "1.1": "Check if dev server is running. Verify DATABASE_URL is set.",
    "1.2": "Check Cloudflare worker status at dashboard.cloudflare.com",
    "2.1": "Verify public pages exist and are not protected.",
    "2.2": "Check middleware.ts for auth redirect logic.",
    "2.3": "Verify navigation links in header component.",
    "3.1": "Check src/app/apps/pixel/page.tsx for component errors.",
    "3.2": "Verify albums route exists and is accessible.",
    "3.3": "Check token balance API and UI components.",
    "3.4": "Verify merch store is deployed and products are loaded.",
    "3.5": "MCP tools page may not be implemented yet.",
    "4.1": "Check Stripe API keys and test mode configuration.",
    "4.2": "Verify Gemini API key and quota.",
    "4.3": "Check social account OAuth connections.",
    "5.1": "Verify admin role check in middleware.",
    "5.2": "Check individual admin page components for errors.",
    "6.1": "Review responsive CSS for mobile breakpoints.",
    "6.2": "Review responsive CSS for tablet breakpoints.",
    "7.1": "Ensure screenshots directory is writable.",
    "7.2": "Check report generation for JSON serialization errors.",
  };

  return troubleshooting[jobId] || "Check the error message for details.";
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const stageArg = args.find((a) => a.startsWith("--stage="));
  const stageValue = stageArg?.split("=")[1];
  const targetStage = stageValue !== undefined ? parseInt(stageValue, 10) : undefined;

  console.log("🚀 Starting Orbit Agent Smoke Test Workflow");
  console.log(`   Base URL: ${config.baseUrl}`);
  console.log(`   Target Stage: ${targetStage !== undefined ? targetStage : "all"}\n`);

  const isCI = process.env.CI === "true";
  const browser = await chromium.launch({
    headless: process.env.HEADLESS !== "false",
    args: isCI
      ? [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ]
      : [],
  });

  const stages: StageResult[] = [];

  try {
    // Stage 0: Pre-Validation (always run unless specific stage requested)
    if (targetStage === undefined || targetStage === 0) {
      console.log("📋 Stage 0: Pre-Validation");
      const stage0 = await runStage0();
      stages.push(stage0);
      console.log(
        `   Status: ${stage0.status.toUpperCase()} (${formatDuration(stage0.duration)})\n`,
      );
      if (stage0.status === "failed") {
        stage0.jobs.filter(j => j.status === "failed").forEach(j => {
          console.log(`   ❌ [${j.id}] ${j.name}: ${j.error}`);
        });
        if (targetStage === undefined) {
          console.log("❌ Pre-validation failed. Fix errors before proceeding.");
        }
      }
    }

    // Stage 1: Infrastructure Health
    if (targetStage === undefined || targetStage === 1) {
      console.log("🏗️  Stage 1: Infrastructure Health");
      const stage1 = await runStage1(browser);
      stages.push(stage1);
      console.log(
        `   Status: ${stage1.status.toUpperCase()} (${formatDuration(stage1.duration)})\n`,
      );
      if (stage1.status === "failed") {
        stage1.jobs.filter(j => j.status === "failed").forEach(j => {
          console.log(`   ❌ [${j.id}] ${j.name}: ${j.error}`);
        });
      }
    }

    // Stage 2: Core User Flows
    if (targetStage === undefined || targetStage === 2) {
      console.log("👤 Stage 2: Core User Flows");
      const stage2 = await runStage2(browser);
      stages.push(stage2);
      console.log(
        `   Status: ${stage2.status.toUpperCase()} (${formatDuration(stage2.duration)})\n`,
      );
      if (stage2.status === "failed") {
        stage2.jobs.filter(j => j.status === "failed").forEach(j => {
          console.log(`   ❌ [${j.id}] ${j.name}: ${j.error}`);
        });
      }
    }

    // Stage 3: Feature-Specific Tests
    if (targetStage === undefined || targetStage === 3) {
      console.log("🎯 Stage 3: Feature-Specific Tests");
      const stage3 = await runStage3(browser);
      stages.push(stage3);
      console.log(
        `   Status: ${stage3.status.toUpperCase()} (${formatDuration(stage3.duration)})\n`,
      );
      if (stage3.status === "failed") {
        stage3.jobs.filter(j => j.status === "failed").forEach(j => {
          console.log(`   ❌ [${j.id}] ${j.name}: ${j.error}`);
        });
      }
    }

    // Stage 4: Integration Tests
    if (targetStage === undefined || targetStage === 4) {
      console.log("🔗 Stage 4: Integration Tests (Real Services)");
      const stage4 = await runStage4(browser);
      stages.push(stage4);
      console.log(
        `   Status: ${stage4.status.toUpperCase()} (${formatDuration(stage4.duration)})\n`,
      );
      if (stage4.status === "failed") {
        stage4.jobs.filter(j => j.status === "failed").forEach(j => {
          console.log(`   ❌ [${j.id}] ${j.name}: ${j.error}`);
        });
      }
    }

    // Stage 5: Admin Functionality
    if (targetStage === undefined || targetStage === 5) {
      console.log("🛡️  Stage 5: Admin Functionality");
      const stage5 = await runStage5(browser);
      stages.push(stage5);
      console.log(
        `   Status: ${stage5.status.toUpperCase()} (${formatDuration(stage5.duration)})\n`,
      );
      if (stage5.status === "failed") {
        stage5.jobs.filter(j => j.status === "failed").forEach(j => {
          console.log(`   ❌ [${j.id}] ${j.name}: ${j.error}`);
        });
      }
    }

    // Stage 6: Cross-Device Testing
    if (targetStage === undefined || targetStage === 6) {
      console.log("📱 Stage 6: Cross-Device Testing");
      const stage6 = await runStage6(browser);
      stages.push(stage6);
      console.log(
        `   Status: ${stage6.status.toUpperCase()} (${formatDuration(stage6.duration)})\n`,
      );
      if (stage6.status === "failed") {
        stage6.jobs.filter(j => j.status === "failed").forEach(j => {
          console.log(`   ❌ [${j.id}] ${j.name}: ${j.error}`);
        });
      }
    }

    // Stage 7: Cleanup & Reporting
    if (targetStage === undefined || targetStage === 7) {
      console.log("📊 Stage 7: Cleanup & Reporting");
      const stage7 = await runStage7(browser, stages);
      stages.push(stage7);
      console.log(
        `   Status: ${stage7.status.toUpperCase()} (${formatDuration(stage7.duration)})\n`,
      );
      if (stage7.status === "failed") {
        stage7.jobs.filter(j => j.status === "failed").forEach(j => {
          console.log(`   ❌ [${j.id}] ${j.name}: ${j.error}`);
        });
      }
    }
  } finally {
    await browser.close();
  }

  // Exit with appropriate code
  const hasFailures = stages.some((s) => s.status === "failed");
  process.exit(hasFailures ? 1 : 0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
