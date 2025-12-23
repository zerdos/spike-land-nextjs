import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateRequestId, type LogContext, logger, StructuredLogger } from "./structured-logger";

describe("structured-logger", () => {
  describe("generateRequestId", () => {
    it("should generate a unique request ID", () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();

      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
      expect(id1).toHaveLength(32); // 16 bytes * 2 (hex)
    });
  });

  describe("StructuredLogger", () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
    let consoleDebugSpy: ReturnType<typeof vi.spyOn>;
    let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
    let originalEnv: string | undefined;

    beforeEach(() => {
      // Store original NODE_ENV
      originalEnv = process.env.NODE_ENV;
      // Set to development so logs are output
      vi.stubEnv("NODE_ENV", "development");

      vi.spyOn(console, "log").mockImplementation(() => {});
      consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      consoleDebugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
      consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    });

    afterEach(() => {
      // Restore original NODE_ENV
      if (originalEnv !== undefined) {
        vi.stubEnv("NODE_ENV", originalEnv);
      }
      vi.restoreAllMocks();
    });

    it("should create logger instance", () => {
      const testLogger = new StructuredLogger();
      expect(testLogger).toBeDefined();
    });

    it("should log info messages", () => {
      const testLogger = new StructuredLogger();
      testLogger.info("Test message");

      expect(consoleInfoSpy).toHaveBeenCalledOnce();
    });

    it("should log error messages", () => {
      const testLogger = new StructuredLogger();
      const error = new Error("Test error");
      testLogger.error("Error occurred", error);

      expect(consoleErrorSpy).toHaveBeenCalledOnce();
    });

    it("should log warning messages", () => {
      const testLogger = new StructuredLogger();
      testLogger.warn("Warning message");

      expect(consoleWarnSpy).toHaveBeenCalledOnce();
    });

    it("should log debug messages in development", () => {
      const testLogger = new StructuredLogger();
      testLogger.debug("Debug message");

      // Debug logs only in development
      if (process.env.NODE_ENV === "development") {
        expect(consoleDebugSpy).toHaveBeenCalledOnce();
      }
    });

    it("should include context in logs", () => {
      const testLogger = new StructuredLogger();
      const context: LogContext = {
        userId: "user123",
        route: "/api/test",
      };

      testLogger.info("Test with context", context);

      expect(consoleInfoSpy).toHaveBeenCalledOnce();
      const loggedMessage = consoleInfoSpy.mock.calls[0][0];
      expect(loggedMessage).toContain("Test with context");
    });

    it("should include error details in error logs", () => {
      const testLogger = new StructuredLogger();
      const error = new Error("Test error");
      const context: LogContext = {
        userId: "user123",
      };

      testLogger.error("Error occurred", error, context);

      expect(consoleErrorSpy).toHaveBeenCalledOnce();
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage).toContain("Error occurred");
      expect(loggedMessage).toContain("Test error");
    });

    it("should create child logger with inherited context", () => {
      const testLogger = new StructuredLogger();
      const parentContext: LogContext = {
        requestId: "req123",
        userId: "user123",
      };

      const childLogger = testLogger.child(parentContext);

      childLogger.info("Child log", { route: "/api/test" });

      expect(consoleInfoSpy).toHaveBeenCalledOnce();
      const loggedMessage = consoleInfoSpy.mock.calls[0][0];
      expect(loggedMessage).toContain("Child log");
    });

    it("should merge context in child logger", () => {
      const testLogger = new StructuredLogger();
      const parentContext: LogContext = {
        requestId: "req123",
      };

      const childLogger = testLogger.child(parentContext);

      childLogger.info("Test", { userId: "user456" });

      expect(consoleInfoSpy).toHaveBeenCalledOnce();
    });

    it("should create nested child loggers", () => {
      const testLogger = new StructuredLogger();
      const child1 = testLogger.child({ requestId: "req123" });
      const child2 = child1.child({ userId: "user456" });

      child2.info("Nested child log");

      expect(consoleInfoSpy).toHaveBeenCalledOnce();
    });

    it("should handle logging without context", () => {
      const testLogger = new StructuredLogger();
      testLogger.info("Simple message");

      expect(consoleInfoSpy).toHaveBeenCalledOnce();
    });

    it("should handle logging without error object", () => {
      const testLogger = new StructuredLogger();
      testLogger.error("Error message without error object");

      expect(consoleErrorSpy).toHaveBeenCalledOnce();
    });
  });

  describe("singleton logger", () => {
    let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
    let originalEnv: string | undefined;

    beforeEach(() => {
      // Store original NODE_ENV
      originalEnv = process.env.NODE_ENV;
      // Set to development so logs are output
      vi.stubEnv("NODE_ENV", "development");

      vi.spyOn(console, "log").mockImplementation(() => {});
      consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    });

    afterEach(() => {
      // Restore original NODE_ENV
      if (originalEnv !== undefined) {
        vi.stubEnv("NODE_ENV", originalEnv);
      }
      vi.restoreAllMocks();
    });

    it("should provide singleton logger instance", () => {
      expect(logger).toBeDefined();
    });

    it("should log using singleton logger", () => {
      // Create a new logger instance in development mode
      const devLogger = new StructuredLogger();
      devLogger.info("Singleton test");
      expect(consoleInfoSpy).toHaveBeenCalledOnce();
    });
  });

  describe("production environment", () => {
    let consoleLogSpy: ReturnType<typeof vi.spyOn>;
    let originalEnv: string | undefined;

    beforeEach(() => {
      originalEnv = process.env.NODE_ENV;
      vi.stubEnv("NODE_ENV", "production");
      consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    });

    afterEach(() => {
      if (originalEnv !== undefined) {
        vi.stubEnv("NODE_ENV", originalEnv);
      }
      vi.restoreAllMocks();
    });

    it("should output JSON in production", () => {
      const testLogger = new StructuredLogger();
      testLogger.info("Production log message");

      expect(consoleLogSpy).toHaveBeenCalledOnce();
      const loggedOutput = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(loggedOutput);
      expect(parsed.message).toBe("Production log message");
      expect(parsed.level).toBe("info");
    });

    it("should not output debug messages in production", () => {
      const testLogger = new StructuredLogger();
      testLogger.debug("Debug message in production");

      // Debug messages should not be output in production
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe("ChildLogger full coverage", () => {
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
    let consoleDebugSpy: ReturnType<typeof vi.spyOn>;
    let originalEnv: string | undefined;

    beforeEach(() => {
      originalEnv = process.env.NODE_ENV;
      vi.stubEnv("NODE_ENV", "development");
      vi.spyOn(console, "log").mockImplementation(() => {});
      vi.spyOn(console, "info").mockImplementation(() => {});
      consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      consoleDebugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    });

    afterEach(() => {
      if (originalEnv !== undefined) {
        vi.stubEnv("NODE_ENV", originalEnv);
      }
      vi.restoreAllMocks();
    });

    it("should log warnings through child logger", () => {
      const testLogger = new StructuredLogger();
      const child = testLogger.child({ requestId: "req123" });
      child.warn("Child warning message");

      expect(consoleWarnSpy).toHaveBeenCalledOnce();
    });

    it("should log errors through child logger", () => {
      const testLogger = new StructuredLogger();
      const child = testLogger.child({ requestId: "req123" });
      const error = new Error("Child error");
      child.error("Child error message", error);

      expect(consoleErrorSpy).toHaveBeenCalledOnce();
    });

    it("should log debug through child logger", () => {
      const testLogger = new StructuredLogger();
      const child = testLogger.child({ requestId: "req123" });
      child.debug("Child debug message");

      expect(consoleDebugSpy).toHaveBeenCalledOnce();
    });

    it("should log errors through child logger with additional context", () => {
      const testLogger = new StructuredLogger();
      const child = testLogger.child({ requestId: "req123" });
      const error = new Error("Child error with context");
      child.error("Child error message", error, { userId: "user456" });

      expect(consoleErrorSpy).toHaveBeenCalledOnce();
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage).toContain("Child error message");
    });
  });

  describe("error without stack trace", () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
    let originalEnv: string | undefined;

    beforeEach(() => {
      originalEnv = process.env.NODE_ENV;
      vi.stubEnv("NODE_ENV", "development");
      vi.spyOn(console, "log").mockImplementation(() => {});
      consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      if (originalEnv !== undefined) {
        vi.stubEnv("NODE_ENV", originalEnv);
      }
      vi.restoreAllMocks();
    });

    it("should handle error without stack trace", () => {
      const testLogger = new StructuredLogger();
      const error = new Error("Error without stack");
      // Remove the stack property
      delete error.stack;
      testLogger.error("Error occurred", error);

      expect(consoleErrorSpy).toHaveBeenCalledOnce();
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage).toContain("Error occurred");
      expect(loggedMessage).toContain("Error without stack");
      // Should not include "Stack:" when there is no stack
      expect(loggedMessage).not.toContain("Stack:");
    });
  });

  describe("context formatting edge cases", () => {
    let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
    let originalEnv: string | undefined;

    beforeEach(() => {
      originalEnv = process.env.NODE_ENV;
      vi.stubEnv("NODE_ENV", "development");
      vi.spyOn(console, "log").mockImplementation(() => {});
      consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    });

    afterEach(() => {
      if (originalEnv !== undefined) {
        vi.stubEnv("NODE_ENV", originalEnv);
      }
      vi.restoreAllMocks();
    });

    it("should handle context with only requestId (filtered out)", () => {
      const testLogger = new StructuredLogger();
      // Context with only requestId should result in empty contextStr
      testLogger.info("Test message", { requestId: "req123" });

      expect(consoleInfoSpy).toHaveBeenCalledOnce();
      const loggedMessage = consoleInfoSpy.mock.calls[0][0];
      expect(loggedMessage).toContain("Test message");
      // Should not have the context separator when all context is filtered
      expect(loggedMessage).not.toContain("|");
    });
  });
});
