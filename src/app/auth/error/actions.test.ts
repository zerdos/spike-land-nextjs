import { beforeEach, describe, expect, it, vi } from "vitest";
import { logAuthError } from "./actions";

// Mock the logger
vi.mock("@/lib/errors/structured-logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn((name: string) => {
      if (name === "user-agent") return "Test User Agent";
      if (name === "referer") return "https://example.com/auth/signin";
      return null;
    }),
  }),
}));

describe("logAuthError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should log error with error code", async () => {
    const { logger } = await import("@/lib/errors/structured-logger");

    await logAuthError("Configuration");

    expect(logger.error).toHaveBeenCalledWith(
      "Auth error displayed to user",
      undefined,
      expect.objectContaining({
        errorCode: "Configuration",
        route: "/auth/error",
        userAgent: "Test User Agent",
        referer: "https://example.com/auth/signin",
      }),
    );
  });

  it("should log 'unknown' when error code is null", async () => {
    const { logger } = await import("@/lib/errors/structured-logger");

    await logAuthError(null);

    expect(logger.error).toHaveBeenCalledWith(
      "Auth error displayed to user",
      undefined,
      expect.objectContaining({
        errorCode: "unknown",
        route: "/auth/error",
      }),
    );
  });

  it("should handle missing headers gracefully", async () => {
    const { headers } = await import("next/headers");
    vi.mocked(headers).mockResolvedValueOnce({
      get: vi.fn().mockReturnValue(null),
    } as unknown as ReturnType<typeof headers>);

    const { logger } = await import("@/lib/errors/structured-logger");

    await logAuthError("OAuthCallback");

    expect(logger.error).toHaveBeenCalledWith(
      "Auth error displayed to user",
      undefined,
      expect.objectContaining({
        errorCode: "OAuthCallback",
        route: "/auth/error",
        userAgent: "unknown",
        referer: "unknown",
      }),
    );
  });
});
