import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  workspace: { findFirst: vi.fn() },
  postBoostRecommendation: { findMany: vi.fn(), findFirst: vi.fn() },
  appliedBoost: { create: vi.fn() },
  socialPost: { findFirst: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import { createMockRegistry, getText } from "../__test-utils__";
import { registerBoostTools } from "./boost";

const WORKSPACE = { id: "ws-1", slug: "acme", name: "Acme" };
const userId = "user-1";

describe("boost tools", () => {
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistry();
    registerBoostTools(registry, userId);
    mockPrisma.workspace.findFirst.mockResolvedValue(WORKSPACE);
  });

  it("should register 4 boost tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(4);
    expect(registry.handlers.has("boost_detect_opportunities")).toBe(true);
    expect(registry.handlers.has("boost_get_recommendation")).toBe(true);
    expect(registry.handlers.has("boost_apply")).toBe(true);
    expect(registry.handlers.has("boost_predict_roi")).toBe(true);
  });

  describe("boost_detect_opportunities", () => {
    it("should list boost opportunities", async () => {
      mockPrisma.postBoostRecommendation.findMany.mockResolvedValue([
        {
          id: "rec-1",
          contentPreview: "Amazing product launch announcement",
          engagementRate: 0.08,
          predictedRoi: "3.5x",
          confidenceScore: 0.92,
        },
      ]);
      const handler = registry.handlers.get("boost_detect_opportunities")!;
      const result = await handler({ workspace_slug: "acme" });
      const text = getText(result);
      expect(text).toContain("Boost Opportunities");
      expect(text).toContain("Amazing product launch");
      expect(text).toContain("8.0%");
      expect(text).toContain("3.5x");
      expect(text).toContain("92%");
    });

    it("should show empty message when no opportunities", async () => {
      mockPrisma.postBoostRecommendation.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("boost_detect_opportunities")!;
      const result = await handler({ workspace_slug: "acme" });
      expect(getText(result)).toContain("No boost opportunities detected");
    });
  });

  describe("boost_get_recommendation", () => {
    it("should return detailed recommendation", async () => {
      mockPrisma.postBoostRecommendation.findFirst.mockResolvedValue({
        id: "rec-1",
        contentPreview: "Product launch post",
        engagementRate: 0.06,
        predictedRoi: "2.8x",
        confidenceScore: 0.85,
        suggestedBudget: 250,
      });
      const handler = registry.handlers.get("boost_get_recommendation")!;
      const result = await handler({ workspace_slug: "acme", recommendation_id: "rec-1" });
      const text = getText(result);
      expect(text).toContain("Boost Recommendation");
      expect(text).toContain("rec-1");
      expect(text).toContain("Product launch post");
      expect(text).toContain("6.0%");
      expect(text).toContain("$250");
    });

    it("should return error for non-existent recommendation", async () => {
      mockPrisma.postBoostRecommendation.findFirst.mockResolvedValue(null);
      const handler = registry.handlers.get("boost_get_recommendation")!;
      const result = await handler({ workspace_slug: "acme", recommendation_id: "rec-999" });
      expect(getText(result)).toContain("NOT_FOUND");
    });
  });

  describe("boost_apply", () => {
    it("should apply a boost when confirmed", async () => {
      mockPrisma.postBoostRecommendation.findFirst.mockResolvedValue({
        id: "rec-1",
        workspaceId: "ws-1",
        postId: "post-1",
        postType: "SOCIAL",
        recommendedPlatforms: ["FACEBOOK"],
      });
      mockPrisma.appliedBoost.create.mockResolvedValue({
        id: "boost-1",
        recommendationId: "rec-1",
        budget: 100,
        status: "ACTIVE",
      });
      const handler = registry.handlers.get("boost_apply")!;
      const result = await handler({
        workspace_slug: "acme",
        recommendation_id: "rec-1",
        budget: 100,
        confirm: true,
      });
      const text = getText(result);
      expect(text).toContain("Boost Applied");
      expect(text).toContain("boost-1");
      expect(text).toContain("$100");
      expect(text).toContain("PENDING");
      expect(mockPrisma.appliedBoost.create).toHaveBeenCalledWith({
        data: {
          workspaceId: "ws-1",
          recommendationId: "rec-1",
          postId: "post-1",
          postType: "SOCIAL",
          platform: "FACEBOOK",
          budget: 100,
          status: "ACTIVE",
        },
      });
    });

    it("should reject when confirm is false", async () => {
      const handler = registry.handlers.get("boost_apply")!;
      const result = await handler({
        workspace_slug: "acme",
        recommendation_id: "rec-1",
        budget: 100,
        confirm: false,
      });
      const text = getText(result);
      expect(text).toContain("Boost Not Applied");
      expect(text).toContain("confirm: true");
      expect(mockPrisma.appliedBoost.create).not.toHaveBeenCalled();
    });

    it("should return error for non-existent recommendation", async () => {
      mockPrisma.postBoostRecommendation.findFirst.mockResolvedValue(null);
      const handler = registry.handlers.get("boost_apply")!;
      const result = await handler({
        workspace_slug: "acme",
        recommendation_id: "rec-999",
        budget: 100,
        confirm: true,
      });
      expect(getText(result)).toContain("NOT_FOUND");
    });
  });

  describe("boost_predict_roi", () => {
    it("should predict ROI based on post metrics", async () => {
      mockPrisma.socialPost.findFirst.mockResolvedValue({
        id: "post-1",
        impressions: 10000,
        engagements: 500,
      });
      const handler = registry.handlers.get("boost_predict_roi")!;
      const result = await handler({
        workspace_slug: "acme",
        post_id: "post-1",
        budget: 50,
      });
      const text = getText(result);
      expect(text).toContain("ROI Prediction");
      expect(text).toContain("post-1");
      expect(text).toContain("$50");
      expect(text).toContain("5.0%");
      expect(text).toContain("Impressions");
      expect(text).toContain("Clicks");
      expect(text).toContain("ROAS");
    });

    it("should use default engagement rate when post has no impressions", async () => {
      mockPrisma.socialPost.findFirst.mockResolvedValue({
        id: "post-2",
        impressions: 0,
        engagements: 0,
      });
      const handler = registry.handlers.get("boost_predict_roi")!;
      const result = await handler({
        workspace_slug: "acme",
        post_id: "post-2",
        budget: 100,
      });
      const text = getText(result);
      expect(text).toContain("ROI Prediction");
      expect(text).toContain("3.0%");
    });

    it("should return error for non-existent post", async () => {
      mockPrisma.socialPost.findFirst.mockResolvedValue(null);
      const handler = registry.handlers.get("boost_predict_roi")!;
      const result = await handler({
        workspace_slug: "acme",
        post_id: "post-999",
        budget: 50,
      });
      expect(getText(result)).toContain("NOT_FOUND");
    });
  });
});
