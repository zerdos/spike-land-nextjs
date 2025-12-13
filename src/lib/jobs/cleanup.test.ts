/**
 * Tests for Job Cleanup Utilities
 */

import { TokenBalanceManager } from "@/lib/tokens/balance-manager";
import { EnhancementTier, JobStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanupStuckJobs, findStuckJobs } from "./cleanup";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  default: {
    imageEnhancementJob: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/tokens/balance-manager", () => ({
  TokenBalanceManager: {
    refundTokens: vi.fn(),
  },
}));

vi.mock("@/lib/errors/structured-logger", () => ({
  logger: {
    child: vi.fn().mockReturnValue({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Import mocked prisma
import prisma from "@/lib/prisma";

describe("Job Cleanup Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findStuckJobs", () => {
    it("should find jobs stuck in PROCESSING state with processingStartedAt", async () => {
      const now = new Date();
      const stuckTime = new Date(now.getTime() - 10 * 60 * 1000); // 10 minutes ago

      const mockJobs = [
        {
          id: "job1",
          userId: "user1",
          tokensCost: 10,
          processingStartedAt: stuckTime,
          updatedAt: stuckTime,
        },
      ];

      vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue(mockJobs);

      const result = await findStuckJobs(5 * 60 * 1000); // 5 minute timeout

      expect(prisma.imageEnhancementJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: JobStatus.PROCESSING,
          }),
          take: 100,
        }),
      );

      expect(result).toEqual(mockJobs);
    });

    it("should find jobs stuck in PROCESSING state without processingStartedAt", async () => {
      const now = new Date();
      const stuckTime = new Date(now.getTime() - 10 * 60 * 1000);

      const mockJobs = [
        {
          id: "job2",
          userId: "user2",
          tokensCost: 5,
          processingStartedAt: null,
          updatedAt: stuckTime,
        },
      ];

      vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue(mockJobs);

      const result = await findStuckJobs(5 * 60 * 1000);

      expect(result).toEqual(mockJobs);
    });

    it("should not find jobs within timeout threshold", async () => {
      // Jobs within timeout threshold should not be returned
      vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue([]);

      const result = await findStuckJobs(5 * 60 * 1000);

      expect(result).toEqual([]);
    });

    it("should respect batch size limit", async () => {
      const batchSize = 50;

      vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue([]);

      await findStuckJobs(5 * 60 * 1000, batchSize);

      expect(prisma.imageEnhancementJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: batchSize,
        }),
      );
    });

    it("should order jobs by oldest first", async () => {
      vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue([]);

      await findStuckJobs();

      expect(prisma.imageEnhancementJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { updatedAt: "asc" },
        }),
      );
    });
  });

  describe("cleanupStuckJobs", () => {
    it("should return empty result when no stuck jobs found", async () => {
      vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue([]);

      const result = await cleanupStuckJobs();

      expect(result).toEqual({
        totalFound: 0,
        cleanedUp: 0,
        failed: 0,
        tokensRefunded: 0,
        jobs: [],
        errors: [],
      });
    });

    it("should perform dry run without making changes", async () => {
      const now = new Date();
      const stuckTime = new Date(now.getTime() - 10 * 60 * 1000);

      const mockJobs = [
        {
          id: "job1",
          userId: "user1",
          tokensCost: 10,
          processingStartedAt: stuckTime,
          updatedAt: stuckTime,
        },
        {
          id: "job2",
          userId: "user2",
          tokensCost: 5,
          processingStartedAt: stuckTime,
          updatedAt: stuckTime,
        },
      ];

      vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue(mockJobs);

      const result = await cleanupStuckJobs({ dryRun: true });

      expect(result.totalFound).toBe(2);
      expect(result.cleanedUp).toBe(0);
      expect(result.tokensRefunded).toBe(0);
      expect(result.jobs).toHaveLength(2);
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(TokenBalanceManager.refundTokens).not.toHaveBeenCalled();
    });

    it("should perform dry run with null processingStartedAt (uses updatedAt fallback)", async () => {
      const now = new Date();
      const stuckTime = new Date(now.getTime() - 10 * 60 * 1000);

      const mockJobs = [
        {
          id: "job1",
          userId: "user1",
          tokensCost: 10,
          processingStartedAt: null, // null to trigger updatedAt fallback
          updatedAt: stuckTime,
        },
      ];

      vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue(mockJobs);

      const result = await cleanupStuckJobs({ dryRun: true });

      expect(result.totalFound).toBe(1);
      expect(result.cleanedUp).toBe(0);
      expect(result.tokensRefunded).toBe(0);
      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0].processingDuration).toBeGreaterThan(0);
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(TokenBalanceManager.refundTokens).not.toHaveBeenCalled();
    });

    it("should clean up stuck jobs and refund tokens", async () => {
      const now = new Date();
      const stuckTime = new Date(now.getTime() - 10 * 60 * 1000);

      const mockJobs = [
        {
          id: "job1",
          userId: "user1",
          tokensCost: 10,
          tier: EnhancementTier.TIER_4K,
          processingStartedAt: stuckTime,
          updatedAt: stuckTime,
        },
      ];

      vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue(mockJobs);

      // Mock transaction to execute the callback immediately
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        return await callback(prisma);
      });

      vi.mocked(prisma.imageEnhancementJob.update).mockResolvedValue({
        ...mockJobs[0],
        status: JobStatus.FAILED,
        errorMessage: "Job timed out",
      } as never);

      vi.mocked(TokenBalanceManager.refundTokens).mockResolvedValue({
        success: true,
        balance: 110,
        transaction: {
          id: "tx1",
          userId: "user1",
          amount: 10,
          type: "REFUND",
          source: "enhancement_failed",
          sourceId: "job1",
          balanceAfter: 110,
          metadata: null,
          createdAt: new Date(),
        },
      });

      const result = await cleanupStuckJobs();

      expect(result.totalFound).toBe(1);
      expect(result.cleanedUp).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.tokensRefunded).toBe(10);
      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0].tokensRefunded).toBe(10);
      expect(result.errors).toHaveLength(0);

      expect(prisma.imageEnhancementJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "job1" },
          data: expect.objectContaining({
            status: JobStatus.FAILED,
            errorMessage: expect.stringContaining("Job timed out"),
            processingCompletedAt: expect.any(Date),
          }),
        }),
      );

      expect(TokenBalanceManager.refundTokens).toHaveBeenCalledWith(
        "user1",
        10,
        "job1",
        expect.stringContaining("Job timeout cleanup"),
      );
    });

    it("should handle multiple stuck jobs", async () => {
      const now = new Date();
      const stuckTime = new Date(now.getTime() - 10 * 60 * 1000);

      const mockJobs = [
        {
          id: "job1",
          userId: "user1",
          tokensCost: 10,
          processingStartedAt: stuckTime,
          updatedAt: stuckTime,
        },
        {
          id: "job2",
          userId: "user2",
          tokensCost: 5,
          processingStartedAt: stuckTime,
          updatedAt: stuckTime,
        },
        {
          id: "job3",
          userId: "user3",
          tokensCost: 2,
          processingStartedAt: stuckTime,
          updatedAt: stuckTime,
        },
      ];

      vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue(mockJobs);

      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        return await callback(prisma);
      });

      vi.mocked(prisma.imageEnhancementJob.update).mockResolvedValue({} as never);

      vi.mocked(TokenBalanceManager.refundTokens).mockResolvedValue({
        success: true,
        balance: 100,
        transaction: {
          id: "tx",
          userId: "user",
          amount: 10,
          type: "REFUND",
          source: "enhancement_failed",
          sourceId: "job",
          balanceAfter: 100,
          metadata: null,
          createdAt: new Date(),
        },
      });

      const result = await cleanupStuckJobs();

      expect(result.totalFound).toBe(3);
      expect(result.cleanedUp).toBe(3);
      expect(result.tokensRefunded).toBe(17); // 10 + 5 + 2
      expect(prisma.imageEnhancementJob.update).toHaveBeenCalledTimes(3);
      expect(TokenBalanceManager.refundTokens).toHaveBeenCalledTimes(3);
    });

    it("should handle partial failures gracefully", async () => {
      const now = new Date();
      const stuckTime = new Date(now.getTime() - 10 * 60 * 1000);

      const mockJobs = [
        {
          id: "job1",
          userId: "user1",
          tokensCost: 10,
          processingStartedAt: stuckTime,
          updatedAt: stuckTime,
        },
        {
          id: "job2",
          userId: "user2",
          tokensCost: 5,
          processingStartedAt: stuckTime,
          updatedAt: stuckTime,
        },
      ];

      vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue(mockJobs);

      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        return await callback(prisma);
      });

      vi.mocked(prisma.imageEnhancementJob.update).mockResolvedValue({} as never);

      // First refund succeeds, second fails
      vi.mocked(TokenBalanceManager.refundTokens)
        .mockResolvedValueOnce({
          success: true,
          balance: 110,
          transaction: {
            id: "tx1",
            userId: "user1",
            amount: 10,
            type: "REFUND",
            source: "enhancement_failed",
            sourceId: "job1",
            balanceAfter: 110,
            metadata: null,
            createdAt: new Date(),
          },
        })
        .mockResolvedValueOnce({
          success: false,
          error: "Refund failed",
        });

      const result = await cleanupStuckJobs();

      expect(result.totalFound).toBe(2);
      expect(result.cleanedUp).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.tokensRefunded).toBe(10); // Only first job refunded
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].jobId).toBe("job2");
    });

    it("should use custom timeout threshold", async () => {
      const customTimeout = 10 * 60 * 1000; // 10 minutes

      vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue([]);

      await cleanupStuckJobs({ timeoutMs: customTimeout });

      expect(prisma.imageEnhancementJob.findMany).toHaveBeenCalled();
    });

    it("should respect batch size option", async () => {
      const batchSize = 25;

      vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue([]);

      await cleanupStuckJobs({ batchSize });

      expect(prisma.imageEnhancementJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: batchSize,
        }),
      );
    });

    it("should handle jobs without processingStartedAt timestamp", async () => {
      const now = new Date();
      const stuckTime = new Date(now.getTime() - 10 * 60 * 1000);

      const mockJobs = [
        {
          id: "job1",
          userId: "user1",
          tokensCost: 10,
          processingStartedAt: null, // No timestamp
          updatedAt: stuckTime,
        },
      ];

      vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue(mockJobs);

      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        return await callback(prisma);
      });

      vi.mocked(prisma.imageEnhancementJob.update).mockResolvedValue({} as never);

      vi.mocked(TokenBalanceManager.refundTokens).mockResolvedValue({
        success: true,
        balance: 110,
        transaction: {
          id: "tx1",
          userId: "user1",
          amount: 10,
          type: "REFUND",
          source: "enhancement_failed",
          sourceId: "job1",
          balanceAfter: 110,
          metadata: null,
          createdAt: new Date(),
        },
      });

      const result = await cleanupStuckJobs();

      expect(result.totalFound).toBe(1);
      expect(result.cleanedUp).toBe(1);
      expect(result.jobs[0].processingDuration).toBeGreaterThan(0);
    });

    it("should include error details in job results when cleanup fails", async () => {
      const now = new Date();
      const stuckTime = new Date(now.getTime() - 10 * 60 * 1000);

      const mockJobs = [
        {
          id: "job1",
          userId: "user1",
          tokensCost: 10,
          processingStartedAt: stuckTime,
          updatedAt: stuckTime,
        },
      ];

      vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue(mockJobs);

      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        return await callback(prisma);
      });

      vi.mocked(prisma.imageEnhancementJob.update).mockResolvedValue({} as never);

      const errorMessage = "Database connection failed";
      vi.mocked(TokenBalanceManager.refundTokens).mockResolvedValue({
        success: false,
        error: errorMessage,
      });

      const result = await cleanupStuckJobs();

      expect(result.jobs[0].error).toBeDefined();
      expect(result.jobs[0].error).toContain(errorMessage);
      expect(result.errors).toHaveLength(1);
    });

    it("should handle database transaction errors", async () => {
      const now = new Date();
      const stuckTime = new Date(now.getTime() - 10 * 60 * 1000);

      const mockJobs = [
        {
          id: "job1",
          userId: "user1",
          tokensCost: 10,
          processingStartedAt: stuckTime,
          updatedAt: stuckTime,
        },
      ];

      vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue(mockJobs);

      // Mock transaction failure
      vi.mocked(prisma.$transaction).mockRejectedValue(
        new Error("Transaction failed"),
      );

      const result = await cleanupStuckJobs();

      expect(result.failed).toBe(1);
      expect(result.cleanedUp).toBe(0);
      expect(result.errors).toHaveLength(1);
    });

    it("should rethrow error when findStuckJobs fails", async () => {
      const dbError = new Error("Database connection lost");
      vi.mocked(prisma.imageEnhancementJob.findMany).mockRejectedValue(dbError);

      await expect(cleanupStuckJobs()).rejects.toThrow("Database connection lost");
    });

    it("should rethrow non-Error types when findStuckJobs fails", async () => {
      vi.mocked(prisma.imageEnhancementJob.findMany).mockRejectedValue("String error");

      await expect(cleanupStuckJobs()).rejects.toBe("String error");
    });

    it("should handle non-Error types in single job cleanup", async () => {
      const now = new Date();
      const stuckTime = new Date(now.getTime() - 10 * 60 * 1000);

      const mockJobs = [
        {
          id: "job1",
          userId: "user1",
          tokensCost: 10,
          processingStartedAt: stuckTime,
          updatedAt: stuckTime,
        },
      ];

      vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue(mockJobs);

      // Mock transaction to throw a non-Error type
      vi.mocked(prisma.$transaction).mockRejectedValue("Non-Error string thrown");

      const result = await cleanupStuckJobs();

      expect(result.failed).toBe(1);
      expect(result.cleanedUp).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe("Non-Error string thrown");
    });

    it("should throw error when result is missing for a job (defensive check)", async () => {
      const now = new Date();
      const stuckTime = new Date(now.getTime() - 10 * 60 * 1000);

      const mockJobs = [
        {
          id: "job1",
          userId: "user1",
          tokensCost: 10,
          processingStartedAt: stuckTime,
          updatedAt: stuckTime,
        },
        {
          id: "job2",
          userId: "user2",
          tokensCost: 5,
          processingStartedAt: stuckTime,
          updatedAt: stuckTime,
        },
      ];

      vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue(mockJobs);

      // Mock Promise.all to return fewer results than jobs
      // This simulates the defensive check scenario
      const promiseAllSpy = vi.spyOn(Promise, "all").mockImplementationOnce(async () => {
        // Return only one result for two jobs to trigger the defensive check
        return [
          {
            success: true,
            tokensRefunded: 10,
            processingDuration: 1000,
          },
          // Second result is undefined to trigger the check
        ] as never;
      });

      await expect(cleanupStuckJobs()).rejects.toThrow("Missing result for job job2");

      promiseAllSpy.mockRestore();
    });
  });
});
