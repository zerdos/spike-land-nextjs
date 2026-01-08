import type { ContentRewriteResponse } from "@/lib/validations/brand-rewrite";
import type { Session } from "next-auth";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    brandProfile: {
      findUnique: vi.fn(),
    },
    contentRewrite: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/permissions/workspace-middleware", () => ({
  requireWorkspacePermission: vi.fn(),
}));

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: vi.fn(),
  rateLimitConfigs: {
    brandRewriting: { maxRequests: 15, windowMs: 60000 },
    brandScoring: { maxRequests: 30, windowMs: 60000 },
  },
}));

vi.mock("@/lib/brand-brain/rewrite-cache", () => ({
  buildRewriteCacheKey: vi.fn(),
  getCachedRewrite: vi.fn(),
  setCachedRewrite: vi.fn(),
}));

vi.mock("@/lib/brand-brain/rewrite-content", () => ({
  rewriteContent: vi.fn(),
  transformRewriteResult: vi.fn(),
}));

const { auth } = await import("@/auth");
const prisma = (await import("@/lib/prisma")).default;
const { requireWorkspacePermission } = await import(
  "@/lib/permissions/workspace-middleware"
);
const { checkRateLimit } = await import("@/lib/rate-limiter");
const { buildRewriteCacheKey, getCachedRewrite, setCachedRewrite } = await import(
  "@/lib/brand-brain/rewrite-cache"
);
const { rewriteContent, transformRewriteResult } = await import(
  "@/lib/brand-brain/rewrite-content"
);

// Import route after mocks
import { POST } from "./route";

describe("POST /api/workspaces/[workspaceId]/brand-brain/rewrite", () => {
  const mockSession = {
    user: { id: "user-123", email: "test@example.com", role: "USER" as const },
    expires: "2025-12-31",
  } satisfies Session;

  const mockMemberInfo = {
    workspaceId: "workspace-123",
    userId: "user-123",
    role: "MEMBER" as const,
  };

  const mockBrandProfile = {
    id: "profile-123",
    workspaceId: "workspace-123",
    name: "Test Brand",
    mission: "Test mission",
    values: ["Value1", "Value2"],
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
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: "user-123",
    updatedById: "user-123",
    guardrails: [],
    vocabulary: [],
  };

  const mockRewriteResult = {
    rewrittenContent: "Brand-aligned content",
    changes: [
      {
        id: "hunk-0",
        type: "unchanged" as const,
        value: "Brand",
        selected: true,
      },
      {
        id: "hunk-1",
        type: "added" as const,
        value: "-aligned content",
        selected: true,
      },
    ],
    toneAnalysis: {
      formalCasual: 50,
      technicalSimple: 50,
      seriousPlayful: 50,
      reservedEnthusiastic: 50,
      alignment: 85,
    },
    characterCount: {
      original: 20,
      rewritten: 21,
      limit: 280,
    },
  };

  const mockTransformedResponse: ContentRewriteResponse = {
    id: "rewrite-123",
    original: "Original content",
    rewritten: "Brand-aligned content",
    platform: "TWITTER",
    changes: mockRewriteResult.changes,
    characterCount: mockRewriteResult.characterCount,
    toneAnalysis: mockRewriteResult.toneAnalysis,
    cached: false,
    cachedAt: undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default happy path mocks
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(requireWorkspacePermission).mockResolvedValue(mockMemberInfo);
    vi.mocked(checkRateLimit).mockResolvedValue({
      isLimited: false,
      remaining: 10,
      resetAt: Date.now() + 60000,
    });
    vi.mocked(prisma.brandProfile.findUnique).mockResolvedValue(
      mockBrandProfile,
    );
    vi.mocked(buildRewriteCacheKey).mockReturnValue("cache-key");
    vi.mocked(getCachedRewrite).mockResolvedValue(null);
    vi.mocked(rewriteContent).mockResolvedValue(mockRewriteResult);
    vi.mocked(transformRewriteResult).mockReturnValue(mockTransformedResponse);
    vi.mocked(prisma.contentRewrite.create).mockResolvedValue({
      id: "rewrite-123",
      workspaceId: "workspace-123",
      brandProfileId: "profile-123",
      originalContent: "Original content",
      rewrittenContent: "Brand-aligned content",
      platform: "TWITTER",
      status: "COMPLETED",
      characterLimit: 280,
      changes: mockRewriteResult.changes,
      toneAnalysis: mockRewriteResult.toneAnalysis,
      errorMessage: null,
      processedAt: new Date(),
      createdById: "user-123",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(setCachedRewrite).mockResolvedValue(undefined);
  });

  const createRequest = (body: unknown) =>
    new NextRequest(
      "http://localhost/api/workspaces/workspace-123/brand-brain/rewrite",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );

  const createParams = () => ({
    params: Promise.resolve({ workspaceId: "workspace-123" }),
  });

  it("should rewrite content successfully", async () => {
    const request = createRequest({
      content: "Original content",
      platform: "TWITTER",
    });

    const response = await POST(request, createParams());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe("rewrite-123");
    expect(data.rewritten).toBe("Brand-aligned content");
    expect(data.cached).toBe(false);
  });

  it("should return 401 for unauthenticated user", async () => {
    vi.mocked(requireWorkspacePermission).mockRejectedValue(
      new Error("Unauthorized"),
    );

    const request = createRequest({
      content: "Test content",
      platform: "TWITTER",
    });

    const response = await POST(request, createParams());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 for user without permission", async () => {
    vi.mocked(requireWorkspacePermission).mockRejectedValue(
      new Error("Access denied"),
    );

    const request = createRequest({
      content: "Test content",
      platform: "TWITTER",
    });

    const response = await POST(request, createParams());
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Access denied");
  });

  it("should return 429 when rate limited", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      isLimited: true,
      remaining: 0,
      resetAt: Date.now() + 30000,
    });

    const request = createRequest({
      content: "Test content",
      platform: "TWITTER",
    });

    const response = await POST(request, createParams());
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toBe("Rate limit exceeded");
    expect(response.headers.get("Retry-After")).toBeDefined();
  });

  it("should return 400 for invalid JSON body", async () => {
    const request = new NextRequest(
      "http://localhost/api/workspaces/workspace-123/brand-brain/rewrite",
      {
        method: "POST",
        body: "invalid json",
      },
    );

    const response = await POST(request, createParams());
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid JSON body");
  });

  it("should return 400 for empty content", async () => {
    const request = createRequest({
      content: "",
      platform: "TWITTER",
    });

    const response = await POST(request, createParams());
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
  });

  it("should return 400 for invalid platform", async () => {
    const request = createRequest({
      content: "Test content",
      platform: "INVALID",
    });

    const response = await POST(request, createParams());
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
  });

  it("should return 404 when brand profile not found", async () => {
    vi.mocked(prisma.brandProfile.findUnique).mockResolvedValue(null);

    const request = createRequest({
      content: "Test content",
      platform: "TWITTER",
    });

    const response = await POST(request, createParams());
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain("Brand profile not found");
  });

  it("should return cached result when available", async () => {
    const cachedResponse: ContentRewriteResponse = {
      ...mockTransformedResponse,
      cached: true,
      cachedAt: "2024-01-15T10:00:00.000Z",
    };
    vi.mocked(getCachedRewrite).mockResolvedValue(cachedResponse);

    const request = createRequest({
      content: "Original content",
      platform: "TWITTER",
    });

    const response = await POST(request, createParams());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.cached).toBe(true);
    expect(rewriteContent).not.toHaveBeenCalled();
  });

  it("should use default platform when not provided", async () => {
    const request = createRequest({
      content: "Test content",
    });

    await POST(request, createParams());

    expect(buildRewriteCacheKey).toHaveBeenCalledWith(
      "workspace-123",
      1,
      "Test content",
      "GENERAL",
    );
  });

  it("should return 500 when brand profile fetch fails", async () => {
    vi.mocked(prisma.brandProfile.findUnique).mockRejectedValue(
      new Error("DB error"),
    );

    const request = createRequest({
      content: "Test content",
      platform: "TWITTER",
    });

    const response = await POST(request, createParams());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Failed to fetch brand profile");
  });

  it("should return 500 when rewrite fails", async () => {
    vi.mocked(rewriteContent).mockRejectedValue(new Error("AI error"));

    const request = createRequest({
      content: "Test content",
      platform: "TWITTER",
    });

    const response = await POST(request, createParams());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Failed to rewrite content");
  });

  it("should continue when database history write fails", async () => {
    vi.mocked(prisma.contentRewrite.create).mockRejectedValue(
      new Error("DB error"),
    );

    const request = createRequest({
      content: "Test content",
      platform: "TWITTER",
    });

    const response = await POST(request, createParams());

    // Should still return 200 since rewrite succeeded
    expect(response.status).toBe(200);
    expect(setCachedRewrite).toHaveBeenCalled();
  });

  it("should cache successful rewrite result", async () => {
    const request = createRequest({
      content: "Test content",
      platform: "TWITTER",
    });

    await POST(request, createParams());

    expect(setCachedRewrite).toHaveBeenCalledWith(
      "cache-key",
      expect.objectContaining({
        cached: true,
        cachedAt: expect.any(String),
      }),
    );
  });

  it("should call rewriteContent with correct parameters", async () => {
    const request = createRequest({
      content: "Test content",
      platform: "LINKEDIN",
    });

    await POST(request, createParams());

    expect(rewriteContent).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "Test content",
        platform: "LINKEDIN",
        brandProfile: expect.objectContaining({
          id: "profile-123",
          name: "Test Brand",
        }),
        guardrails: [],
        vocabulary: [],
      }),
    );
  });

  it("should handle content at maximum length", async () => {
    const maxContent = "a".repeat(50000);
    const request = createRequest({
      content: maxContent,
      platform: "GENERAL",
    });

    await POST(request, createParams());

    expect(rewriteContent).toHaveBeenCalled();
  });

  it("should reject content exceeding maximum length", async () => {
    const overMaxContent = "a".repeat(50001);
    const request = createRequest({
      content: overMaxContent,
      platform: "GENERAL",
    });

    const response = await POST(request, createParams());
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
  });

  it("should include guardrails in rewrite call", async () => {
    const profileWithGuardrails = {
      ...mockBrandProfile,
      guardrails: [
        {
          id: "g1",
          brandProfileId: "profile-123",
          type: "PROHIBITED_TOPIC",
          name: "Politics",
          description: "Avoid political topics",
          severity: "HIGH",
          ruleConfig: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };
    vi.mocked(prisma.brandProfile.findUnique).mockResolvedValue(
      profileWithGuardrails,
    );

    const request = createRequest({
      content: "Test content",
      platform: "TWITTER",
    });

    await POST(request, createParams());

    expect(rewriteContent).toHaveBeenCalledWith(
      expect.objectContaining({
        guardrails: expect.arrayContaining([
          expect.objectContaining({
            type: "PROHIBITED_TOPIC",
            name: "Politics",
          }),
        ]),
      }),
    );
  });

  it("should include vocabulary in rewrite call", async () => {
    const profileWithVocabulary = {
      ...mockBrandProfile,
      vocabulary: [
        {
          id: "v1",
          brandProfileId: "profile-123",
          type: "BANNED",
          term: "cheap",
          replacement: null,
          context: "use affordable",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };
    vi.mocked(prisma.brandProfile.findUnique).mockResolvedValue(
      profileWithVocabulary,
    );

    const request = createRequest({
      content: "Test content",
      platform: "TWITTER",
    });

    await POST(request, createParams());

    expect(rewriteContent).toHaveBeenCalledWith(
      expect.objectContaining({
        vocabulary: expect.arrayContaining([
          expect.objectContaining({
            type: "BANNED",
            term: "cheap",
          }),
        ]),
      }),
    );
  });

  it("should verify workspace permission with brand:write", async () => {
    const request = createRequest({
      content: "Test content",
      platform: "TWITTER",
    });

    await POST(request, createParams());

    expect(requireWorkspacePermission).toHaveBeenCalledWith(
      mockSession,
      "workspace-123",
      "brand:write",
    );
  });

  it("should use correct rate limit key", async () => {
    const request = createRequest({
      content: "Test content",
      platform: "TWITTER",
    });

    await POST(request, createParams());

    expect(checkRateLimit).toHaveBeenCalledWith(
      "brand-rewriting:user-123",
      expect.any(Object),
    );
  });
});
