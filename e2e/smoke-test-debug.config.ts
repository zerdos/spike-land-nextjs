/**
 * Smoke Test Debug Configuration
 *
 * Configuration for enhanced debugging in CI/CD smoke tests.
 * Helps troubleshoot authentication bypass issues and flaky tests.
 */

export interface SmokeTestDebugConfig {
  /** Screenshot capture settings */
  screenshots: {
    /** Capture screenshot on every navigation */
    captureOnNavigation: boolean;
    /** Capture screenshot before each action */
    captureBeforeAction: boolean;
    /** Capture screenshot on failure */
    captureOnFailure: boolean;
    /** Screenshot quality (0-100) */
    quality: number;
    /** Full page screenshots vs viewport only */
    fullPage: boolean;
  };

  /** Timeout configurations */
  timeouts: {
    /** Default timeout for page navigation (ms) */
    navigationTimeout: number;
    /** Timeout for authentication to be ready (ms) */
    authReadyTimeout: number;
    /** Timeout for loading states (ms) */
    loadingTimeout: number;
    /** Timeout for API calls (ms) */
    apiTimeout: number;
  };

  /** Retry logic parameters */
  retry: {
    /** Maximum number of retries for failed actions */
    maxRetries: number;
    /** Initial delay between retries (ms) */
    initialDelayMs: number;
    /** Use exponential backoff for retries */
    useExponentialBackoff: boolean;
    /** Maximum backoff delay (ms) */
    maxBackoffDelayMs: number;
  };

  /** Logging verbosity levels */
  logging: {
    /** Enable verbose console logging */
    verbose: boolean;
    /** Log all network requests */
    logNetworkRequests: boolean;
    /** Log all console messages from page */
    logBrowserConsole: boolean;
    /** Log authentication state changes */
    logAuthState: boolean;
    /** Log timing information */
    logTiming: boolean;
  };

  /** Auth bypass settings */
  authBypass: {
    /** Verify auth bypass before each navigation */
    verifyBeforeNavigation: boolean;
    /** Wait for auth ready after setup */
    waitForAuthReady: boolean;
    /** Capture debug info on auth failure */
    captureDebugOnFailure: boolean;
    /** Extra delay after setting up auth (ms) */
    setupDelayMs: number;
  };
}

/**
 * Default debug configuration for local development
 */
export const localDebugConfig: SmokeTestDebugConfig = {
  screenshots: {
    captureOnNavigation: false,
    captureBeforeAction: false,
    captureOnFailure: true,
    quality: 80,
    fullPage: false,
  },
  timeouts: {
    navigationTimeout: 30000,
    authReadyTimeout: 10000,
    loadingTimeout: 5000,
    apiTimeout: 10000,
  },
  retry: {
    maxRetries: 2,
    initialDelayMs: 1000,
    useExponentialBackoff: true,
    maxBackoffDelayMs: 5000,
  },
  logging: {
    verbose: true,
    logNetworkRequests: false,
    logBrowserConsole: true,
    logAuthState: true,
    logTiming: true,
  },
  authBypass: {
    verifyBeforeNavigation: false,
    waitForAuthReady: true,
    captureDebugOnFailure: true,
    setupDelayMs: 500,
  },
};

/**
 * Debug configuration for CI/CD environments
 */
export const ciDebugConfig: SmokeTestDebugConfig = {
  screenshots: {
    captureOnNavigation: true,
    captureBeforeAction: true,
    captureOnFailure: true,
    quality: 90,
    fullPage: true,
  },
  timeouts: {
    navigationTimeout: 60000,
    authReadyTimeout: 15000,
    loadingTimeout: 10000,
    apiTimeout: 15000,
  },
  retry: {
    maxRetries: 3,
    initialDelayMs: 2000,
    useExponentialBackoff: true,
    maxBackoffDelayMs: 10000,
  },
  logging: {
    verbose: true,
    logNetworkRequests: true,
    logBrowserConsole: true,
    logAuthState: true,
    logTiming: true,
  },
  authBypass: {
    verifyBeforeNavigation: true,
    waitForAuthReady: true,
    captureDebugOnFailure: true,
    setupDelayMs: 1000,
  },
};

/**
 * Get the appropriate debug configuration based on environment
 */
export function getDebugConfig(): SmokeTestDebugConfig {
  const isCI = process.env.CI === "true";
  return isCI ? ciDebugConfig : localDebugConfig;
}
