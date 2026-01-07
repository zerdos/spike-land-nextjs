import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("timeouts config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.ENHANCEMENT_TIMEOUT_SECONDS;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("should use default timeout of 300 when env var is not set", async () => {
    const { ENHANCEMENT_TIMEOUT_SECONDS, maxDuration } = await import(
      "./timeouts"
    );

    expect(ENHANCEMENT_TIMEOUT_SECONDS).toBe(300);
    expect(maxDuration).toBe(300);
  });

  it("should parse timeout from environment variable", async () => {
    process.env.ENHANCEMENT_TIMEOUT_SECONDS = "120";

    const { ENHANCEMENT_TIMEOUT_SECONDS, maxDuration } = await import(
      "./timeouts"
    );

    expect(ENHANCEMENT_TIMEOUT_SECONDS).toBe(120);
    expect(maxDuration).toBe(120);
  });

  it("should cap maxDuration at 300 when env exceeds limit", async () => {
    process.env.ENHANCEMENT_TIMEOUT_SECONDS = "600";
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      const { ENHANCEMENT_TIMEOUT_SECONDS, maxDuration } = await import(
        "./timeouts"
      );

      expect(ENHANCEMENT_TIMEOUT_SECONDS).toBe(600);
      expect(maxDuration).toBe(300);
      expect(warnSpy).toHaveBeenCalledWith(
        "ENHANCEMENT_TIMEOUT_SECONDS (600) exceeds Vercel Pro limit (300s). Capping at 300s.",
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("should handle exactly 300 without warning", async () => {
    process.env.ENHANCEMENT_TIMEOUT_SECONDS = "300";
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      const { ENHANCEMENT_TIMEOUT_SECONDS, maxDuration } = await import(
        "./timeouts"
      );

      expect(ENHANCEMENT_TIMEOUT_SECONDS).toBe(300);
      expect(maxDuration).toBe(300);
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("should handle value at boundary (301)", async () => {
    process.env.ENHANCEMENT_TIMEOUT_SECONDS = "301";
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      const { ENHANCEMENT_TIMEOUT_SECONDS, maxDuration } = await import(
        "./timeouts"
      );

      expect(ENHANCEMENT_TIMEOUT_SECONDS).toBe(301);
      expect(maxDuration).toBe(300);
      expect(warnSpy).toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });
});
