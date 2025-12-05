import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// Mocks
const mockSession = { user: { id: "user-123" } };
vi.mock("@/auth", () => ({
  auth: vi.fn(() => Promise.resolve(mockSession)),
}));

vi.mock("@/lib/tokens/balance-manager", () => ({
  TokenBalanceManager: {
    hasEnoughTokens: vi.fn().mockResolvedValue(true),
    consumeTokens: vi.fn().mockResolvedValue({ success: true, balance: 100 }),
    refundTokens: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("@/lib/ai/gemini-client", () => ({
  enhanceImageWithGemini: vi.fn().mockResolvedValue(Buffer.from("enhanced-image")),
}));

vi.mock("@/lib/storage/r2-client", () => ({
  downloadFromR2: vi.fn().mockResolvedValue(Buffer.from("original-image")),
  uploadToR2: vi.fn().mockResolvedValue({ success: true, url: "https://r2.com/enhanced.jpg" }),
}));

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ isLimited: false }),
  rateLimitConfigs: { imageEnhancement: {} },
}));

const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      enhancedImage: {
        findUnique: vi.fn(),
      },
      imageEnhancementJob: {
        create: vi.fn(),
        update: vi.fn(),
        findUnique: vi.fn(),
      },
    },
  };
});

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

// Mock Sharp
const mockSharpInstance = {
  metadata: vi.fn().mockResolvedValue({ width: 100, height: 100, format: "jpeg" }),
  resize: vi.fn().mockReturnThis(),
  extract: vi.fn().mockReturnThis(),
  jpeg: vi.fn().mockReturnThis(),
  toBuffer: vi.fn().mockResolvedValue(Buffer.from("processed-image")),
};
vi.mock("sharp", () => ({
  default: vi.fn(() => mockSharpInstance),
}));

describe("POST /api/images/enhance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(await import("@/auth")).auth.mockResolvedValueOnce(null);

    const req = new NextRequest("http://localhost/api/images/enhance", {
      method: "POST",
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should process enhancement successfully", async () => {
    // Setup mocks
    mockPrisma.enhancedImage.findUnique.mockResolvedValue({
      id: "img-1",
      userId: "user-123",
      originalR2Key: "originals/img-1.jpg",
    });

    mockPrisma.imageEnhancementJob.create.mockResolvedValue({
      id: "job-1",
    });

    const req = new NextRequest("http://localhost/api/images/enhance", {
      method: "POST",
      body: JSON.stringify({ imageId: "img-1", tier: "TIER_4K" }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.jobId).toBe("job-1");

    // Verify job creation
    expect(mockPrisma.imageEnhancementJob.create).toHaveBeenCalled();

    // Wait for async processing (since it's fire-and-forget in the route)
    // In a real test we might need to wait or mock the promise to be awaited
    // But since we mocked processEnhancement's dependencies, we can check if they were called
    // However, processEnhancement is called without await in the route.
    // To verify it ran, we can check if downloadFromR2 was called eventually.

    // Note: Since processEnhancement is not awaited in the route, we might need to wait a tick
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(mockPrisma.imageEnhancementJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "job-1" },
        data: expect.objectContaining({ status: "COMPLETED" }),
      }),
    );
  });

  it("should handle aspect ratio preservation logic", async () => {
    // Setup for landscape image
    mockSharpInstance.metadata.mockResolvedValueOnce({ width: 200, height: 100, format: "jpeg" }); // 2:1 aspect ratio

    mockPrisma.enhancedImage.findUnique.mockResolvedValue({
      id: "img-1",
      userId: "user-123",
      originalR2Key: "originals/img-1.jpg",
    });
    mockPrisma.imageEnhancementJob.create.mockResolvedValue({ id: "job-1" });

    const req = new NextRequest("http://localhost/api/images/enhance", {
      method: "POST",
      body: JSON.stringify({ imageId: "img-1", tier: "TIER_4K" }),
    });

    await POST(req);
    await new Promise(resolve => setTimeout(resolve, 10));

    // Verify padding to square
    // 200x100 -> max dimension 200 -> resize(200, 200)
    expect(mockSharpInstance.resize).toHaveBeenCalledWith(
      200,
      200,
      expect.objectContaining({ fit: "contain" }),
    );
  });

  it("should generate unique R2 keys for different enhancement jobs", async () => {
    const { uploadToR2 } = await import("@/lib/storage/r2-client");

    // First enhancement job
    mockPrisma.enhancedImage.findUnique.mockResolvedValue({
      id: "img-1",
      userId: "user-123",
      originalR2Key: "users/user-123/originals/img-1.jpg",
    });
    mockPrisma.imageEnhancementJob.create.mockResolvedValue({ id: "job-1" });

    const req1 = new NextRequest("http://localhost/api/images/enhance", {
      method: "POST",
      body: JSON.stringify({ imageId: "img-1", tier: "TIER_1K" }),
    });

    await POST(req1);
    await new Promise(resolve => setTimeout(resolve, 10));

    // Capture first upload call
    const firstUploadCall = vi.mocked(uploadToR2).mock.calls[0][0];

    // Second enhancement job (same image, different job)
    mockPrisma.imageEnhancementJob.create.mockResolvedValue({ id: "job-2" });

    const req2 = new NextRequest("http://localhost/api/images/enhance", {
      method: "POST",
      body: JSON.stringify({ imageId: "img-1", tier: "TIER_2K" }),
    });

    await POST(req2);
    await new Promise(resolve => setTimeout(resolve, 10));

    // Capture second upload call
    const secondUploadCall = vi.mocked(uploadToR2).mock.calls[1][0];

    // Verify both uploads have different R2 keys
    expect(firstUploadCall.key).toBe("users/user-123/enhanced/img-1/job-1.jpg");
    expect(secondUploadCall.key).toBe("users/user-123/enhanced/img-1/job-2.jpg");

    // Verify keys are different (no overwriting)
    expect(firstUploadCall.key).not.toBe(secondUploadCall.key);

    // Verify metadata includes jobId
    expect(firstUploadCall.metadata?.jobId).toBe("job-1");
    expect(secondUploadCall.metadata?.jobId).toBe("job-2");
  });

  it("should include jobId in R2 key for enhancement at different tiers", async () => {
    const { uploadToR2 } = await import("@/lib/storage/r2-client");

    mockPrisma.enhancedImage.findUnique.mockResolvedValue({
      id: "img-1",
      userId: "user-123",
      originalR2Key: "users/user-123/originals/img-1.png",
    });
    mockPrisma.imageEnhancementJob.create.mockResolvedValue({ id: "job-abc-123" });

    const req = new NextRequest("http://localhost/api/images/enhance", {
      method: "POST",
      body: JSON.stringify({ imageId: "img-1", tier: "TIER_4K" }),
    });

    await POST(req);
    await new Promise(resolve => setTimeout(resolve, 10));

    // Verify R2 key includes jobId and replaces original extension with .jpg
    expect(vi.mocked(uploadToR2)).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "users/user-123/enhanced/img-1/job-abc-123.jpg",
        metadata: expect.objectContaining({
          tier: "TIER_4K",
          jobId: "job-abc-123",
        }),
      }),
    );
  });
});
