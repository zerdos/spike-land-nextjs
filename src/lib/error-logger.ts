/**
 * Error logging utility for tracking and reporting errors
 * Uses structured logging combined with Vercel Analytics for monitoring.
 * See docs/CEO_DECISIONS.md for the decision to not use external error tracking services.
 */

export interface ErrorContext {
  componentStack?: string;
  userId?: string;
  userEmail?: string;
  route?: string;
  [key: string]: unknown;
}

export interface ErrorLoggerConfig {
  enabled: boolean;
  environment: "development" | "production" | "test";
}

class ErrorLogger {
  private config: ErrorLoggerConfig;

  constructor(config?: Partial<ErrorLoggerConfig>) {
    this.config = {
      enabled: true,
      environment: (process.env.NODE_ENV as "development" | "production" | "test") || "development",
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
   * Send error to production logging
   * Uses structured logging for Vercel log aggregation and monitoring
   */
  private sendToErrorTracking(_error: Error, errorInfo: Record<string, unknown>): void {
    // Production errors are logged in structured JSON format
    // These can be monitored via Vercel Analytics and log aggregation
    console.error("[ErrorLogger] Production error:", JSON.stringify(errorInfo, null, 2));
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
