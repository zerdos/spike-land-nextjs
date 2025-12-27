import { EnhancementTier, JobStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Run } from "workflow/api";
import {
  getExecutionMode,
  handleEnhancementFailure,
  isVercelEnvironment,
  startEnhancement,
} from "./enhancement-executor";

// Helper to create a mock Run object with all required properties
function createMockRun<T>(runId: string): Run<T> {
  // Cast through unknown because Run is a class with private properties
  return {
    runId,
    cancel: vi.fn().mockResolvedValue(undefined),
    get status() {
      return Promise.resolve("running" as const);
    },
    get returnValue() {
      return Promise.resolve(undefined as T);
    },
    get workflowName() {
      return Promise.resolve("test-workflow");
    },
    get createdAt() {
      return Promise.resolve(new Date());
    },
    get startedAt() {
      return Promise.resolve(new Date());
    },
    get completedAt() {
      return Promise.resolve(undefined);
    },
    get readable() {
      return new ReadableStream();
    },
    getReadable: vi.fn().mockReturnValue(new ReadableStream()),
  } as unknown as Run<T>;
}

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
    .mockResolvedValue({ success: true, enhancedUrl: "https://example.com/enhanced.jpg" }),
}));

vi.mock("@/workflows/enhance-image.workflow", () => ({
  enhanceImage: vi.fn(),
}));

vi.mock("workflow/api", () => ({
  start: vi.fn(),
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

describe("getExecutionMode", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return 'workflow' when override is set to workflow", () => {
    process.env.ENHANCEMENT_EXECUTION_MODE = "workflow";
    expect(getExecutionMode()).toBe("workflow");
  });

  it("should return 'direct' when override is set to direct", () => {
    process.env.ENHANCEMENT_EXECUTION_MODE = "direct";
    expect(getExecutionMode()).toBe("direct");
  });

  it("should return 'workflow' in Vercel environment", () => {
    delete process.env.ENHANCEMENT_EXECUTION_MODE;
    process.env.VERCEL = "1";
    expect(getExecutionMode()).toBe("workflow");
  });

  it("should return 'direct' outside Vercel environment", () => {
    delete process.env.ENHANCEMENT_EXECUTION_MODE;
    delete process.env.VERCEL;
    expect(getExecutionMode()).toBe("direct");
  });

  it("should respect override even in Vercel environment", () => {
    process.env.ENHANCEMENT_EXECUTION_MODE = "direct";
    process.env.VERCEL = "1";
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
    process.env.VERCEL = "0";
    expect(isVercelEnvironment()).toBe(false);
  });
});

describe("startEnhancement", () => {
  const originalEnv = process.env;

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
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("workflow mode", () => {
    beforeEach(() => {
      process.env.ENHANCEMENT_EXECUTION_MODE = "workflow";
    });

    it("should start workflow and return success", async () => {
      const { start } = await import("workflow/api");
      vi.mocked(start).mockResolvedValue(createMockRun("workflow-run-123"));

      const result = await startEnhancement(mockInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.workflowRunId).toBe("workflow-run-123");
      }
    });

    it("should update job with workflow run ID", async () => {
      const { start } = await import("workflow/api");
      const { default: prisma } = await import("@/lib/prisma");

      vi.mocked(start).mockResolvedValue(createMockRun("workflow-run-123"));

      await startEnhancement(mockInput);

      expect(prisma.imageEnhancementJob.update).toHaveBeenCalledWith({
        where: { id: "job-1" },
        data: { workflowRunId: "workflow-run-123" },
      });
    });

    it("should return error when workflow fails to start", async () => {
      const { start } = await import("workflow/api");
      vi.mocked(start).mockRejectedValue(new Error("Workflow startup failed"));

      const result = await startEnhancement(mockInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Workflow startup failed");
      }
    });

    it("should handle non-Error workflow failures", async () => {
      const { start } = await import("workflow/api");
      vi.mocked(start).mockRejectedValue("String error");

      const result = await startEnhancement(mockInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("String error");
      }
    });

    it("should call logger when provided", async () => {
      const { start } = await import("workflow/api");
      vi.mocked(start).mockResolvedValue(createMockRun("workflow-run-123"));

      const mockLogger = { info: vi.fn() };
      await startEnhancement(mockInput, mockLogger);

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Enhancement workflow started (production)",
        expect.objectContaining({
          jobId: "job-1",
          workflowRunId: "workflow-run-123",
        }),
      );
    });
  });

  describe("direct mode", () => {
    beforeEach(() => {
      process.env.ENHANCEMENT_EXECUTION_MODE = "direct";
    });

    it("should start direct enhancement and return success", async () => {
      const result = await startEnhancement(mockInput);

      expect(result.success).toBe(true);
    });

    it("should call logger when provided", async () => {
      const mockLogger = { info: vi.fn() };
      await startEnhancement(mockInput, mockLogger);

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Running enhancement directly (dev mode)",
        expect.objectContaining({ jobId: "job-1" }),
      );
    });

    it("should fire and forget - not wait for enhancement", async () => {
      const { enhanceImageDirect } = await import(
        "@/workflows/enhance-image.direct"
      );

      // Create a delayed promise with correct return type
      let resolveEnhancement: (
        value: { success: boolean; enhancedUrl?: string; error?: string; },
      ) => void;
      const enhancementPromise = new Promise<{
        success: boolean;
        enhancedUrl?: string;
        error?: string;
      }>((resolve) => {
        resolveEnhancement = resolve;
      });
      vi.mocked(enhanceImageDirect).mockReturnValue(enhancementPromise);

      const result = await startEnhancement(mockInput);

      // Should return immediately without waiting
      expect(result.success).toBe(true);
      expect(enhanceImageDirect).toHaveBeenCalledWith(mockInput);

      // Clean up
      resolveEnhancement!({ success: true });
    });
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
