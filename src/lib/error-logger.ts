/**
 * Error logging utility for tracking and reporting errors
 * Integrates with Sentry for production error tracking
 */

import * as Sentry from "@sentry/nextjs";

export interface ErrorContext {
  componentStack?: string;
  userId?: string;
  userEmail?: string;
  route?: string;
  digest?: string;
  [key: string]: unknown;
}

export interface ErrorLoggerConfig {
  enabled: boolean;
  environment: "development" | "production" | "test";
  sentryDsn?: string;
}

class ErrorLogger {
  private config: ErrorLoggerConfig;

  constructor(config?: Partial<ErrorLoggerConfig>) {
    this.config = {
      enabled: true,
      environment: (process.env.NODE_ENV as "development" | "production" | "test") || "development",
      sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      ...config,
    };
  }

  /**
   * Log an error with context
   */
  logError(error: Error, context?: ErrorContext): void {
    if (!this.config.enabled) {
      return;
    }

    const errorInfo = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString(),
      environment: this.config.environment,
      ...context,
    };

    if (this.config.environment === "development") {
      // Console logging for development
      console.error("Error caught by ErrorBoundary:", errorInfo);
    } else if (this.config.environment === "production") {
      // In production, send to error tracking service
      this.sendToErrorTracking(error, errorInfo);
    }
    // In test environment, do nothing to avoid cluttering test output
  }

  /**
   * Send error to external tracking service (Sentry)
   */
  private sendToErrorTracking(error: Error, errorInfo: Record<string, unknown>): void {
    if (this.config.sentryDsn) {
      try {
        // Set user context if available
        if (errorInfo.userId || errorInfo.userEmail) {
          Sentry.setUser({
            id: errorInfo.userId as string | undefined,
            email: errorInfo.userEmail as string | undefined,
          });
        }

        // Set additional context
        Sentry.setContext("errorInfo", {
          timestamp: errorInfo.timestamp,
          route: errorInfo.route,
          digest: errorInfo.digest,
          componentStack: errorInfo.componentStack,
        });

        // Set tags for better filtering in Sentry
        if (errorInfo.route) {
          Sentry.setTag("route", errorInfo.route as string);
        }
        if (errorInfo.digest) {
          Sentry.setTag("digest", errorInfo.digest as string);
        }

        // Capture the exception
        Sentry.captureException(error);

        console.error("[ErrorLogger] Error sent to Sentry:", errorInfo.message);
      } catch (sentryError) {
        // Fallback if Sentry fails
        console.error("[ErrorLogger] Failed to send error to Sentry:", sentryError);
        console.error("[ErrorLogger] Original error:", errorInfo);
      }
    } else {
      // Fallback to console if Sentry not configured
      console.error("[ErrorLogger] Production error (Sentry not configured):", errorInfo);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ErrorLoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ErrorLoggerConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const errorLogger = new ErrorLogger();

// Export class for testing
export { ErrorLogger };
