import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// All mocks must be defined before any imports that use them
vi.mock("@/auth", () => ({
  auth: vi.fn(() =>
    Promise.resolve({
      user: { id: "user-123", email: "test@example.com" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    })
  ),
}));

vi.mock("@/lib/permissions/workspace-middleware", () => ({
  requireWorkspacePermission: vi.fn(),
}));

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: vi.fn(),
  rateLimitConfigs: {
    brandScoring: { maxRequests: 20, windowMs: 60000 },
  },
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    brandProfile: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/brand-brain/score-content", () => ({
  scoreContent: vi.fn(),
}));

vi.mock("@/lib/brand-brain/score-cache", () => ({
  getCachedScore: vi.fn(),
  setCachedScore: vi.fn(),
  buildScoreCacheKey: vi.fn(),
}));

// Import after mocks
import { buildScoreCacheKey, getCachedScore, setCachedScore } from "@/lib/brand-brain/score-cache";
import { scoreContent } from "@/lib/brand-brain/score-content";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limiter";
import { POST } from "./route";

// Cast mocks for type safety
const mockRequireWorkspacePermission = requireWorkspacePermission as ReturnType<
  typeof vi.fn
>;
const mockCheckRateLimit = checkRateLimit as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  brandProfile: { findUnique: ReturnType<typeof vi.fn>; };
};
const mockScoreContent = scoreContent as ReturnType<typeof vi.fn>;
const mockGetCachedScore = getCachedScore as ReturnType<typeof vi.fn>;
const mockSetCachedScore = setCachedScore as ReturnType<typeof vi.fn>;
const mockBuildScoreCacheKey = buildScoreCacheKey as ReturnType<typeof vi.fn>;

// Helper to create mock request
function createMockRequest(body: unknown): NextRequest {
  return new NextRequest(
    "http://localhost:3000/api/workspaces/ws-123/brand-brain/score",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

// Helper to create mock params
function createMockParams(workspaceId = "ws-123") {
  return { params: Promise.resolve({ workspaceId }) };
}

// Mock brand profile data
const mockBrandProfile = {
  id: "profile-123",
  workspaceId: "ws-123",
  name: "Test Brand",
  mission: "Test mission",
  values: ["Quality"],
  toneDescriptors: {
    formalCasual: 50,
    technicalSimple: 50,
    seriousPlayful: 50,
    reservedEnthusiastic: 50,
  },
  logoUrl: null,
  logoR2Key: null,
  colorPalette: [],
  version: 1,
  isActive: true,
  createdById: "user-123",
  updatedById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  guardrails: [],
  vocabulary: [],
};

const mockScoreResponse = {
  score: 85,
  overallAssessment: "GOOD",
  violations: [],
  suggestions: [],
  toneAnalysis: {
    formalCasual: 50,
    technicalSimple: 50,
    seriousPlayful: 50,
    reservedEnthusiastic: 50,
    alignment: 85,
  },
  cached: false,
};

describe("POST /api/workspaces/[workspaceId]/brand-brain/score", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockRequireWorkspacePermission.mockResolvedValue({ role: "MEMBER" });
    mockCheckRateLimit.mockResolvedValue({
      isLimited: false,
      remaining: 19,
      resetAt: Date.now() + 60000,
    });
    mockPrisma.brandProfile.findUnique.mockResolvedValue(mockBrandProfile);
    mockBuildScoreCacheKey.mockReturnValue("cache-key-123");
    mockGetCachedScore.mockResolvedValue(null);
    mockScoreContent.mockResolvedValue(mockScoreResponse);
    mockSetCachedScore.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("authentication and authorization", () => {
    it("should return 401 when not authenticated", async () => {
      mockRequireWorkspacePermission.mockRejectedValue(
        new Error("Unauthorized: Authentication required"),
      );

      const request = createMockRequest({ content: "Test content" });
      const response = await POST(request, createMockParams());

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toContain("Unauthorized");
    });

    it("should return 403 when lacking permission", async () => {
      mockRequireWorkspacePermission.mockRejectedValue(
        new Error("Forbidden: Not a workspace member"),
      );

      const request = createMockRequest({ content: "Test content" });
      const response = await POST(request, createMockParams());

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toContain("Forbidden");
    });
  });

  describe("rate limiting", () => {
    it("should return 429 when rate limited", async () => {
      mockCheckRateLimit.mockResolvedValue({
        isLimited: true,
        remaining: 0,
        resetAt: Date.now() + 30000,
      });

      const request = createMockRequest({ content: "Test content" });
      const response = await POST(request, createMockParams());

      expect(response.status).toBe(429);
      const body = await response.json();
      expect(body.error).toBe("Rate limit exceeded");
      expect(body.retryAfter).toBeDefined();
      expect(response.headers.get("Retry-After")).toBeDefined();
    });
  });

  describe("request validation", () => {
    it("should return 400 for invalid JSON", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/workspaces/ws-123/brand-brain/score",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "invalid json",
        },
      );

      const response = await POST(request, createMockParams());

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Invalid JSON body");
    });

    it("should return 400 for empty content", async () => {
      const request = createMockRequest({ content: "" });
      const response = await POST(request, createMockParams());

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Validation failed");
    });

    it("should return 400 for content exceeding limit", async () => {
      const request = createMockRequest({ content: "a".repeat(50001) });
      const response = await POST(request, createMockParams());

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Validation failed");
    });

    it("should return 400 for invalid content type", async () => {
      const request = createMockRequest({
        content: "Test",
        contentType: "invalid_type",
      });
      const response = await POST(request, createMockParams());

      expect(response.status).toBe(400);
    });
  });

  describe("brand profile", () => {
    it("should return 404 when brand profile not found", async () => {
      mockPrisma.brandProfile.findUnique.mockResolvedValue(null);

      const request = createMockRequest({ content: "Test content" });
      const response = await POST(request, createMockParams());

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toContain("Brand profile not found");
    });

    it("should return 500 when database error occurs", async () => {
      mockPrisma.brandProfile.findUnique.mockRejectedValue(
        new Error("Database error"),
      );

      const request = createMockRequest({ content: "Test content" });
      const response = await POST(request, createMockParams());

      expect(response.status).toBe(500);
    });
  });

  describe("caching", () => {
    it("should return cached score when available", async () => {
      const cachedScore = {
        ...mockScoreResponse,
        cached: true,
        cachedAt: "2024-01-01T00:00:00.000Z",
      };
      mockGetCachedScore.mockResolvedValue(cachedScore);

      const request = createMockRequest({ content: "Test content" });
      const response = await POST(request, createMockParams());

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.cached).toBe(true);
      expect(mockScoreContent).not.toHaveBeenCalled();
    });

    it("should cache score after fresh generation", async () => {
      const request = createMockRequest({ content: "Test content" });
      await POST(request, createMockParams());

      expect(mockSetCachedScore).toHaveBeenCalled();
    });

    it("should build cache key with workspace and version", async () => {
      const request = createMockRequest({ content: "Test content" });
      await POST(request, createMockParams());

      expect(mockBuildScoreCacheKey).toHaveBeenCalledWith(
        "ws-123",
        1, // version
        "Test content",
      );
    });
  });

  describe("scoring", () => {
    it("should return score for valid request", async () => {
      const request = createMockRequest({
        content: "Test content for scoring",
      });
      const response = await POST(request, createMockParams());

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.score).toBe(85);
      expect(body.overallAssessment).toBe("GOOD");
    });

    it("should pass correct params to scoreContent", async () => {
      const request = createMockRequest({
        content: "Test content",
        contentType: "blog_article",
        strictMode: true,
      });
      await POST(request, createMockParams());

      expect(mockScoreContent).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "Test content",
          contentType: "blog_article",
          strictMode: true,
        }),
      );
    });

    it("should use default values for optional fields", async () => {
      const request = createMockRequest({ content: "Test content" });
      await POST(request, createMockParams());

      expect(mockScoreContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: "general",
          strictMode: false,
        }),
      );
    });

    it("should return 500 when scoring fails", async () => {
      mockScoreContent.mockRejectedValue(new Error("Scoring failed"));

      const request = createMockRequest({ content: "Test content" });
      const response = await POST(request, createMockParams());

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toContain("Failed to score content");
    });

    it("should include guardrails and vocabulary in scoring params", async () => {
      const profileWithData = {
        ...mockBrandProfile,
        guardrails: [
          {
            id: "g1",
            brandProfileId: "profile-123",
            type: "PROHIBITED_TOPIC",
            name: "Test guardrail",
            description: "Test description",
            severity: "HIGH",
            ruleConfig: null,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        vocabulary: [
          {
            id: "v1",
            brandProfileId: "profile-123",
            type: "BANNED",
            term: "test",
            replacement: null,
            context: null,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };
      mockPrisma.brandProfile.findUnique.mockResolvedValue(profileWithData);

      const request = createMockRequest({ content: "Test content" });
      await POST(request, createMockParams());

      expect(mockScoreContent).toHaveBeenCalledWith(
        expect.objectContaining({
          guardrails: expect.arrayContaining([
            expect.objectContaining({ name: "Test guardrail" }),
          ]),
          vocabulary: expect.arrayContaining([
            expect.objectContaining({ term: "test" }),
          ]),
        }),
      );
    });
  });
});
