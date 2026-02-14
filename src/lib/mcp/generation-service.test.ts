import { JobStatus, McpJobType } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock all external dependencies - CRITICAL: Mock AI APIs to prevent real calls
const {
  mockMcpGenerationJob,
  mockWorkspaceCreditManager,
  mockGeminiClient,
  mockUploadToR2,
  mockLogger,
} = vi
  .hoisted(() => ({
    mockMcpGenerationJob: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    mockWorkspaceCreditManager: {
      hasEnoughCredits: vi.fn(),
      consumeCredits: vi.fn(),
      refundCredits: vi.fn(),
    },
    mockGeminiClient: {
      generateImageWithGemini: vi.fn(),
      modifyImageWithGemini: vi.fn(),
      DEFAULT_MODEL: "gemini-3-pro-image-preview",
    },
    mockUploadToR2: vi.fn(),
    mockLogger: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    },
  }));

vi.mock("@/lib/logger", () => ({
  default: mockLogger,
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    mcpGenerationJob: mockMcpGenerationJob,
  },
}));

vi.mock("@/lib/credits/workspace-credit-manager", () => ({
  WorkspaceCreditManager: mockWorkspaceCreditManager,
}));

// CRITICAL: Mock the Gemini client to prevent real AI API calls
vi.mock("@/lib/ai/gemini-client", () => ({
  generateImageWithGemini: mockGeminiClient.generateImageWithGemini,
  modifyImageWithGemini: mockGeminiClient.modifyImageWithGemini,
  DEFAULT_MODEL: mockGeminiClient.DEFAULT_MODEL,
}));

vi.mock("@/lib/storage/r2-client", () => ({
  uploadToR2: mockUploadToR2,
}));

// Mock sharp for image metadata
vi.mock("sharp", () => ({
  default: vi.fn().mockReturnValue({
    metadata: vi.fn().mockResolvedValue({ width: 1024, height: 1024 }),
  }),
}));

import {
  cancelMcpJob,
  classifyError,
  createGenerationJob,
  createModificationJob,
  getJob,
  getJobHistory,
  rerunMcpJob,
} from "./generation-service";

describe("generation-service", () => {
  const testUserId = "test-user-123";
  const testApiKeyId = "api-key-456";
  const testJobId = "job-789";
  const mockDate = new Date("2024-01-15T12:00:00Z");

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations that might have been set by previous tests
    // This is needed because vi.clearAllMocks() only clears call history, not implementations
    mockGeminiClient.generateImageWithGemini.mockReset();
    mockGeminiClient.modifyImageWithGemini.mockReset();
    mockUploadToR2.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(async () => {
    // Flush all pending timers and async operations to prevent state leakage
    // between tests from background processing
    await vi.runAllTimersAsync();
    vi.useRealTimers();
  });

  describe("createGenerationJob", () => {
    it("should create a generation job when user has enough credits", async () => {
      mockMcpGenerationJob.count.mockResolvedValue(0); // No concurrent jobs
      mockWorkspaceCreditManager.consumeCredits.mockResolvedValue({
        success: true,
      });
      mockMcpGenerationJob.create.mockResolvedValue({
        id: testJobId,
        userId: testUserId,
        type: McpJobType.GENERATE,
        tier: "TIER_1K",
        creditsCost: 2,
        status: JobStatus.PROCESSING,
      });

      const result = await createGenerationJob({
        userId: testUserId,
        apiKeyId: testApiKeyId,
        prompt: "A beautiful sunset",
        tier: "TIER_1K",
      });

      expect(result.success).toBe(true);
      expect(result.jobId).toBe(testJobId);
      expect(result.creditsCost).toBe(2);
      expect(mockWorkspaceCreditManager.consumeCredits).toHaveBeenCalledWith({
        userId: testUserId,
        amount: 2,
        source: "mcp_generation",
        sourceId: "pending",
      });
    });

    it("should reject when user has too many concurrent jobs", async () => {
      mockMcpGenerationJob.count.mockResolvedValue(3); // At max concurrent jobs

      const result = await createGenerationJob({
        userId: testUserId,
        prompt: "A beautiful sunset",
        tier: "TIER_1K",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Too many concurrent jobs");
      expect(mockWorkspaceCreditManager.consumeCredits).not.toHaveBeenCalled();
    });

    it("should reject when credit consumption fails", async () => {
      mockMcpGenerationJob.count.mockResolvedValue(0);
      mockWorkspaceCreditManager.consumeCredits.mockResolvedValue({
        success: false,
        error: "Insufficient credits",
      });

      const result = await createGenerationJob({
        userId: testUserId,
        prompt: "A beautiful sunset",
        tier: "TIER_2K",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Insufficient");
    });

    it("should use correct credit costs for each tier", async () => {
      mockMcpGenerationJob.count.mockResolvedValue(0);
      mockWorkspaceCreditManager.consumeCredits.mockResolvedValue({
        success: true,
      });
      mockMcpGenerationJob.create.mockResolvedValue({
        id: testJobId,
        status: JobStatus.PROCESSING,
      });

      // Test TIER_1K = 2 tokens
      await createGenerationJob({
        userId: testUserId,
        prompt: "test",
        tier: "TIER_1K",
      });
      expect(mockWorkspaceCreditManager.consumeCredits).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 2 }),
      );

      vi.clearAllMocks();

      // Test TIER_2K = 5 tokens
      mockMcpGenerationJob.count.mockResolvedValue(0);
      mockWorkspaceCreditManager.consumeCredits.mockResolvedValue({
        success: true,
      });
      mockMcpGenerationJob.create.mockResolvedValue({
        id: testJobId,
        status: JobStatus.PROCESSING,
      });

      await createGenerationJob({
        userId: testUserId,
        prompt: "test",
        tier: "TIER_2K",
      });
      expect(mockWorkspaceCreditManager.consumeCredits).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 5 }),
      );

      vi.clearAllMocks();

      // Test TIER_4K = 10 tokens
      mockMcpGenerationJob.count.mockResolvedValue(0);
      mockWorkspaceCreditManager.consumeCredits.mockResolvedValue({
        success: true,
      });
      mockMcpGenerationJob.create.mockResolvedValue({
        id: testJobId,
        status: JobStatus.PROCESSING,
      });

      await createGenerationJob({
        userId: testUserId,
        prompt: "test",
        tier: "TIER_4K",
      });
      expect(mockWorkspaceCreditManager.consumeCredits).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 10 }),
      );
    });
  });

  describe("createModificationJob", () => {
    it("should create a modification job when user has enough credits", async () => {
      mockMcpGenerationJob.count.mockResolvedValue(0);
      mockWorkspaceCreditManager.consumeCredits.mockResolvedValue({
        success: true,
      });
      mockMcpGenerationJob.create.mockResolvedValue({
        id: testJobId,
        userId: testUserId,
        type: McpJobType.MODIFY,
        tier: "TIER_1K",
        creditsCost: 2,
        status: JobStatus.PROCESSING,
      });

      const result = await createModificationJob({
        userId: testUserId,
        apiKeyId: testApiKeyId,
        prompt: "Add a rainbow",
        tier: "TIER_1K",
        imageData: "base64imagedata",
        mimeType: "image/jpeg",
      });

      expect(result.success).toBe(true);
      expect(result.jobId).toBe(testJobId);
      expect(mockWorkspaceCreditManager.consumeCredits).toHaveBeenCalledWith({
        userId: testUserId,
        amount: 2,
        source: "mcp_generation",
        sourceId: "pending",
      });
    });

    it("should reject when user has too many concurrent jobs", async () => {
      mockMcpGenerationJob.count.mockResolvedValue(3); // At max concurrent jobs

      const result = await createModificationJob({
        userId: testUserId,
        prompt: "Add a rainbow",
        tier: "TIER_1K",
        imageData: "base64imagedata",
        mimeType: "image/jpeg",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Too many concurrent jobs");
      expect(mockWorkspaceCreditManager.consumeCredits).not.toHaveBeenCalled();
    });
  });

  describe("getJob", () => {
    it("should return job details", async () => {
      const mockJob = {
        id: testJobId,
        type: McpJobType.GENERATE,
        tier: "TIER_1K",
        creditsCost: 2,
        status: JobStatus.COMPLETED,
        prompt: "A beautiful sunset",
        outputImageUrl: "https://example.com/image.jpg",
        createdAt: mockDate,
      };

      mockMcpGenerationJob.findFirst.mockResolvedValue(mockJob);

      const result = await getJob(testJobId, testUserId);

      expect(result).toEqual(mockJob);
      expect(mockMcpGenerationJob.findFirst).toHaveBeenCalledWith({
        where: { id: testJobId, userId: testUserId },
        select: expect.any(Object),
      });
    });

    it("should return null for non-existent job", async () => {
      mockMcpGenerationJob.findFirst.mockResolvedValue(null);

      const result = await getJob("nonexistent", testUserId);

      expect(result).toBeNull();
    });

    it("should not return job for wrong user", async () => {
      mockMcpGenerationJob.findFirst.mockResolvedValue(null);

      const result = await getJob(testJobId, "wrong-user");

      expect(result).toBeNull();
    });
  });

  describe("getJobHistory", () => {
    it("should return paginated job history", async () => {
      const mockJobs = [
        {
          id: "job1",
          type: McpJobType.GENERATE,
          tier: "TIER_1K",
          creditsCost: 2,
          status: JobStatus.COMPLETED,
          prompt: "Test prompt 1",
          createdAt: mockDate,
          processingCompletedAt: mockDate,
          apiKey: { name: "Test Key" },
        },
        {
          id: "job2",
          type: McpJobType.MODIFY,
          tier: "TIER_2K",
          creditsCost: 5,
          status: JobStatus.COMPLETED,
          prompt: "Test prompt 2",
          createdAt: mockDate,
          processingCompletedAt: null,
          apiKey: null,
        },
      ];

      mockMcpGenerationJob.findMany.mockResolvedValue(mockJobs);
      mockMcpGenerationJob.count.mockResolvedValue(10);

      const result = await getJobHistory(testUserId, { limit: 20, offset: 0 });

      expect(result.jobs).toHaveLength(2);
      expect(result.total).toBe(10);
      expect(result.hasMore).toBe(false);
      expect(result.jobs[0]!.apiKeyName).toBe("Test Key");
      expect(result.jobs[1]!.apiKeyName).toBeNull();
    });

    it("should filter by job type", async () => {
      mockMcpGenerationJob.findMany.mockResolvedValue([]);
      mockMcpGenerationJob.count.mockResolvedValue(0);

      await getJobHistory(testUserId, { type: McpJobType.GENERATE });

      expect(mockMcpGenerationJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: testUserId, type: McpJobType.GENERATE },
        }),
      );
    });

    it("should handle pagination correctly", async () => {
      mockMcpGenerationJob.findMany.mockResolvedValue([]);
      mockMcpGenerationJob.count.mockResolvedValue(50);

      const result = await getJobHistory(testUserId, { limit: 20, offset: 0 });

      expect(result.hasMore).toBe(true);
    });

    it("should use default options when none provided", async () => {
      mockMcpGenerationJob.findMany.mockResolvedValue([]);
      mockMcpGenerationJob.count.mockResolvedValue(0);

      const result = await getJobHistory(testUserId);

      expect(result.jobs).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
      // Verify default limit=20 and offset=0
      expect(mockMcpGenerationJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 0,
        }),
      );
    });
  });

  describe("concurrent job limit enforcement", () => {
    it("should enforce MAX_CONCURRENT_JOBS_PER_USER = 3", async () => {
      // Test with exactly 3 concurrent jobs (should be rejected)
      mockMcpGenerationJob.count.mockResolvedValue(3);

      const result = await createGenerationJob({
        userId: testUserId,
        prompt: "test",
        tier: "TIER_1K",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Maximum 3 jobs");
    });

    it("should allow job when under concurrent limit", async () => {
      // Test with 2 concurrent jobs (should be allowed)
      mockMcpGenerationJob.count.mockResolvedValue(2);
      mockWorkspaceCreditManager.consumeCredits.mockResolvedValue({
        success: true,
      });
      mockMcpGenerationJob.create.mockResolvedValue({
        id: testJobId,
        status: JobStatus.PROCESSING,
      });

      const result = await createGenerationJob({
        userId: testUserId,
        prompt: "test",
        tier: "TIER_1K",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("AI API mocking verification", () => {
    it("should NOT call real Gemini API during tests", async () => {
      // This test verifies that the mock is in place
      // If the real API was called, we would get actual network errors
      mockMcpGenerationJob.count.mockResolvedValue(0);
      mockWorkspaceCreditManager.consumeCredits.mockResolvedValue({
        success: true,
      });
      mockMcpGenerationJob.create.mockResolvedValue({
        id: testJobId,
        status: JobStatus.PROCESSING,
      });
      // Set up mock to reject so background processing fails quickly without leaving stale state
      mockGeminiClient.generateImageWithGemini.mockRejectedValue(
        new Error("Mock - not configured for this test"),
      );
      mockMcpGenerationJob.update.mockResolvedValue({});
      mockMcpGenerationJob.findUnique.mockResolvedValue(null);

      // The job creation should succeed without calling the real API
      // (the background processing is not awaited)
      const result = await createGenerationJob({
        userId: testUserId,
        prompt: "test",
        tier: "TIER_1K",
      });

      expect(result.success).toBe(true);
      // Verify the mock Gemini functions are available
      expect(mockGeminiClient.generateImageWithGemini).toBeDefined();
      expect(mockGeminiClient.modifyImageWithGemini).toBeDefined();

      // Wait for background processing to complete to avoid state leakage to next test
      await vi.advanceTimersByTimeAsync(100);
    });
  });

  describe("background job processing - generation", () => {
    it("should process generation job successfully and update job status", async () => {
      const mockImageBuffer = Buffer.from("fake-image-data");
      mockMcpGenerationJob.count.mockResolvedValue(0);
      mockWorkspaceCreditManager.consumeCredits.mockResolvedValue({
        success: true,
      });
      mockMcpGenerationJob.create.mockResolvedValue({
        id: testJobId,
        userId: testUserId,
        type: McpJobType.GENERATE,
        tier: "TIER_1K",
        creditsCost: 2,
        status: JobStatus.PROCESSING,
      });
      mockGeminiClient.generateImageWithGemini.mockResolvedValue(
        mockImageBuffer,
      );
      mockUploadToR2.mockResolvedValue({
        url: "https://r2.example.com/image.jpg",
      });
      mockMcpGenerationJob.update.mockResolvedValue({});

      const result = await createGenerationJob({
        userId: testUserId,
        apiKeyId: testApiKeyId,
        prompt: "A beautiful sunset",
        tier: "TIER_1K",
        negativePrompt: "ugly",
      });

      // Ensure job was created successfully
      expect(result.success).toBe(true);
      expect(result.jobId).toBe(testJobId);

      // Wait for background processing to complete - need to poll until async work finishes
      await vi.waitFor(
        () => {
          expect(mockMcpGenerationJob.update).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                status: JobStatus.COMPLETED,
              }),
            }),
          );
        },
        { timeout: 1000 },
      );

      // Verify Gemini was called with correct params
      expect(mockGeminiClient.generateImageWithGemini).toHaveBeenCalledWith({
        prompt: "A beautiful sunset",
        tier: "1K",
        negativePrompt: "ugly",
      });

      // Verify R2 upload was called
      expect(mockUploadToR2).toHaveBeenCalledWith({
        key: expect.stringContaining(
          `mcp-generated/${testUserId}/${testJobId}`,
        ),
        buffer: mockImageBuffer,
        contentType: "image/jpeg",
      });

      // Verify job was updated with success
      expect(mockMcpGenerationJob.update).toHaveBeenCalledWith({
        where: { id: testJobId },
        data: expect.objectContaining({
          status: JobStatus.COMPLETED,
          outputImageUrl: "https://r2.example.com/image.jpg",
        }),
      });
    });

    it("should handle generation job failure and refund credits", async () => {
      mockMcpGenerationJob.count.mockResolvedValue(0);
      mockWorkspaceCreditManager.consumeCredits.mockResolvedValue({
        success: true,
      });
      mockMcpGenerationJob.create.mockResolvedValue({
        id: testJobId,
        userId: testUserId,
        type: McpJobType.GENERATE,
        tier: "TIER_1K",
        creditsCost: 2,
        status: JobStatus.PROCESSING,
      });
      // Simulate Gemini failure
      mockGeminiClient.generateImageWithGemini.mockRejectedValue(
        new Error("Request timed out"),
      );
      mockMcpGenerationJob.update.mockResolvedValue({});
      mockMcpGenerationJob.findUnique.mockResolvedValue({
        id: testJobId,
        userId: testUserId,
        creditsCost: 2,
      });
      mockWorkspaceCreditManager.refundCredits.mockResolvedValue({ success: true });

      await createGenerationJob({
        userId: testUserId,
        prompt: "A beautiful sunset",
        tier: "TIER_1K",
      });

      // Wait for background processing
      await vi.advanceTimersByTimeAsync(100);

      // Verify job was updated with failure
      expect(mockMcpGenerationJob.update).toHaveBeenCalledWith({
        where: { id: testJobId },
        data: expect.objectContaining({
          status: JobStatus.FAILED,
          errorMessage: expect.stringContaining("took too long"),
        }),
      });

      // Verify credits were refunded
      expect(mockWorkspaceCreditManager.refundCredits).toHaveBeenCalledWith(
        testUserId,
        2,
      );

      // Verify job was updated to REFUNDED status
      expect(mockMcpGenerationJob.update).toHaveBeenCalledWith({
        where: { id: testJobId },
        data: { status: JobStatus.REFUNDED },
      });
    });

    it("should handle R2 upload failure in generation job", async () => {
      const mockImageBuffer = Buffer.from("fake-image-data");
      mockMcpGenerationJob.count.mockResolvedValue(0);
      mockWorkspaceCreditManager.consumeCredits.mockResolvedValue({
        success: true,
      });
      mockMcpGenerationJob.create.mockResolvedValue({
        id: testJobId,
        userId: testUserId,
        type: McpJobType.GENERATE,
        tier: "TIER_1K",
        creditsCost: 2,
        status: JobStatus.PROCESSING,
      });
      // Generation succeeds but upload fails
      mockGeminiClient.generateImageWithGemini.mockResolvedValue(
        mockImageBuffer,
      );
      mockUploadToR2.mockRejectedValue(new Error("R2 upload error"));
      mockMcpGenerationJob.update.mockResolvedValue({});
      mockMcpGenerationJob.findUnique.mockResolvedValue({
        id: testJobId,
        userId: testUserId,
        creditsCost: 2,
      });
      mockWorkspaceCreditManager.refundCredits.mockResolvedValue({ success: true });

      await createGenerationJob({
        userId: testUserId,
        prompt: "A beautiful sunset",
        tier: "TIER_1K",
      });

      // Wait for background processing
      await vi.advanceTimersByTimeAsync(100);

      // Verify job was marked as failed
      expect(mockMcpGenerationJob.update).toHaveBeenCalledWith({
        where: { id: testJobId },
        data: expect.objectContaining({
          status: JobStatus.FAILED,
        }),
      });

      // Verify credits were refunded
      expect(mockWorkspaceCreditManager.refundCredits).toHaveBeenCalledWith(
        testUserId,
        2,
      );
    });

    it("should handle DB update failure after successful generation upload", async () => {
      const mockImageBuffer = Buffer.from("fake-image-data");
      mockMcpGenerationJob.count.mockResolvedValue(0);
      mockWorkspaceCreditManager.consumeCredits.mockResolvedValue({
        success: true,
      });
      mockMcpGenerationJob.create.mockResolvedValue({
        id: testJobId,
        userId: testUserId,
        type: McpJobType.GENERATE,
        tier: "TIER_1K",
        creditsCost: 2,
        status: JobStatus.PROCESSING,
      });
      mockGeminiClient.generateImageWithGemini.mockResolvedValue(
        mockImageBuffer,
      );
      mockUploadToR2.mockResolvedValue({
        url: "https://r2.example.com/image.jpg",
      });
      // DB update for COMPLETED status fails
      mockMcpGenerationJob.update.mockRejectedValueOnce(
        new Error("DB error on completion update"),
      ).mockResolvedValue({});
      mockMcpGenerationJob.findUnique.mockResolvedValue({
        id: testJobId,
        userId: testUserId,
        creditsCost: 2,
      });
      mockWorkspaceCreditManager.refundCredits.mockResolvedValue({ success: true });

      await createGenerationJob({
        userId: testUserId,
        prompt: "A beautiful sunset",
        tier: "TIER_1K",
      });

      // Wait for background processing
      await vi.advanceTimersByTimeAsync(100);

      // Verify credits were refunded after the DB update failure
      expect(mockWorkspaceCreditManager.refundCredits).toHaveBeenCalledWith(
        testUserId,
        2,
      );
    });

    it("should not refund when job not found after failure", async () => {
      mockMcpGenerationJob.count.mockResolvedValue(0);
      mockWorkspaceCreditManager.consumeCredits.mockResolvedValue({
        success: true,
      });
      mockMcpGenerationJob.create.mockResolvedValue({
        id: testJobId,
        userId: testUserId,
        type: McpJobType.GENERATE,
        tier: "TIER_1K",
        creditsCost: 2,
        status: JobStatus.PROCESSING,
      });
      mockGeminiClient.generateImageWithGemini.mockRejectedValue(
        new Error("API key invalid"),
      );
      mockMcpGenerationJob.update.mockResolvedValue({});
      // Job not found when trying to refund
      mockMcpGenerationJob.findUnique.mockResolvedValue(null);

      await createGenerationJob({
        userId: testUserId,
        prompt: "A beautiful sunset",
        tier: "TIER_1K",
      });

      // Wait for background processing
      await vi.advanceTimersByTimeAsync(100);

      // Verify job was updated with failure
      expect(mockMcpGenerationJob.update).toHaveBeenCalledWith({
        where: { id: testJobId },
        data: expect.objectContaining({
          status: JobStatus.FAILED,
        }),
      });

      // Verify refund was NOT called since job not found
      expect(mockWorkspaceCreditManager.refundCredits).not.toHaveBeenCalled();
    });
  });

  describe("background job processing - modification", () => {
    it("should process modification job successfully", async () => {
      const mockImageBuffer = Buffer.from("fake-modified-image-data");
      const inputBase64 = Buffer.from("original-image").toString("base64");

      mockMcpGenerationJob.count.mockResolvedValue(0);
      mockWorkspaceCreditManager.consumeCredits.mockResolvedValue({
        success: true,
      });
      mockMcpGenerationJob.create.mockResolvedValue({
        id: testJobId,
        userId: testUserId,
        type: McpJobType.MODIFY,
        tier: "TIER_2K",
        creditsCost: 5,
        status: JobStatus.PROCESSING,
      });
      // First upload call is for input image, second for output
      mockUploadToR2
        .mockResolvedValueOnce({ url: "https://r2.example.com/input.jpg" })
        .mockResolvedValueOnce({ url: "https://r2.example.com/output.jpg" });
      mockGeminiClient.modifyImageWithGemini.mockResolvedValue(mockImageBuffer);
      mockMcpGenerationJob.update.mockResolvedValue({});

      await createModificationJob({
        userId: testUserId,
        apiKeyId: testApiKeyId,
        prompt: "Add a rainbow",
        tier: "TIER_2K",
        imageData: inputBase64,
        mimeType: "image/png",
      });

      // Wait for background processing
      await vi.advanceTimersByTimeAsync(100);

      // Verify input image was uploaded to R2
      expect(mockUploadToR2).toHaveBeenCalledWith({
        key: expect.stringContaining(
          `mcp-input/${testUserId}/${testJobId}.png`,
        ),
        buffer: expect.any(Buffer),
        contentType: "image/png",
      });

      // Verify job was updated with input image URL
      expect(mockMcpGenerationJob.update).toHaveBeenCalledWith({
        where: { id: testJobId },
        data: {
          inputImageUrl: "https://r2.example.com/input.jpg",
          inputImageR2Key: expect.stringContaining("mcp-input"),
        },
      });

      // Verify Gemini modify was called
      expect(mockGeminiClient.modifyImageWithGemini).toHaveBeenCalledWith({
        prompt: "Add a rainbow",
        tier: "2K",
        imageData: inputBase64,
        mimeType: "image/png",
        aspectRatio: "1:1",
      });

      // Verify output was uploaded
      expect(mockUploadToR2).toHaveBeenCalledWith({
        key: expect.stringContaining(
          `mcp-modified/${testUserId}/${testJobId}.jpg`,
        ),
        buffer: mockImageBuffer,
        contentType: "image/jpeg",
      });

      // Verify job was updated with success
      expect(mockMcpGenerationJob.update).toHaveBeenCalledWith({
        where: { id: testJobId },
        data: expect.objectContaining({
          status: JobStatus.COMPLETED,
          outputImageUrl: "https://r2.example.com/output.jpg",
        }),
      });
    });

    it("should handle modification job failure and refund credits", async () => {
      const inputBase64 = Buffer.from("original-image").toString("base64");

      mockMcpGenerationJob.count.mockResolvedValue(0);
      mockWorkspaceCreditManager.consumeCredits.mockResolvedValue({
        success: true,
      });
      mockMcpGenerationJob.create.mockResolvedValue({
        id: testJobId,
        userId: testUserId,
        type: McpJobType.MODIFY,
        tier: "TIER_2K",
        creditsCost: 5,
        status: JobStatus.PROCESSING,
      });
      // Input upload succeeds
      mockUploadToR2.mockResolvedValueOnce({
        url: "https://r2.example.com/input.jpg",
      });
      mockMcpGenerationJob.update.mockResolvedValue({});
      // Modification fails with content policy error
      mockGeminiClient.modifyImageWithGemini.mockRejectedValue(
        new Error("Content blocked by policy"),
      );
      mockMcpGenerationJob.findUnique.mockResolvedValue({
        id: testJobId,
        userId: testUserId,
        creditsCost: 5,
      });
      mockWorkspaceCreditManager.refundCredits.mockResolvedValue({ success: true });

      await createModificationJob({
        userId: testUserId,
        prompt: "Inappropriate content",
        tier: "TIER_2K",
        imageData: inputBase64,
        mimeType: "image/jpeg",
      });

      // Wait for background processing
      await vi.advanceTimersByTimeAsync(100);

      // Verify job was updated with failure
      expect(mockMcpGenerationJob.update).toHaveBeenCalledWith({
        where: { id: testJobId },
        data: expect.objectContaining({
          status: JobStatus.FAILED,
          errorMessage: expect.stringContaining("content policies"),
        }),
      });

      // Verify credits were refunded
      expect(mockWorkspaceCreditManager.refundCredits).toHaveBeenCalledWith(
        testUserId,
        5,
      );

      // Verify job was updated to REFUNDED status
      expect(mockMcpGenerationJob.update).toHaveBeenCalledWith({
        where: { id: testJobId },
        data: { status: JobStatus.REFUNDED },
      });
    });

    it("should not refund when modification job not found after failure", async () => {
      const inputBase64 = Buffer.from("original-image").toString("base64");

      mockMcpGenerationJob.count.mockResolvedValue(0);
      mockWorkspaceCreditManager.consumeCredits.mockResolvedValue({
        success: true,
      });
      mockMcpGenerationJob.create.mockResolvedValue({
        id: testJobId,
        userId: testUserId,
        type: McpJobType.MODIFY,
        tier: "TIER_2K",
        creditsCost: 5,
        status: JobStatus.PROCESSING,
      });
      // Input upload succeeds
      mockUploadToR2.mockResolvedValueOnce({
        url: "https://r2.example.com/input.jpg",
      });
      mockMcpGenerationJob.update.mockResolvedValue({});
      // Modification fails
      mockGeminiClient.modifyImageWithGemini.mockRejectedValue(
        new Error("Content blocked by policy"),
      );
      // Job not found when trying to refund
      mockMcpGenerationJob.findUnique.mockResolvedValue(null);

      await createModificationJob({
        userId: testUserId,
        prompt: "Inappropriate content",
        tier: "TIER_2K",
        imageData: inputBase64,
        mimeType: "image/jpeg",
      });

      // Wait for background processing
      await vi.advanceTimersByTimeAsync(100);

      // Verify job was updated with failure
      expect(mockMcpGenerationJob.update).toHaveBeenCalledWith({
        where: { id: testJobId },
        data: expect.objectContaining({
          status: JobStatus.FAILED,
        }),
      });

      // Verify refund was NOT called since job not found
      expect(mockWorkspaceCreditManager.refundCredits).not.toHaveBeenCalled();
    });

    it("should handle R2 upload failure for output image in modification job", async () => {
      const inputBase64 = Buffer.from("original-image").toString("base64");
      const mockImageBuffer = Buffer.from("fake-modified-image-data");

      mockMcpGenerationJob.count.mockResolvedValue(0);
      mockWorkspaceCreditManager.consumeCredits.mockResolvedValue({
        success: true,
      });
      mockMcpGenerationJob.create.mockResolvedValue({
        id: testJobId,
        userId: testUserId,
        type: McpJobType.MODIFY,
        tier: "TIER_2K",
        creditsCost: 5,
        status: JobStatus.PROCESSING,
      });
      // Input upload succeeds, output upload fails
      mockUploadToR2
        .mockResolvedValueOnce({ url: "https://r2.example.com/input.jpg" })
        .mockRejectedValueOnce(new Error("R2 upload failed for output"));
      mockGeminiClient.modifyImageWithGemini.mockResolvedValue(mockImageBuffer);
      mockMcpGenerationJob.update.mockResolvedValue({});
      mockMcpGenerationJob.findUnique.mockResolvedValue({
        id: testJobId,
        userId: testUserId,
        creditsCost: 5,
      });
      mockWorkspaceCreditManager.refundCredits.mockResolvedValue({ success: true });

      await createModificationJob({
        userId: testUserId,
        prompt: "Add effect",
        tier: "TIER_2K",
        imageData: inputBase64,
        mimeType: "image/jpeg",
      });

      // Wait for background processing
      await vi.advanceTimersByTimeAsync(100);

      // Verify job was marked as failed due to output upload failure
      expect(mockMcpGenerationJob.update).toHaveBeenCalledWith({
        where: { id: testJobId },
        data: expect.objectContaining({
          status: JobStatus.FAILED,
        }),
      });

      // Verify credits were refunded
      expect(mockWorkspaceCreditManager.refundCredits).toHaveBeenCalledWith(
        testUserId,
        5,
      );
    });

    it("should handle DB update failure after successful modification output upload", async () => {
      const inputBase64 = Buffer.from("original-image").toString("base64");
      const mockImageBuffer = Buffer.from("fake-modified-image-data");

      mockMcpGenerationJob.count.mockResolvedValue(0);
      mockWorkspaceCreditManager.consumeCredits.mockResolvedValue({
        success: true,
      });
      mockMcpGenerationJob.create.mockResolvedValue({
        id: testJobId,
        userId: testUserId,
        type: McpJobType.MODIFY,
        tier: "TIER_1K",
        creditsCost: 2,
        status: JobStatus.PROCESSING,
      });
      // Both uploads succeed
      mockUploadToR2
        .mockResolvedValueOnce({ url: "https://r2.example.com/input.jpg" })
        .mockResolvedValueOnce({ url: "https://r2.example.com/output.jpg" });
      mockGeminiClient.modifyImageWithGemini.mockResolvedValue(mockImageBuffer);

      // processModificationJob calls update multiple times:
      // 1. Update input image URL (succeeds)
      // 2. Update with COMPLETED status (fails - triggers handleModificationJobFailure)
      // 3+ handleModificationJobFailure also calls update (FAILED, REFUNDED status)
      let updateCallCount = 0;
      mockMcpGenerationJob.update.mockImplementation(() => {
        updateCallCount++;
        // Fail on the 2nd call (COMPLETED status update)
        if (updateCallCount === 2) {
          return Promise.reject(new Error("DB write failed on completion"));
        }
        return Promise.resolve({});
      });
      mockMcpGenerationJob.findUnique.mockResolvedValue({
        id: testJobId,
        userId: testUserId,
        creditsCost: 2,
      });
      mockWorkspaceCreditManager.refundCredits.mockResolvedValue({ success: true });

      await createModificationJob({
        userId: testUserId,
        prompt: "Add effect",
        tier: "TIER_1K",
        imageData: inputBase64,
        mimeType: "image/jpeg",
      });

      // Wait for background processing
      await vi.advanceTimersByTimeAsync(100);

      // Verify the failure handler was called and credits refunded
      expect(mockWorkspaceCreditManager.refundCredits).toHaveBeenCalledWith(
        testUserId,
        2,
      );
    });

    it("should handle input image update failure in modification job", async () => {
      const inputBase64 = Buffer.from("original-image").toString("base64");

      mockMcpGenerationJob.count.mockResolvedValue(0);
      mockWorkspaceCreditManager.consumeCredits.mockResolvedValue({
        success: true,
      });
      mockMcpGenerationJob.create.mockResolvedValue({
        id: testJobId,
        userId: testUserId,
        type: McpJobType.MODIFY,
        tier: "TIER_1K",
        creditsCost: 2,
        status: JobStatus.PROCESSING,
      });
      // Input upload succeeds
      mockUploadToR2.mockResolvedValueOnce({
        url: "https://r2.example.com/input.jpg",
      });
      // But DB update for input image URL fails
      mockMcpGenerationJob.update.mockRejectedValueOnce(
        new Error("DB error updating input URL"),
      ).mockResolvedValue({});
      mockMcpGenerationJob.findUnique.mockResolvedValue({
        id: testJobId,
        userId: testUserId,
        creditsCost: 2,
      });
      mockWorkspaceCreditManager.refundCredits.mockResolvedValue({ success: true });

      await createModificationJob({
        userId: testUserId,
        prompt: "Add effect",
        tier: "TIER_1K",
        imageData: inputBase64,
        mimeType: "image/jpeg",
      });

      // Wait for background processing
      await vi.advanceTimersByTimeAsync(100);

      // Verify credits were refunded after the input update failure
      expect(mockWorkspaceCreditManager.refundCredits).toHaveBeenCalledWith(
        testUserId,
        2,
      );
    });

    it("should use jpg extension when mimeType has no slash", async () => {
      const mockImageBuffer = Buffer.from("fake-modified-image-data");
      const inputBase64 = Buffer.from("original-image").toString("base64");

      mockMcpGenerationJob.count.mockResolvedValue(0);
      mockWorkspaceCreditManager.consumeCredits.mockResolvedValue({
        success: true,
      });
      mockMcpGenerationJob.create.mockResolvedValue({
        id: testJobId,
        userId: testUserId,
        type: McpJobType.MODIFY,
        tier: "TIER_1K",
        creditsCost: 2,
        status: JobStatus.PROCESSING,
      });
      mockUploadToR2
        .mockResolvedValueOnce({ url: "https://r2.example.com/input.jpg" })
        .mockResolvedValueOnce({ url: "https://r2.example.com/output.jpg" });
      mockGeminiClient.modifyImageWithGemini.mockResolvedValue(mockImageBuffer);
      mockMcpGenerationJob.update.mockResolvedValue({});

      await createModificationJob({
        userId: testUserId,
        prompt: "Add effect",
        tier: "TIER_1K",
        imageData: inputBase64,
        mimeType: "jpeg", // No slash - should fall back to "jpg"
      });

      // Wait for background processing
      await vi.advanceTimersByTimeAsync(100);

      // Verify input image upload used fallback extension
      expect(mockUploadToR2).toHaveBeenCalledWith({
        key: expect.stringContaining(".jpg"),
        buffer: expect.any(Buffer),
        contentType: "jpeg",
      });
    });
  });

  describe("outer catch handlers for background processing", () => {
    it("should log error when generation job throws unexpected error", async () => {

      mockMcpGenerationJob.count.mockResolvedValue(0);
      mockWorkspaceCreditManager.consumeCredits.mockResolvedValue({
        success: true,
      });
      mockMcpGenerationJob.create.mockResolvedValue({
        id: testJobId,
        userId: testUserId,
        type: McpJobType.GENERATE,
        tier: "TIER_1K",
        creditsCost: 2,
        status: JobStatus.PROCESSING,
      });

      // Make generateImageWithGemini throw, then make the subsequent update throw
      // to trigger the outer catch handler
      mockGeminiClient.generateImageWithGemini.mockRejectedValue(
        new Error("Generation failed"),
      );
      // Make the job update in the catch block throw an error
      mockMcpGenerationJob.update.mockRejectedValue(
        new Error("Database error during failure update"),
      );

      await createGenerationJob({
        userId: testUserId,
        prompt: "test",
        tier: "TIER_1K",
      });

      // Wait for background processing
      await vi.advanceTimersByTimeAsync(100);

      // Verify the outer catch handler logged the error via logger
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(`Generation job ${testJobId} failed`),
        expect.objectContaining({ error: expect.any(Error) }),
      );
    });

    it("should log error when modification job throws unexpected error", async () => {
      const inputBase64 = Buffer.from("original-image").toString("base64");

      mockMcpGenerationJob.count.mockResolvedValue(0);
      mockWorkspaceCreditManager.consumeCredits.mockResolvedValue({
        success: true,
      });
      mockMcpGenerationJob.create.mockResolvedValue({
        id: testJobId,
        userId: testUserId,
        type: McpJobType.MODIFY,
        tier: "TIER_1K",
        creditsCost: 2,
        status: JobStatus.PROCESSING,
      });

      // Make the first upload throw to trigger the outer catch
      mockUploadToR2.mockRejectedValue(new Error("R2 upload failed"));

      await createModificationJob({
        userId: testUserId,
        prompt: "test",
        tier: "TIER_1K",
        imageData: inputBase64,
        mimeType: "image/jpeg",
      });

      // Wait for background processing
      await vi.advanceTimersByTimeAsync(100);

      // Verify the outer catch handler logged the error via logger
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(`Modification job ${testJobId} failed`),
        expect.objectContaining({ error: expect.any(Error) }),
      );
    });
  });

  describe("getJob without userId", () => {
    it("should return job when userId is not provided", async () => {
      const mockJob = {
        id: testJobId,
        type: McpJobType.GENERATE,
        tier: "TIER_1K",
        creditsCost: 2,
        status: JobStatus.COMPLETED,
        prompt: "A beautiful sunset",
        outputImageUrl: "https://example.com/image.jpg",
        createdAt: mockDate,
      };

      mockMcpGenerationJob.findFirst.mockResolvedValue(mockJob);

      // Call getJob without userId
      const result = await getJob(testJobId);

      expect(result).toEqual(mockJob);
      // Verify where clause doesn't include userId
      expect(mockMcpGenerationJob.findFirst).toHaveBeenCalledWith({
        where: { id: testJobId },
        select: expect.any(Object),
      });
    });
  });

  describe("credit consumption edge cases", () => {
    it("should use default error message when consumeCredits returns no error", async () => {
      mockMcpGenerationJob.count.mockResolvedValue(0);
      mockWorkspaceCreditManager.consumeCredits.mockResolvedValue({
        success: false,
        // No error property
      });

      const result = await createGenerationJob({
        userId: testUserId,
        prompt: "A beautiful sunset",
        tier: "TIER_2K",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "Insufficient AI credits. Required: 5 credits",
      );
    });

    it("should use default error for modification when consumeCredits returns no error", async () => {
      mockMcpGenerationJob.count.mockResolvedValue(0);
      mockWorkspaceCreditManager.consumeCredits.mockResolvedValue({
        success: false,
        // No error property
      });

      const result = await createModificationJob({
        userId: testUserId,
        prompt: "Add a rainbow",
        tier: "TIER_4K",
        imageData: "base64imagedata",
        mimeType: "image/jpeg",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "Insufficient AI credits. Required: 10 credits",
      );
    });
  });

  describe("job creation without apiKeyId", () => {
    it("should create generation job with null apiKeyId when not provided", async () => {
      mockMcpGenerationJob.count.mockResolvedValue(0);
      mockWorkspaceCreditManager.consumeCredits.mockResolvedValue({
        success: true,
      });
      mockMcpGenerationJob.create.mockResolvedValue({
        id: testJobId,
        userId: testUserId,
        type: McpJobType.GENERATE,
        tier: "TIER_1K",
        creditsCost: 2,
        status: JobStatus.PROCESSING,
      });

      // Call without apiKeyId
      await createGenerationJob({
        userId: testUserId,
        prompt: "A beautiful sunset",
        tier: "TIER_1K",
      });

      expect(mockMcpGenerationJob.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          apiKeyId: null,
        }),
      });
    });

    it("should create modification job with null apiKeyId when not provided", async () => {
      mockMcpGenerationJob.count.mockResolvedValue(0);
      mockWorkspaceCreditManager.consumeCredits.mockResolvedValue({
        success: true,
      });
      mockMcpGenerationJob.create.mockResolvedValue({
        id: testJobId,
        userId: testUserId,
        type: McpJobType.MODIFY,
        tier: "TIER_1K",
        creditsCost: 2,
        status: JobStatus.PROCESSING,
      });

      // Call without apiKeyId
      await createModificationJob({
        userId: testUserId,
        prompt: "Add a rainbow",
        tier: "TIER_1K",
        imageData: "base64imagedata",
        mimeType: "image/jpeg",
      });

      expect(mockMcpGenerationJob.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          apiKeyId: null,
        }),
      });
    });
  });

  describe("classifyError", () => {
    it("should classify timeout errors", () => {
      const result = classifyError(new Error("Request timed out"));

      expect(result.code).toBe("TIMEOUT");
      expect(result.message).toContain("took too long");
    });

    it("should classify timeout errors with 'timeout' keyword", () => {
      const result = classifyError(new Error("Connection timeout after 60s"));

      expect(result.code).toBe("TIMEOUT");
    });

    it("should classify content policy errors", () => {
      const result = classifyError(new Error("Content blocked by policy"));

      expect(result.code).toBe("CONTENT_POLICY");
      expect(result.message).toContain("content policies");
    });

    it("should classify rate limit errors", () => {
      const result = classifyError(new Error("Rate limit exceeded"));

      expect(result.code).toBe("RATE_LIMITED");
      expect(result.message).toContain("temporarily unavailable");
    });

    it("should classify quota errors as rate limited", () => {
      const result = classifyError(new Error("Quota exceeded for the day"));

      expect(result.code).toBe("RATE_LIMITED");
    });

    it("should classify 429 errors as rate limited", () => {
      const result = classifyError(new Error("HTTP 429: Too Many Requests"));

      expect(result.code).toBe("RATE_LIMITED");
    });

    it("should classify auth errors", () => {
      const result = classifyError(new Error("API key invalid"));

      expect(result.code).toBe("AUTH_ERROR");
      expect(result.message).toContain("configuration error");
    });

    it("should classify 401 errors as auth errors", () => {
      const result = classifyError(new Error("HTTP 401 Unauthorized"));

      expect(result.code).toBe("AUTH_ERROR");
    });

    it("should classify invalid image errors", () => {
      const result = classifyError(new Error("Image is invalid or corrupt"));

      expect(result.code).toBe("INVALID_IMAGE");
      expect(result.message).toContain("different format");
    });

    it("should return original message for other errors", () => {
      const result = classifyError(new Error("Some unexpected error"));

      expect(result.code).toBe("GENERATION_ERROR");
      expect(result.message).toBe("Some unexpected error");
    });

    it("should handle non-Error objects", () => {
      const result = classifyError("string error");

      expect(result.code).toBe("UNKNOWN");
      expect(result.message).toContain("unexpected error");
    });

    it("should handle null", () => {
      const result = classifyError(null);

      expect(result.code).toBe("UNKNOWN");
    });

    it("should handle undefined", () => {
      const result = classifyError(undefined);

      expect(result.code).toBe("UNKNOWN");
    });
  });

  describe("cancelMcpJob", () => {
    it("should cancel a PENDING job and refund credits", async () => {
      mockMcpGenerationJob.findUnique.mockResolvedValue({
        id: testJobId,
        userId: testUserId,
        status: JobStatus.PENDING,
        creditsCost: 5,
      });
      mockMcpGenerationJob.update.mockResolvedValue({});
      mockWorkspaceCreditManager.refundCredits.mockResolvedValue({
        success: true,
      });

      const result = await cancelMcpJob(testJobId);

      expect(result.success).toBe(true);
      expect(result.creditsRefunded).toBe(5);
      expect(mockMcpGenerationJob.update).toHaveBeenCalledWith({
        where: { id: testJobId },
        data: expect.objectContaining({ status: JobStatus.CANCELLED }),
      });
      expect(mockWorkspaceCreditManager.refundCredits).toHaveBeenCalledWith(
        testUserId,
        5,
      );
    });

    it("should cancel a PROCESSING job", async () => {
      mockMcpGenerationJob.findUnique.mockResolvedValue({
        id: testJobId,
        userId: testUserId,
        status: JobStatus.PROCESSING,
        creditsCost: 10,
      });
      mockMcpGenerationJob.update.mockResolvedValue({});
      mockWorkspaceCreditManager.refundCredits.mockResolvedValue({
        success: true,
      });

      const result = await cancelMcpJob(testJobId);

      expect(result.success).toBe(true);
      expect(result.creditsRefunded).toBe(10);
      expect(mockMcpGenerationJob.update).toHaveBeenCalledWith({
        where: { id: testJobId },
        data: expect.objectContaining({ status: JobStatus.CANCELLED }),
      });
      expect(mockWorkspaceCreditManager.refundCredits).toHaveBeenCalledWith(
        testUserId,
        10,
      );
    });

    it("should return error for non-existent job", async () => {
      mockMcpGenerationJob.findUnique.mockResolvedValue(null);

      const result = await cancelMcpJob("nonexistent-job");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Job not found");
      expect(mockMcpGenerationJob.update).not.toHaveBeenCalled();
      expect(mockWorkspaceCreditManager.refundCredits).not.toHaveBeenCalled();
    });

    it("should return error for COMPLETED job", async () => {
      mockMcpGenerationJob.findUnique.mockResolvedValue({
        id: testJobId,
        userId: testUserId,
        status: JobStatus.COMPLETED,
        creditsCost: 5,
      });

      const result = await cancelMcpJob(testJobId);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot cancel job with status");
      expect(result.error).toContain("COMPLETED");
      expect(mockMcpGenerationJob.update).not.toHaveBeenCalled();
      expect(mockWorkspaceCreditManager.refundCredits).not.toHaveBeenCalled();
    });

    it("should return error for FAILED job", async () => {
      mockMcpGenerationJob.findUnique.mockResolvedValue({
        id: testJobId,
        userId: testUserId,
        status: JobStatus.FAILED,
        creditsCost: 5,
      });

      const result = await cancelMcpJob(testJobId);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot cancel job with status");
      expect(result.error).toContain("FAILED");
      expect(mockMcpGenerationJob.update).not.toHaveBeenCalled();
      expect(mockWorkspaceCreditManager.refundCredits).not.toHaveBeenCalled();
    });
  });

  describe("rerunMcpJob", () => {
    it("should rerun a GENERATE job", async () => {
      const newJobId = "new-job-123";
      mockMcpGenerationJob.findUnique.mockResolvedValue({
        id: testJobId,
        userId: testUserId,
        type: McpJobType.GENERATE,
        tier: "TIER_1K",
        creditsCost: 2,
        prompt: "A beautiful sunset",
        apiKeyId: testApiKeyId,
        inputImageUrl: null,
        inputImageR2Key: null,
        geminiModel: "gemini-3-pro-image-preview",
      });
      mockMcpGenerationJob.count.mockResolvedValue(0);
      mockWorkspaceCreditManager.consumeCredits.mockResolvedValue({
        success: true,
      });
      mockMcpGenerationJob.create.mockResolvedValue({
        id: newJobId,
        userId: testUserId,
        type: McpJobType.GENERATE,
        tier: "TIER_1K",
        creditsCost: 2,
        status: JobStatus.PROCESSING,
      });

      // Set up mocks for background processing
      const mockImageBuffer = Buffer.from("fake-rerun-image");
      mockGeminiClient.generateImageWithGemini.mockResolvedValue(
        mockImageBuffer,
      );
      mockUploadToR2.mockResolvedValue({
        url: "https://r2.example.com/rerun.jpg",
      });
      mockMcpGenerationJob.update.mockResolvedValue({});

      const result = await rerunMcpJob(testJobId);

      expect(result.success).toBe(true);
      expect(result.newJobId).toBe(newJobId);
      expect(mockWorkspaceCreditManager.consumeCredits).toHaveBeenCalledWith({
        userId: testUserId,
        amount: 2,
        source: "mcp_generation",
        sourceId: "pending",
      });

      // Wait for background processing to trigger
      await vi.advanceTimersByTimeAsync(100);

      expect(mockGeminiClient.generateImageWithGemini).toHaveBeenCalledWith({
        prompt: "A beautiful sunset",
        tier: "1K",
        negativePrompt: undefined,
        aspectRatio: undefined,
      });
    });

    it("should rerun a MODIFY job with input image", async () => {
      const newJobId = "new-modify-job-123";
      const originalInputUrl = "https://r2.example.com/original-input.jpg";
      mockMcpGenerationJob.findUnique.mockResolvedValue({
        id: testJobId,
        userId: testUserId,
        type: McpJobType.MODIFY,
        tier: "TIER_2K",
        creditsCost: 5,
        prompt: "Add a rainbow",
        apiKeyId: testApiKeyId,
        inputImageUrl: originalInputUrl,
        inputImageR2Key: "mcp-input/test-user/original.jpg",
        geminiModel: "gemini-3-pro-image-preview",
      });
      mockMcpGenerationJob.count.mockResolvedValue(0);
      mockWorkspaceCreditManager.consumeCredits.mockResolvedValue({
        success: true,
      });
      mockMcpGenerationJob.create.mockResolvedValue({
        id: newJobId,
        userId: testUserId,
        type: McpJobType.MODIFY,
        tier: "TIER_2K",
        creditsCost: 5,
        status: JobStatus.PROCESSING,
      });

      // Mock fetch for retrieving the original input image
      const originalImageData = Buffer.from("original-image-data");
      const mockResponse = new Response(originalImageData, {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      });
      const fetchSpy = vi
        .spyOn(global, "fetch")
        .mockResolvedValue(mockResponse);

      // Set up mocks for background modification processing
      const mockModifiedBuffer = Buffer.from("modified-image-data");
      mockUploadToR2
        .mockResolvedValueOnce({ url: "https://r2.example.com/input.jpg" })
        .mockResolvedValueOnce({ url: "https://r2.example.com/output.jpg" });
      mockGeminiClient.modifyImageWithGemini.mockResolvedValue(
        mockModifiedBuffer,
      );
      mockMcpGenerationJob.update.mockResolvedValue({});

      const result = await rerunMcpJob(testJobId);

      expect(result.success).toBe(true);
      expect(result.newJobId).toBe(newJobId);

      // Wait for background processing
      await vi.advanceTimersByTimeAsync(100);

      expect(fetchSpy).toHaveBeenCalledWith(originalInputUrl);

      fetchSpy.mockRestore();
    });

    it("should return error for non-existent job", async () => {
      mockMcpGenerationJob.findUnique.mockResolvedValue(null);

      const result = await rerunMcpJob("nonexistent-job");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Job not found");
      expect(mockMcpGenerationJob.create).not.toHaveBeenCalled();
    });

    it("should return error when concurrent limit reached", async () => {
      mockMcpGenerationJob.findUnique.mockResolvedValue({
        id: testJobId,
        userId: testUserId,
        type: McpJobType.GENERATE,
        tier: "TIER_1K",
        creditsCost: 2,
        prompt: "test",
      });
      mockMcpGenerationJob.count.mockResolvedValue(3);

      const result = await rerunMcpJob(testJobId);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Too many concurrent jobs");
      expect(mockWorkspaceCreditManager.consumeCredits).not.toHaveBeenCalled();
    });

    it("should return error when credits insufficient", async () => {
      mockMcpGenerationJob.findUnique.mockResolvedValue({
        id: testJobId,
        userId: testUserId,
        type: McpJobType.GENERATE,
        tier: "TIER_1K",
        creditsCost: 2,
        prompt: "test",
      });
      mockMcpGenerationJob.count.mockResolvedValue(0);
      mockWorkspaceCreditManager.consumeCredits.mockResolvedValue({
        success: false,
        error: "Not enough credits",
      });

      const result = await rerunMcpJob(testJobId);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not enough credits");
      expect(mockMcpGenerationJob.create).not.toHaveBeenCalled();
    });

    it("should use default error when consumeCredits returns no error string", async () => {
      mockMcpGenerationJob.findUnique.mockResolvedValue({
        id: testJobId,
        userId: testUserId,
        type: McpJobType.GENERATE,
        tier: "TIER_2K",
        creditsCost: 5,
        prompt: "test",
      });
      mockMcpGenerationJob.count.mockResolvedValue(0);
      mockWorkspaceCreditManager.consumeCredits.mockResolvedValue({
        success: false,
      });

      const result = await rerunMcpJob(testJobId);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "Insufficient AI credits. Required: 5 credits",
      );
    });
  });

  describe("rerunMcpJob - modification reruns", () => {
    it("should skip background processing when input image URL is null for MODIFY job", async () => {
      const newJobId = "new-modify-no-url";
      mockMcpGenerationJob.findUnique.mockResolvedValue({
        id: testJobId,
        userId: testUserId,
        type: McpJobType.MODIFY,
        tier: "TIER_1K",
        creditsCost: 2,
        prompt: "Add effect",
        apiKeyId: null,
        inputImageUrl: null,
        inputImageR2Key: null,
        geminiModel: "gemini-3-pro-image-preview",
      });
      mockMcpGenerationJob.count.mockResolvedValue(0);
      mockWorkspaceCreditManager.consumeCredits.mockResolvedValue({
        success: true,
      });
      mockMcpGenerationJob.create.mockResolvedValue({
        id: newJobId,
        userId: testUserId,
        type: McpJobType.MODIFY,
        tier: "TIER_1K",
        creditsCost: 2,
        status: JobStatus.PROCESSING,
      });

      const result = await rerunMcpJob(testJobId);

      expect(result.success).toBe(true);
      expect(result.newJobId).toBe(newJobId);

      // Wait to confirm no background processing is triggered
      await vi.advanceTimersByTimeAsync(100);

      // Neither generation nor modification processing should have been called
      // because inputImageUrl is null and the else-if branch is skipped
      expect(mockGeminiClient.generateImageWithGemini).not.toHaveBeenCalled();
      expect(mockGeminiClient.modifyImageWithGemini).not.toHaveBeenCalled();
    });

    it("should handle fetch failure for input image", async () => {
      const newJobId = "new-modify-fetch-fail";
      const inputUrl = "https://r2.example.com/input.jpg";
      mockMcpGenerationJob.findUnique
        .mockResolvedValueOnce({
          id: testJobId,
          userId: testUserId,
          type: McpJobType.MODIFY,
          tier: "TIER_1K",
          creditsCost: 2,
          prompt: "Add effect",
          apiKeyId: null,
          inputImageUrl: inputUrl,
          inputImageR2Key: "mcp-input/key.jpg",
          geminiModel: "gemini-3-pro-image-preview",
        })
        // For handleGenerationJobFailure's findUnique call
        .mockResolvedValueOnce({
          id: newJobId,
          userId: testUserId,
          creditsCost: 2,
        });
      mockMcpGenerationJob.count.mockResolvedValue(0);
      mockWorkspaceCreditManager.consumeCredits.mockResolvedValue({
        success: true,
      });
      mockMcpGenerationJob.create.mockResolvedValue({
        id: newJobId,
        userId: testUserId,
        type: McpJobType.MODIFY,
        tier: "TIER_1K",
        creditsCost: 2,
        status: JobStatus.PROCESSING,
      });
      mockMcpGenerationJob.update.mockResolvedValue({});
      mockWorkspaceCreditManager.refundCredits.mockResolvedValue({
        success: true,
      });

      // Mock fetch to return a non-ok response
      const fetchSpy = vi
        .spyOn(global, "fetch")
        .mockResolvedValue(new Response(null, { status: 404 }));

      const result = await rerunMcpJob(testJobId);

      expect(result.success).toBe(true);
      expect(result.newJobId).toBe(newJobId);

      // Wait for background processing using waitFor to handle async microtasks
      await vi.waitFor(
        () => {
          expect(mockMcpGenerationJob.update).toHaveBeenCalledWith({
            where: { id: newJobId },
            data: expect.objectContaining({
              status: JobStatus.FAILED,
            }),
          });
        },
        { timeout: 1000 },
      );

      fetchSpy.mockRestore();
    });

    it("should handle fetch network error", async () => {
      const newJobId = "new-modify-network-error";
      const inputUrl = "https://r2.example.com/input.jpg";
      mockMcpGenerationJob.findUnique
        .mockResolvedValueOnce({
          id: testJobId,
          userId: testUserId,
          type: McpJobType.MODIFY,
          tier: "TIER_1K",
          creditsCost: 2,
          prompt: "Add effect",
          apiKeyId: null,
          inputImageUrl: inputUrl,
          inputImageR2Key: "mcp-input/key.jpg",
          geminiModel: "gemini-3-pro-image-preview",
        })
        // For handleGenerationJobFailure's findUnique call
        .mockResolvedValueOnce({
          id: newJobId,
          userId: testUserId,
          creditsCost: 2,
        });
      mockMcpGenerationJob.count.mockResolvedValue(0);
      mockWorkspaceCreditManager.consumeCredits.mockResolvedValue({
        success: true,
      });
      mockMcpGenerationJob.create.mockResolvedValue({
        id: newJobId,
        userId: testUserId,
        type: McpJobType.MODIFY,
        tier: "TIER_1K",
        creditsCost: 2,
        status: JobStatus.PROCESSING,
      });
      mockMcpGenerationJob.update.mockResolvedValue({});
      mockWorkspaceCreditManager.refundCredits.mockResolvedValue({
        success: true,
      });

      // Mock fetch to throw a network error
      const fetchSpy = vi
        .spyOn(global, "fetch")
        .mockRejectedValue(new Error("Network error"));

      const result = await rerunMcpJob(testJobId);

      expect(result.success).toBe(true);
      expect(result.newJobId).toBe(newJobId);

      // Wait for background processing using waitFor to handle async microtasks
      await vi.waitFor(
        () => {
          expect(mockMcpGenerationJob.update).toHaveBeenCalledWith({
            where: { id: newJobId },
            data: expect.objectContaining({
              status: JobStatus.FAILED,
            }),
          });
        },
        { timeout: 1000 },
      );

      fetchSpy.mockRestore();
    });

    it("should log outer catch error when fetchAndProcessModification throws unexpectedly", async () => {
      const newJobId = "new-modify-unexpected-throw";
      const inputUrl = "https://r2.example.com/input.jpg";
      mockMcpGenerationJob.findUnique.mockResolvedValue({
        id: testJobId,
        userId: testUserId,
        type: McpJobType.MODIFY,
        tier: "TIER_1K",
        creditsCost: 2,
        prompt: "Add effect",
        apiKeyId: null,
        inputImageUrl: inputUrl,
        inputImageR2Key: "mcp-input/key.jpg",
        geminiModel: "gemini-3-pro-image-preview",
      });
      mockMcpGenerationJob.count.mockResolvedValue(0);
      mockWorkspaceCreditManager.consumeCredits.mockResolvedValue({
        success: true,
      });
      mockMcpGenerationJob.create.mockResolvedValue({
        id: newJobId,
        userId: testUserId,
        type: McpJobType.MODIFY,
        tier: "TIER_1K",
        creditsCost: 2,
        status: JobStatus.PROCESSING,
      });

      // Mock fetch to return a response where arrayBuffer() throws,
      // which will cause fetchAndProcessModification to throw past the tryCatch
      const mockResponse = {
        ok: true,
        arrayBuffer: vi.fn().mockRejectedValue(new Error("arrayBuffer failed")),
        headers: new Headers({ "content-type": "image/jpeg" }),
      };
      const fetchSpy = vi
        .spyOn(global, "fetch")
        .mockResolvedValue(mockResponse as unknown as Response);

      const result = await rerunMcpJob(testJobId);

      expect(result.success).toBe(true);
      expect(result.newJobId).toBe(newJobId);

      // Wait for the outer catch handler to fire
      await vi.waitFor(
        () => {
          expect(mockLogger.error).toHaveBeenCalledWith(
            expect.stringContaining(
              `Rerun modification job ${newJobId} failed`,
            ),
            expect.objectContaining({ error: expect.any(Error) }),
          );
        },
        { timeout: 1000 },
      );

      fetchSpy.mockRestore();
    });

    it("should use mimeType fallback to image/jpeg when content-type header is missing", async () => {
      const newJobId = "new-modify-no-content-type";
      const inputUrl = "https://r2.example.com/input.jpg";
      mockMcpGenerationJob.findUnique.mockResolvedValue({
        id: testJobId,
        userId: testUserId,
        type: McpJobType.MODIFY,
        tier: "TIER_1K",
        creditsCost: 2,
        prompt: "Add effect",
        apiKeyId: null,
        inputImageUrl: inputUrl,
        inputImageR2Key: "mcp-input/key.jpg",
        geminiModel: "gemini-3-pro-image-preview",
      });
      mockMcpGenerationJob.count.mockResolvedValue(0);
      mockWorkspaceCreditManager.consumeCredits.mockResolvedValue({
        success: true,
      });
      mockMcpGenerationJob.create.mockResolvedValue({
        id: newJobId,
        userId: testUserId,
        type: McpJobType.MODIFY,
        tier: "TIER_1K",
        creditsCost: 2,
        status: JobStatus.PROCESSING,
      });

      // Mock fetch to return a response with NO content-type header
      const originalImageData = Buffer.from("original-image-data");
      const mockResponse = new Response(originalImageData, {
        status: 200,
        // No content-type header set
      });
      // Remove the content-type header that Response auto-sets
      mockResponse.headers.delete("content-type");
      const fetchSpy = vi
        .spyOn(global, "fetch")
        .mockResolvedValue(mockResponse);

      // Set up mocks for the modification processing pipeline
      const mockModifiedBuffer = Buffer.from("modified-image-data");
      mockUploadToR2
        .mockResolvedValueOnce({ url: "https://r2.example.com/input.jpg" })
        .mockResolvedValueOnce({ url: "https://r2.example.com/output.jpg" });
      mockGeminiClient.modifyImageWithGemini.mockResolvedValue(
        mockModifiedBuffer,
      );
      mockMcpGenerationJob.update.mockResolvedValue({});

      const result = await rerunMcpJob(testJobId);

      expect(result.success).toBe(true);
      expect(result.newJobId).toBe(newJobId);

      // Wait for background processing to complete
      await vi.waitFor(
        () => {
          expect(mockGeminiClient.modifyImageWithGemini).toHaveBeenCalled();
        },
        { timeout: 1000 },
      );

      // Verify the mimeType fallback to "image/jpeg" was used
      expect(mockGeminiClient.modifyImageWithGemini).toHaveBeenCalledWith(
        expect.objectContaining({
          mimeType: "image/jpeg",
        }),
      );

      fetchSpy.mockRestore();
    });

    it("should log outer catch when rerun GENERATE processGenerationJob throws", async () => {
      const newJobId = "new-gen-outer-catch";
      // First findUnique call is from rerunMcpJob itself (L650)
      mockMcpGenerationJob.findUnique
        .mockResolvedValueOnce({
          id: testJobId,
          userId: testUserId,
          type: McpJobType.GENERATE,
          tier: "TIER_1K",
          creditsCost: 2,
          prompt: "A sunset",
          apiKeyId: null,
          inputImageUrl: null,
          inputImageR2Key: null,
          geminiModel: "gemini-3-pro-image-preview",
        })
        // Second findUnique call is from handleGenerationJobFailure (L326)
        // Return a job so we enter the refund block
        .mockResolvedValueOnce({
          id: newJobId,
          userId: testUserId,
          creditsCost: 2,
        });
      mockMcpGenerationJob.count.mockResolvedValue(0);
      mockWorkspaceCreditManager.consumeCredits.mockResolvedValue({
        success: true,
      });
      mockMcpGenerationJob.create.mockResolvedValue({
        id: newJobId,
        userId: testUserId,
        type: McpJobType.GENERATE,
        tier: "TIER_1K",
        creditsCost: 2,
        status: JobStatus.PROCESSING,
      });

      // Make generation fail to trigger handleGenerationJobFailure
      mockGeminiClient.generateImageWithGemini.mockRejectedValue(
        new Error("Generation API error"),
      );
      mockMcpGenerationJob.update.mockResolvedValue({});
      // Make refundCredits throw — this is NOT wrapped in tryCatch in
      // handleGenerationJobFailure (L333), so the error propagates to
      // the outer .catch() at L707-709
      mockWorkspaceCreditManager.refundCredits.mockRejectedValue(
        new Error("Credit service down"),
      );

      const result = await rerunMcpJob(testJobId);

      expect(result.success).toBe(true);
      expect(result.newJobId).toBe(newJobId);

      // Wait for the outer catch to fire
      await vi.waitFor(
        () => {
          expect(mockLogger.error).toHaveBeenCalledWith(
            expect.stringContaining(`Rerun generation job ${newJobId} failed`),
            expect.objectContaining({ error: expect.any(Error) }),
          );
        },
        { timeout: 1000 },
      );
    });

    it("should log outer catch when processModificationJob throws inside fetchAndProcessModification", async () => {
      const newJobId = "new-modify-inner-throw";
      const inputUrl = "https://r2.example.com/input.jpg";
      // First findUnique is from rerunMcpJob (L650)
      mockMcpGenerationJob.findUnique
        .mockResolvedValueOnce({
          id: testJobId,
          userId: testUserId,
          type: McpJobType.MODIFY,
          tier: "TIER_1K",
          creditsCost: 2,
          prompt: "Add effect",
          apiKeyId: null,
          inputImageUrl: inputUrl,
          inputImageR2Key: "mcp-input/key.jpg",
          geminiModel: "gemini-3-pro-image-preview",
        })
        // Second findUnique is from handleModificationJobFailure (L490)
        // Return a job so we enter the refund block
        .mockResolvedValueOnce({
          id: newJobId,
          userId: testUserId,
          creditsCost: 2,
        });
      mockMcpGenerationJob.count.mockResolvedValue(0);
      mockWorkspaceCreditManager.consumeCredits.mockResolvedValue({
        success: true,
      });
      mockMcpGenerationJob.create.mockResolvedValue({
        id: newJobId,
        userId: testUserId,
        type: McpJobType.MODIFY,
        tier: "TIER_1K",
        creditsCost: 2,
        status: JobStatus.PROCESSING,
      });

      // Mock fetch to return a valid response so we get past the fetch step
      const originalImageData = Buffer.from("original-image-data");
      const mockFetchResponse = new Response(originalImageData, {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      });
      const fetchSpy = vi
        .spyOn(global, "fetch")
        .mockResolvedValue(mockFetchResponse);

      // Make input upload fail in processModificationJob to trigger
      // handleModificationJobFailure
      mockUploadToR2.mockRejectedValue(new Error("R2 completely down"));
      mockMcpGenerationJob.update.mockResolvedValue({});
      // Make refundCredits throw — this is NOT wrapped in tryCatch in
      // handleModificationJobFailure (L497), so the error propagates to
      // processModificationJob, then to the outer .catch() at L763-765
      mockWorkspaceCreditManager.refundCredits.mockRejectedValue(
        new Error("Credit service down"),
      );

      const result = await rerunMcpJob(testJobId);

      expect(result.success).toBe(true);
      expect(result.newJobId).toBe(newJobId);

      // Wait for the outer catch to fire
      await vi.waitFor(
        () => {
          expect(mockLogger.error).toHaveBeenCalledWith(
            expect.stringContaining(
              `Rerun modification job ${newJobId} failed`,
            ),
            expect.objectContaining({ error: expect.any(Error) }),
          );
        },
        { timeout: 1000 },
      );

      fetchSpy.mockRestore();
    });

    it("should call handleGenerationJobFailure when inputImageUrl is null in fetchAndProcessModification", async () => {
      // This test covers the defensive null guard at L732-737.
      // We use a getter that returns truthy for the first two accesses
      // (L694 in create data, L710 condition check) and null for the third
      // (L732 inside fetchAndProcessModification).
      const newJobId = "new-modify-null-guard";
      let inputImageUrlCallCount = 0;
      const jobWithDynamicUrl = {
        id: testJobId,
        userId: testUserId,
        type: McpJobType.MODIFY,
        tier: "TIER_1K",
        creditsCost: 2,
        prompt: "Add effect",
        apiKeyId: null,
        get inputImageUrl(): string | null {
          inputImageUrlCallCount++;
          // Accesses 1-2 (L694 create data + L710 condition) return truthy
          // Access 3 (L732 null guard inside fetchAndProcessModification) returns null
          return inputImageUrlCallCount <= 2
            ? "https://r2.example.com/input.jpg"
            : null;
        },
        inputImageR2Key: "mcp-input/key.jpg",
        geminiModel: "gemini-3-pro-image-preview",
      };

      // Reset findUnique to clear any leftover mockResolvedValueOnce queue
      // from previous tests (vi.clearAllMocks doesn't clear implementations)
      mockMcpGenerationJob.findUnique.mockReset();
      mockMcpGenerationJob.findUnique
        .mockResolvedValueOnce(jobWithDynamicUrl)
        // For handleGenerationJobFailure's findUnique call
        .mockResolvedValueOnce({
          id: newJobId,
          userId: testUserId,
          creditsCost: 2,
        });
      mockMcpGenerationJob.count.mockResolvedValue(0);
      mockWorkspaceCreditManager.consumeCredits.mockResolvedValue({
        success: true,
      });
      mockMcpGenerationJob.create.mockResolvedValue({
        id: newJobId,
        userId: testUserId,
        type: McpJobType.MODIFY,
        tier: "TIER_1K",
        creditsCost: 2,
        status: JobStatus.PROCESSING,
      });
      mockMcpGenerationJob.update.mockResolvedValue({});
      mockWorkspaceCreditManager.refundCredits.mockResolvedValue({
        success: true,
      });

      const result = await rerunMcpJob(testJobId);

      expect(result.success).toBe(true);
      expect(result.newJobId).toBe(newJobId);

      // Wait for the null guard to trigger handleGenerationJobFailure
      // and the full refund flow to complete
      await vi.waitFor(
        () => {
          expect(mockMcpGenerationJob.update).toHaveBeenCalledWith({
            where: { id: newJobId },
            data: expect.objectContaining({
              status: JobStatus.FAILED,
              errorMessage: expect.stringContaining(
                "No input image URL available",
              ),
            }),
          });
          // Verify credits were refunded (inside waitFor to handle async timing)
          expect(
            mockWorkspaceCreditManager.refundCredits,
          ).toHaveBeenCalledWith(testUserId, 2);
        },
        { timeout: 1000 },
      );
    });

    it("should process successful modification rerun flow end-to-end", async () => {
      const newJobId = "new-modify-success-flow";
      const inputUrl = "https://r2.example.com/original-input.jpg";
      mockMcpGenerationJob.findUnique.mockResolvedValue({
        id: testJobId,
        userId: testUserId,
        type: McpJobType.MODIFY,
        tier: "TIER_2K",
        creditsCost: 5,
        prompt: "Add a rainbow",
        apiKeyId: testApiKeyId,
        inputImageUrl: inputUrl,
        inputImageR2Key: "mcp-input/test-user/original.jpg",
        geminiModel: "gemini-3-pro-image-preview",
      });
      mockMcpGenerationJob.count.mockResolvedValue(0);
      mockWorkspaceCreditManager.consumeCredits.mockResolvedValue({
        success: true,
      });
      mockMcpGenerationJob.create.mockResolvedValue({
        id: newJobId,
        userId: testUserId,
        type: McpJobType.MODIFY,
        tier: "TIER_2K",
        creditsCost: 5,
        status: JobStatus.PROCESSING,
      });

      // Mock fetch to return original image data
      const originalImageData = Buffer.from("original-image-data");
      const mockFetchResponse = new Response(originalImageData, {
        status: 200,
        headers: { "content-type": "image/png" },
      });
      const fetchSpy = vi
        .spyOn(global, "fetch")
        .mockResolvedValue(mockFetchResponse);

      // Set up mocks for the full modification pipeline
      const mockModifiedBuffer = Buffer.from("modified-image-data");
      mockUploadToR2
        .mockResolvedValueOnce({ url: "https://r2.example.com/new-input.jpg" })
        .mockResolvedValueOnce({
          url: "https://r2.example.com/new-output.jpg",
        });
      mockGeminiClient.modifyImageWithGemini.mockResolvedValue(
        mockModifiedBuffer,
      );
      mockMcpGenerationJob.update.mockResolvedValue({});

      const result = await rerunMcpJob(testJobId);

      expect(result.success).toBe(true);
      expect(result.newJobId).toBe(newJobId);

      // Wait for full background processing
      await vi.waitFor(
        () => {
          expect(mockMcpGenerationJob.update).toHaveBeenCalledWith({
            where: { id: newJobId },
            data: expect.objectContaining({
              status: JobStatus.COMPLETED,
            }),
          });
        },
        { timeout: 1000 },
      );

      // Verify processModificationJob was called via modifyImageWithGemini
      expect(mockGeminiClient.modifyImageWithGemini).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: "Add a rainbow",
          tier: "2K",
          mimeType: "image/png",
        }),
      );

      fetchSpy.mockRestore();
    });
  });
});
