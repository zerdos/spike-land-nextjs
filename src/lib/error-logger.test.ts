import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type ErrorContext, ErrorLogger, errorLogger } from "./error-logger";

describe("ErrorLogger", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe("constructor", () => {
    it("should initialize with default config", () => {
      const logger = new ErrorLogger();
      const config = logger.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.environment).toBe("test"); // vitest sets NODE_ENV to test
      expect(config.sentryDsn).toBeUndefined();
    });

    it("should initialize with custom config", () => {
      const logger = new ErrorLogger({
        enabled: false,
        environment: "production",
        sentryDsn: "https://example.com/sentry",
      });
      const config = logger.getConfig();

      expect(config.enabled).toBe(false);
      expect(config.environment).toBe("production");
      expect(config.sentryDsn).toBe("https://example.com/sentry");
    });
  });

  describe("logError", () => {
    it("should not log when disabled", () => {
      const logger = new ErrorLogger({ enabled: false });
      const error = new Error("Test error");

      logger.logError(error);

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should log to console in development", () => {
      const logger = new ErrorLogger({ environment: "development" });
      const error = new Error("Test error");
      const context: ErrorContext = {
        componentStack: "at Component",
        userId: "123",
      };

      logger.logError(error, context);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error caught by ErrorBoundary:",
        expect.objectContaining({
          message: "Test error",
          name: "Error",
          componentStack: "at Component",
          userId: "123",
          environment: "development",
          timestamp: expect.any(String),
        }),
      );
    });

    it("should log to error tracking in production without Sentry DSN", () => {
      const logger = new ErrorLogger({ environment: "production" });
      const error = new Error("Production error");

      logger.logError(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[ErrorLogger] Production error:",
        expect.objectContaining({
          message: "Production error",
          environment: "production",
        }),
      );
    });

    it("should log to Sentry in production with DSN", () => {
      const logger = new ErrorLogger({
        environment: "production",
        sentryDsn: "https://example.com/sentry",
      });
      const error = new Error("Sentry error");

      logger.logError(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[ErrorLogger] Error would be sent to Sentry:",
        expect.objectContaining({
          message: "Sentry error",
          environment: "production",
        }),
      );
    });

    it("should not log in test environment", () => {
      const logger = new ErrorLogger({ environment: "test" });
      const error = new Error("Test error");

      logger.logError(error);

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should include error stack trace", () => {
      const logger = new ErrorLogger({ environment: "development" });
      const error = new Error("Stack error");

      logger.logError(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error caught by ErrorBoundary:",
        expect.objectContaining({
          stack: expect.stringContaining("Stack error"),
        }),
      );
    });

    it("should include all context properties", () => {
      const logger = new ErrorLogger({ environment: "development" });
      const error = new Error("Context error");
      const context: ErrorContext = {
        componentStack: "at Component",
        userId: "123",
        userEmail: "test@example.com",
        route: "/my-apps",
        customProp: "custom value",
      };

      logger.logError(error, context);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error caught by ErrorBoundary:",
        expect.objectContaining({
          componentStack: "at Component",
          userId: "123",
          userEmail: "test@example.com",
          route: "/my-apps",
          customProp: "custom value",
        }),
      );
    });

    it("should include timestamp in ISO format", () => {
      const logger = new ErrorLogger({ environment: "development" });
      const error = new Error("Timestamp error");

      logger.logError(error);

      const call = consoleErrorSpy.mock.calls[0];
      const errorInfo = call[1] as { timestamp: string; };

      expect(errorInfo.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe("updateConfig", () => {
    it("should update configuration", () => {
      const logger = new ErrorLogger({ enabled: true });

      logger.updateConfig({ enabled: false });

      expect(logger.getConfig().enabled).toBe(false);
    });

    it("should merge configuration", () => {
      const logger = new ErrorLogger({
        enabled: true,
        environment: "development",
      });

      logger.updateConfig({ environment: "production" });

      const config = logger.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.environment).toBe("production");
    });
  });

  describe("getConfig", () => {
    it("should return a copy of config", () => {
      const logger = new ErrorLogger();
      const config1 = logger.getConfig();
      const config2 = logger.getConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Different objects
    });
  });

  describe("singleton instance", () => {
    it("should export a singleton errorLogger instance", () => {
      expect(errorLogger).toBeInstanceOf(ErrorLogger);
    });

    it("should use the singleton across imports", () => {
      const config = errorLogger.getConfig();
      expect(config).toBeDefined();
    });
  });

  describe("error handling edge cases", () => {
    it("should handle errors without stack traces", () => {
      const logger = new ErrorLogger({ environment: "development" });
      const error = new Error("No stack");
      delete error.stack;

      logger.logError(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error caught by ErrorBoundary:",
        expect.objectContaining({
          message: "No stack",
          stack: undefined,
        }),
      );
    });

    it("should handle errors with custom names", () => {
      const logger = new ErrorLogger({ environment: "development" });
      const error = new Error("Custom error");
      error.name = "CustomError";

      logger.logError(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error caught by ErrorBoundary:",
        expect.objectContaining({
          name: "CustomError",
        }),
      );
    });

    it("should handle empty context", () => {
      const logger = new ErrorLogger({ environment: "development" });
      const error = new Error("Empty context");

      logger.logError(error, {});

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
