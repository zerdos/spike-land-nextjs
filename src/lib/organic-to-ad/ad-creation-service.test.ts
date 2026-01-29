import type { CreativeVariant, TargetingSuggestion } from "@/lib/types/organic-to-ad";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdCreationService } from "./ad-creation-service";

// Mock Prisma
const mockFindUniquePost = vi.fn();

vi.mock("@/lib/prisma", () => ({
  default: {
    socialPost: {
      findUnique: (...args: any[]) => mockFindUniquePost(...args),
    },
  },
}));

describe("AdCreationService", () => {
  let service: AdCreationService;

  beforeEach(() => {
    service = new AdCreationService();
    vi.clearAllMocks();
  });

  const mockCreative: CreativeVariant = {
    id: "cr1",
    format: "IMAGE",
    placement: "FEED",
    content: {},
    media: { url: "http://img", type: "image", width: 100, height: 100, aspectRatio: "1:1" },
    adaptations: { textLengthOptimized: true, ctaOptimized: true, aspectRatioAdjusted: true },
  };

  const mockTargeting: TargetingSuggestion = {
    platform: "FACEBOOK",
    options: [],
    audienceSize: { min: 1000, max: 2000 },
    generatedAt: new Date(),
  };

  const mockBudget = { daily: 10, total: 100 };

  it("should create draft successfully when inputs are valid", async () => {
    mockFindUniquePost.mockResolvedValue({ id: "post1" });

    const result = await service.createAdDraft(
      "ws1",
      "post1",
      mockCreative,
      mockTargeting,
      mockBudget,
    );

    expect(result.id).toMatch(/^draft_/);
    expect(result.status).toBe("DRAFT");
    expect(mockFindUniquePost).toHaveBeenCalled();
  });

  it("should throw error if post not found", async () => {
    mockFindUniquePost.mockResolvedValue(null);

    await expect(service.createAdDraft("ws1", "postX", mockCreative, mockTargeting, mockBudget))
      .rejects.toThrow("Post not found");
  });

  it("should throw error if validation fails", async () => {
    await expect(service.createAdDraft("", "post1", mockCreative, mockTargeting, mockBudget))
      .rejects.toThrow("Workspace ID and Post ID are required");
  });
});
