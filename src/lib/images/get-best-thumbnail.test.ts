import type { EnhancedImage, ImageEnhancementJob } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { getBestEnhancement, getBestThumbnail, type ImageWithJobs } from "./get-best-thumbnail";

/**
 * Mock image factory
 */
function createMockImage(
  overrides: Partial<EnhancedImage> = {},
): EnhancedImage {
  return {
    id: "image-1",
    userId: "user-1",
    name: "Test Image",
    description: null,
    originalUrl: "https://example.com/original.jpg",
    originalR2Key: "original-key",
    originalWidth: 1920,
    originalHeight: 1080,
    originalSizeBytes: 1024000,
    originalFormat: "jpeg",
    isPublic: false,
    viewCount: 0,
    shareToken: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Mock enhancement job factory
 */
function createMockJob(
  overrides: Partial<ImageEnhancementJob> = {},
): ImageEnhancementJob {
  return {
    id: "job-1",
    imageId: "image-1",
    userId: "user-1",
    tier: "TIER_1K",
    tokensCost: 2,
    status: "COMPLETED",
    enhancedUrl: "https://example.com/enhanced-1k.jpg",
    enhancedR2Key: "enhanced-1k-key",
    enhancedWidth: 1920,
    enhancedHeight: 1080,
    enhancedSizeBytes: 2048000,
    errorMessage: null,
    retryCount: 0,
    maxRetries: 3,
    geminiPrompt: null,
    geminiModel: null,
    geminiTemp: null,
    processingStartedAt: new Date(),
    processingCompletedAt: new Date(),
    workflowRunId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("getBestThumbnail", () => {
  it("should return original URL when preferEnhanced is false", () => {
    const image: ImageWithJobs = {
      ...createMockImage(),
      enhancementJobs: [
        createMockJob({ tier: "TIER_4K", enhancedUrl: "https://example.com/enhanced-4k.jpg" }),
      ],
    };

    const result = getBestThumbnail(image, false);
    expect(result).toBe("https://example.com/original.jpg");
  });

  it("should return original URL when preferEnhanced is true but no jobs exist", () => {
    const image: ImageWithJobs = {
      ...createMockImage(),
      enhancementJobs: [],
    };

    const result = getBestThumbnail(image, true);
    expect(result).toBe("https://example.com/original.jpg");
  });

  it("should return original URL when preferEnhanced is true but no jobs are completed", () => {
    const image: ImageWithJobs = {
      ...createMockImage(),
      enhancementJobs: [
        createMockJob({ status: "PENDING", enhancedUrl: null }),
        createMockJob({ status: "PROCESSING", enhancedUrl: null }),
        createMockJob({ status: "FAILED", enhancedUrl: null }),
      ],
    };

    const result = getBestThumbnail(image, true);
    expect(result).toBe("https://example.com/original.jpg");
  });

  it("should return TIER_1K enhanced URL when it's the only completed job", () => {
    const image: ImageWithJobs = {
      ...createMockImage(),
      enhancementJobs: [
        createMockJob({
          tier: "TIER_1K",
          status: "COMPLETED",
          enhancedUrl: "https://example.com/enhanced-1k.jpg",
        }),
      ],
    };

    const result = getBestThumbnail(image, true);
    expect(result).toBe("https://example.com/enhanced-1k.jpg");
  });

  it("should return TIER_2K enhanced URL when it's the best completed job", () => {
    const image: ImageWithJobs = {
      ...createMockImage(),
      enhancementJobs: [
        createMockJob({
          tier: "TIER_1K",
          status: "COMPLETED",
          enhancedUrl: "https://example.com/enhanced-1k.jpg",
        }),
        createMockJob({
          tier: "TIER_2K",
          status: "COMPLETED",
          enhancedUrl: "https://example.com/enhanced-2k.jpg",
        }),
      ],
    };

    const result = getBestThumbnail(image, true);
    expect(result).toBe("https://example.com/enhanced-2k.jpg");
  });

  it("should return TIER_4K enhanced URL when it's the best completed job", () => {
    const image: ImageWithJobs = {
      ...createMockImage(),
      enhancementJobs: [
        createMockJob({
          tier: "TIER_1K",
          status: "COMPLETED",
          enhancedUrl: "https://example.com/enhanced-1k.jpg",
        }),
        createMockJob({
          tier: "TIER_2K",
          status: "COMPLETED",
          enhancedUrl: "https://example.com/enhanced-2k.jpg",
        }),
        createMockJob({
          tier: "TIER_4K",
          status: "COMPLETED",
          enhancedUrl: "https://example.com/enhanced-4k.jpg",
        }),
      ],
    };

    const result = getBestThumbnail(image, true);
    expect(result).toBe("https://example.com/enhanced-4k.jpg");
  });

  it("should ignore non-completed jobs when selecting best enhancement", () => {
    const image: ImageWithJobs = {
      ...createMockImage(),
      enhancementJobs: [
        createMockJob({
          tier: "TIER_1K",
          status: "COMPLETED",
          enhancedUrl: "https://example.com/enhanced-1k.jpg",
        }),
        createMockJob({
          tier: "TIER_4K",
          status: "PROCESSING",
          enhancedUrl: null,
        }),
      ],
    };

    const result = getBestThumbnail(image, true);
    expect(result).toBe("https://example.com/enhanced-1k.jpg");
  });

  it("should ignore jobs with null enhancedUrl", () => {
    const image: ImageWithJobs = {
      ...createMockImage(),
      enhancementJobs: [
        createMockJob({
          tier: "TIER_2K",
          status: "COMPLETED",
          enhancedUrl: null,
        }),
        createMockJob({
          tier: "TIER_1K",
          status: "COMPLETED",
          enhancedUrl: "https://example.com/enhanced-1k.jpg",
        }),
      ],
    };

    const result = getBestThumbnail(image, true);
    expect(result).toBe("https://example.com/enhanced-1k.jpg");
  });
});

describe("getBestEnhancement", () => {
  it("should return null when no jobs exist", () => {
    const result = getBestEnhancement([]);
    expect(result).toBeNull();
  });

  it("should return null when no jobs are completed", () => {
    const jobs = [
      createMockJob({ status: "PENDING", enhancedUrl: null }),
      createMockJob({ status: "PROCESSING", enhancedUrl: null }),
      createMockJob({ status: "FAILED", enhancedUrl: null }),
    ];

    const result = getBestEnhancement(jobs);
    expect(result).toBeNull();
  });

  it("should return null when completed jobs have null enhancedUrl", () => {
    const jobs = [
      createMockJob({ status: "COMPLETED", enhancedUrl: null }),
    ];

    const result = getBestEnhancement(jobs);
    expect(result).toBeNull();
  });

  it("should return TIER_1K job when it's the only completed job", () => {
    const tier1kJob = createMockJob({
      tier: "TIER_1K",
      status: "COMPLETED",
      enhancedUrl: "https://example.com/enhanced-1k.jpg",
    });

    const result = getBestEnhancement([tier1kJob]);
    expect(result).toEqual(tier1kJob);
  });

  it("should return TIER_2K job when competing with TIER_1K", () => {
    const tier1kJob = createMockJob({
      tier: "TIER_1K",
      status: "COMPLETED",
      enhancedUrl: "https://example.com/enhanced-1k.jpg",
    });
    const tier2kJob = createMockJob({
      tier: "TIER_2K",
      status: "COMPLETED",
      enhancedUrl: "https://example.com/enhanced-2k.jpg",
    });

    const result = getBestEnhancement([tier1kJob, tier2kJob]);
    expect(result).toEqual(tier2kJob);
  });

  it("should return TIER_4K job when competing with all tiers", () => {
    const tier1kJob = createMockJob({
      tier: "TIER_1K",
      status: "COMPLETED",
      enhancedUrl: "https://example.com/enhanced-1k.jpg",
    });
    const tier2kJob = createMockJob({
      tier: "TIER_2K",
      status: "COMPLETED",
      enhancedUrl: "https://example.com/enhanced-2k.jpg",
    });
    const tier4kJob = createMockJob({
      tier: "TIER_4K",
      status: "COMPLETED",
      enhancedUrl: "https://example.com/enhanced-4k.jpg",
    });

    const result = getBestEnhancement([tier1kJob, tier2kJob, tier4kJob]);
    expect(result).toEqual(tier4kJob);
  });

  it("should handle jobs in random order", () => {
    const tier4kJob = createMockJob({
      tier: "TIER_4K",
      status: "COMPLETED",
      enhancedUrl: "https://example.com/enhanced-4k.jpg",
    });
    const tier1kJob = createMockJob({
      tier: "TIER_1K",
      status: "COMPLETED",
      enhancedUrl: "https://example.com/enhanced-1k.jpg",
    });
    const tier2kJob = createMockJob({
      tier: "TIER_2K",
      status: "COMPLETED",
      enhancedUrl: "https://example.com/enhanced-2k.jpg",
    });

    // Reverse order
    const result = getBestEnhancement([tier1kJob, tier4kJob, tier2kJob]);
    expect(result).toEqual(tier4kJob);
  });

  it("should ignore non-COMPLETED status jobs", () => {
    const tier4kPendingJob = createMockJob({
      tier: "TIER_4K",
      status: "PENDING",
      enhancedUrl: null,
    });
    const tier2kCompletedJob = createMockJob({
      tier: "TIER_2K",
      status: "COMPLETED",
      enhancedUrl: "https://example.com/enhanced-2k.jpg",
    });

    const result = getBestEnhancement([tier4kPendingJob, tier2kCompletedJob]);
    expect(result).toEqual(tier2kCompletedJob);
  });

  it("should ignore FAILED status jobs", () => {
    const tier4kFailedJob = createMockJob({
      tier: "TIER_4K",
      status: "FAILED",
      enhancedUrl: null,
    });
    const tier1kCompletedJob = createMockJob({
      tier: "TIER_1K",
      status: "COMPLETED",
      enhancedUrl: "https://example.com/enhanced-1k.jpg",
    });

    const result = getBestEnhancement([tier4kFailedJob, tier1kCompletedJob]);
    expect(result).toEqual(tier1kCompletedJob);
  });

  it("should ignore REFUNDED status jobs", () => {
    const tier4kRefundedJob = createMockJob({
      tier: "TIER_4K",
      status: "REFUNDED",
      enhancedUrl: "https://example.com/enhanced-4k.jpg",
    });
    const tier1kCompletedJob = createMockJob({
      tier: "TIER_1K",
      status: "COMPLETED",
      enhancedUrl: "https://example.com/enhanced-1k.jpg",
    });

    const result = getBestEnhancement([tier4kRefundedJob, tier1kCompletedJob]);
    expect(result).toEqual(tier1kCompletedJob);
  });

  it("should ignore CANCELLED status jobs", () => {
    const tier4kCancelledJob = createMockJob({
      tier: "TIER_4K",
      status: "CANCELLED",
      enhancedUrl: "https://example.com/enhanced-4k.jpg",
    });
    const tier1kCompletedJob = createMockJob({
      tier: "TIER_1K",
      status: "COMPLETED",
      enhancedUrl: "https://example.com/enhanced-1k.jpg",
    });

    const result = getBestEnhancement([tier4kCancelledJob, tier1kCompletedJob]);
    expect(result).toEqual(tier1kCompletedJob);
  });

  it("should handle multiple COMPLETED jobs of same tier (returns first in sorted order)", () => {
    const tier2kJob1 = createMockJob({
      id: "job-1",
      tier: "TIER_2K",
      status: "COMPLETED",
      enhancedUrl: "https://example.com/enhanced-2k-1.jpg",
    });
    const tier2kJob2 = createMockJob({
      id: "job-2",
      tier: "TIER_2K",
      status: "COMPLETED",
      enhancedUrl: "https://example.com/enhanced-2k-2.jpg",
    });

    const result = getBestEnhancement([tier2kJob1, tier2kJob2]);
    // Should return one of them (order is stable but either is acceptable)
    expect(result).toBeDefined();
    expect(result?.tier).toBe("TIER_2K");
  });
});
