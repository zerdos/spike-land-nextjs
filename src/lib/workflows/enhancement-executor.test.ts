import type { EnhancementTier } from "@prisma/client";
import { JobStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getExecutionMode,
  handleEnhancementFailure,
  isVercelEnvironment,
  startEnhancement,
} from "./enhancement-executor";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  default: {
    imageEnhancementJob: {
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock("@/lib/tokens/balance-manager", () => ({
  TokenBalanceManager: {
    refundTokens: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock("@/workflows/enhance-image.direct", () => ({
  enhanceImageDirect: vi
    .fn()
    .mockResolvedValue({
      success: true,
      enhancedUrl: "https://example.com/enhanced.jpg",
    }),
}));

vi.mock("@/lib/try-catch", () => ({
  tryCatch: async <T>(promise: Promise<T>) => {
    try {
      const data = await promise;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
}));

// Mock next/server's after function
vi.mock("next/server", () => ({
  after: vi.fn((callback: () => Promise<void>) => {
    // Execute the callback immediately in tests
    void callback();
  }),
}));

describe("getExecutionMode", () => {
  it("should always return 'direct'", () => {
    // Workflow mode has been removed
    expect(getExecutionMode()).toBe("direct");
  });
});

describe("isVercelEnvironment", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return true when VERCEL is '1'", () => {
    process.env.VERCEL = "1";
    expect(isVercelEnvironment()).toBe(true);
  });

  it("should return false when VERCEL is not set", () => {
    delete process.env.VERCEL;
    expect(isVercelEnvironment()).toBe(false);
  });

  it("should return false when VERCEL is '0'", () => {
    // Use type assertion to test edge case where VERCEL has an unexpected value
    (process.env as Record<string, string | undefined>)["VERCEL"] = "0";
    expect(isVercelEnvironment()).toBe(false);
  });
});

describe("startEnhancement", () => {
  const mockInput = {
    jobId: "job-1",
    imageId: "image-1",
    userId: "user-1",
    originalR2Key: "user-1/originals/image.jpg",
    tier: "TIER_1K" as EnhancementTier,
    tokensCost: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should start direct enhancement and return success", async () => {
    const result = await startEnhancement(mockInput);

    expect(result.success).toBe(true);
  });

  it("should call logger when provided", async () => {
    const mockLogger = { info: vi.fn() };
    await startEnhancement(mockInput, mockLogger);

    expect(mockLogger.info).toHaveBeenCalledWith(
      "Starting enhancement (direct mode with after())",
      expect.objectContaining({ jobId: "job-1" }),
    );
  });

  it("should call enhanceImageDirect via after()", async () => {
    const { enhanceImageDirect } = await import(
      "@/workflows/enhance-image.direct"
    );

    await startEnhancement(mockInput);

    expect(enhanceImageDirect).toHaveBeenCalledWith(mockInput);
  });
});

describe("handleEnhancementFailure", () => {
  const mockContext = {
    jobId: "job-1",
    userId: "user-1",
    tokensCost: 5,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should mark job as REFUNDED when tokens were consumed", async () => {
    const { default: prisma } = await import("@/lib/prisma");

    await handleEnhancementFailure(mockContext, "Test error");

    expect(prisma.imageEnhancementJob.update).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: {
        status: JobStatus.REFUNDED,
        errorMessage: "Test error",
      },
    });
  });

  it("should mark job as FAILED when no tokens were consumed", async () => {
    const { default: prisma } = await import("@/lib/prisma");

    await handleEnhancementFailure(
      { ...mockContext, tokensCost: 0 },
      "Test error",
    );

    expect(prisma.imageEnhancementJob.update).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: {
        status: JobStatus.FAILED,
        errorMessage: "Test error",
      },
    });
  });

  it("should refund tokens when tokens were consumed", async () => {
    const { TokenBalanceManager } = await import(
      "@/lib/tokens/balance-manager"
    );

    await handleEnhancementFailure(mockContext, "Test error");

    expect(TokenBalanceManager.refundTokens).toHaveBeenCalledWith(
      "user-1",
      5,
      "job-1",
      "Test error",
    );
  });

  it("should not refund tokens when no tokens were consumed", async () => {
    const { TokenBalanceManager } = await import(
      "@/lib/tokens/balance-manager"
    );

    await handleEnhancementFailure(
      { ...mockContext, tokensCost: 0 },
      "Test error",
    );

    expect(TokenBalanceManager.refundTokens).not.toHaveBeenCalled();
  });
});
