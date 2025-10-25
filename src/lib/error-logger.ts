/**
 * Error logging utility for tracking and reporting errors
 * Supports development logging and production error tracking (Sentry integration ready)
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
  environment: 'development' | 'production' | 'test';
  sentryDsn?: string;
}

class ErrorLogger {
  private config: ErrorLoggerConfig;

  constructor(config?: Partial<ErrorLoggerConfig>) {
    this.config = {
      enabled: true,
      environment: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
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

    if (this.config.environment === 'development') {
      // Console logging for development
      console.error('Error caught by ErrorBoundary:', errorInfo);
    } else if (this.config.environment === 'production') {
      // In production, send to error tracking service
      this.sendToErrorTracking(error, errorInfo);
    }
    // In test environment, do nothing to avoid cluttering test output
  }

  /**
   * Send error to external tracking service (Sentry, LogRocket, etc.)
   */
  private sendToErrorTracking(error: Error, errorInfo: Record<string, unknown>): void {
    // This is where you would integrate with Sentry or other services
    // For now, we'll just console.error in production as a fallback
    if (this.config.sentryDsn) {
      // Future: Initialize and use Sentry SDK
      // Sentry.captureException(error, { contexts: { errorInfo } });
      console.error('[ErrorLogger] Error would be sent to Sentry:', errorInfo);
    } else {
      console.error('[ErrorLogger] Production error:', errorInfo);
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
