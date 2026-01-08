import { describe, expect, it } from "vitest";
import {
  CONTENT_PLATFORMS,
  contentRewriteRequestSchema,
  contentRewriteResponseSchema,
  DIFF_HUNK_TYPES,
  diffHunkSchema,
  exceedsPlatformLimit,
  getPlatformDisplayName,
  getPlatformLimit,
  PLATFORM_LIMITS,
  REWRITE_STATUSES,
  rewriteHistoryItemSchema,
  rewriteHistoryResponseSchema,
} from "./brand-rewrite";

describe("brand-rewrite validations", () => {
  describe("constants", () => {
    it("should define all content platforms", () => {
      expect(CONTENT_PLATFORMS).toContain("TWITTER");
      expect(CONTENT_PLATFORMS).toContain("LINKEDIN");
      expect(CONTENT_PLATFORMS).toContain("INSTAGRAM");
      expect(CONTENT_PLATFORMS).toContain("FACEBOOK");
      expect(CONTENT_PLATFORMS).toContain("GENERAL");
      expect(CONTENT_PLATFORMS).toHaveLength(5);
    });

    it("should define platform limits", () => {
      expect(PLATFORM_LIMITS.TWITTER).toBe(280);
      expect(PLATFORM_LIMITS.LINKEDIN).toBe(3000);
      expect(PLATFORM_LIMITS.INSTAGRAM).toBe(2200);
      expect(PLATFORM_LIMITS.FACEBOOK).toBe(63206);
      expect(PLATFORM_LIMITS.GENERAL).toBe(50000);
    });

    it("should define all rewrite statuses", () => {
      expect(REWRITE_STATUSES).toContain("PENDING");
      expect(REWRITE_STATUSES).toContain("PROCESSING");
      expect(REWRITE_STATUSES).toContain("COMPLETED");
      expect(REWRITE_STATUSES).toContain("FAILED");
      expect(REWRITE_STATUSES).toHaveLength(4);
    });

    it("should define all diff hunk types", () => {
      expect(DIFF_HUNK_TYPES).toContain("added");
      expect(DIFF_HUNK_TYPES).toContain("removed");
      expect(DIFF_HUNK_TYPES).toContain("unchanged");
      expect(DIFF_HUNK_TYPES).toHaveLength(3);
    });
  });

  describe("contentRewriteRequestSchema", () => {
    it("should validate valid request", () => {
      const result = contentRewriteRequestSchema.safeParse({
        content: "Hello world",
        platform: "TWITTER",
      });

      expect(result.success).toBe(true);
    });

    it("should validate request with default platform", () => {
      const result = contentRewriteRequestSchema.safeParse({
        content: "Hello world",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.platform).toBe("GENERAL");
      }
    });

    it("should reject empty content", () => {
      const result = contentRewriteRequestSchema.safeParse({
        content: "",
        platform: "TWITTER",
      });

      expect(result.success).toBe(false);
    });

    it("should reject content exceeding 50000 characters", () => {
      const result = contentRewriteRequestSchema.safeParse({
        content: "a".repeat(50001),
        platform: "GENERAL",
      });

      expect(result.success).toBe(false);
    });

    it("should accept content at exactly 50000 characters", () => {
      const result = contentRewriteRequestSchema.safeParse({
        content: "a".repeat(50000),
        platform: "GENERAL",
      });

      expect(result.success).toBe(true);
    });

    it("should reject invalid platform", () => {
      const result = contentRewriteRequestSchema.safeParse({
        content: "Hello",
        platform: "INVALID",
      });

      expect(result.success).toBe(false);
    });

    it("should accept all valid platforms", () => {
      for (const platform of CONTENT_PLATFORMS) {
        const result = contentRewriteRequestSchema.safeParse({
          content: "Hello",
          platform,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("diffHunkSchema", () => {
    it("should validate valid diff hunk", () => {
      const result = diffHunkSchema.safeParse({
        id: "hunk-1",
        type: "added",
        value: "new text",
        selected: true,
      });

      expect(result.success).toBe(true);
    });

    it("should default selected to true", () => {
      const result = diffHunkSchema.safeParse({
        id: "hunk-1",
        type: "added",
        value: "text",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.selected).toBe(true);
      }
    });

    it("should accept optional lineNumber", () => {
      const result = diffHunkSchema.safeParse({
        id: "hunk-1",
        type: "unchanged",
        value: "text",
        lineNumber: 5,
        selected: false,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.lineNumber).toBe(5);
      }
    });

    it("should reject negative lineNumber", () => {
      const result = diffHunkSchema.safeParse({
        id: "hunk-1",
        type: "unchanged",
        value: "text",
        lineNumber: -1,
      });

      expect(result.success).toBe(false);
    });

    it("should reject invalid hunk type", () => {
      const result = diffHunkSchema.safeParse({
        id: "hunk-1",
        type: "modified",
        value: "text",
      });

      expect(result.success).toBe(false);
    });

    it("should accept all valid hunk types", () => {
      for (const type of DIFF_HUNK_TYPES) {
        const result = diffHunkSchema.safeParse({
          id: "hunk-1",
          type,
          value: "text",
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("contentRewriteResponseSchema", () => {
    const validResponse = {
      id: "rewrite-123",
      original: "Original content",
      rewritten: "Rewritten content",
      platform: "TWITTER",
      changes: [
        { id: "h1", type: "unchanged", value: "text", selected: true },
      ],
      characterCount: {
        original: 16,
        rewritten: 17,
        limit: 280,
      },
      toneAnalysis: {
        formalCasual: 50,
        technicalSimple: 50,
        seriousPlayful: 50,
        reservedEnthusiastic: 50,
        alignment: 85,
      },
      cached: false,
    };

    it("should validate valid response", () => {
      const result = contentRewriteResponseSchema.safeParse(validResponse);

      expect(result.success).toBe(true);
    });

    it("should accept optional cachedAt", () => {
      const result = contentRewriteResponseSchema.safeParse({
        ...validResponse,
        cached: true,
        cachedAt: "2024-01-15T10:30:00.000Z",
      });

      expect(result.success).toBe(true);
    });

    it("should reject invalid cachedAt format", () => {
      const result = contentRewriteResponseSchema.safeParse({
        ...validResponse,
        cachedAt: "invalid-date",
      });

      expect(result.success).toBe(false);
    });

    it("should reject missing required fields", () => {
      const { id: _id, ...withoutId } = validResponse;
      const result = contentRewriteResponseSchema.safeParse(withoutId);

      expect(result.success).toBe(false);
    });

    it("should reject negative character counts", () => {
      const result = contentRewriteResponseSchema.safeParse({
        ...validResponse,
        characterCount: {
          original: -1,
          rewritten: 10,
          limit: 280,
        },
      });

      expect(result.success).toBe(false);
    });

    it("should reject non-positive limit", () => {
      const result = contentRewriteResponseSchema.safeParse({
        ...validResponse,
        characterCount: {
          original: 10,
          rewritten: 10,
          limit: 0,
        },
      });

      expect(result.success).toBe(false);
    });
  });

  describe("rewriteHistoryItemSchema", () => {
    const validItem = {
      id: "item-123",
      originalContent: "Original",
      rewrittenContent: "Rewritten",
      platform: "LINKEDIN",
      status: "COMPLETED",
      characterLimit: 3000,
      createdAt: "2024-01-15T10:30:00.000Z",
    };

    it("should validate valid history item", () => {
      const result = rewriteHistoryItemSchema.safeParse(validItem);

      expect(result.success).toBe(true);
    });

    it("should accept null rewrittenContent", () => {
      const result = rewriteHistoryItemSchema.safeParse({
        ...validItem,
        rewrittenContent: null,
        status: "PENDING",
      });

      expect(result.success).toBe(true);
    });

    it("should accept null characterLimit", () => {
      const result = rewriteHistoryItemSchema.safeParse({
        ...validItem,
        characterLimit: null,
      });

      expect(result.success).toBe(true);
    });

    it("should accept all valid statuses", () => {
      for (const status of REWRITE_STATUSES) {
        const result = rewriteHistoryItemSchema.safeParse({
          ...validItem,
          status,
        });
        expect(result.success).toBe(true);
      }
    });

    it("should reject invalid status", () => {
      const result = rewriteHistoryItemSchema.safeParse({
        ...validItem,
        status: "INVALID_STATUS",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("rewriteHistoryResponseSchema", () => {
    const validHistoryResponse = {
      items: [
        {
          id: "item-1",
          originalContent: "Original 1",
          rewrittenContent: "Rewritten 1",
          platform: "TWITTER",
          status: "COMPLETED",
          characterLimit: 280,
          createdAt: "2024-01-15T10:30:00.000Z",
        },
      ],
      total: 10,
      page: 1,
      pageSize: 10,
    };

    it("should validate valid history response", () => {
      const result = rewriteHistoryResponseSchema.safeParse(
        validHistoryResponse,
      );

      expect(result.success).toBe(true);
    });

    it("should accept empty items array", () => {
      const result = rewriteHistoryResponseSchema.safeParse({
        ...validHistoryResponse,
        items: [],
        total: 0,
      });

      expect(result.success).toBe(true);
    });

    it("should reject negative total", () => {
      const result = rewriteHistoryResponseSchema.safeParse({
        ...validHistoryResponse,
        total: -1,
      });

      expect(result.success).toBe(false);
    });

    it("should reject zero page", () => {
      const result = rewriteHistoryResponseSchema.safeParse({
        ...validHistoryResponse,
        page: 0,
      });

      expect(result.success).toBe(false);
    });

    it("should reject zero pageSize", () => {
      const result = rewriteHistoryResponseSchema.safeParse({
        ...validHistoryResponse,
        pageSize: 0,
      });

      expect(result.success).toBe(false);
    });
  });

  describe("getPlatformLimit", () => {
    it("should return correct limit for TWITTER", () => {
      expect(getPlatformLimit("TWITTER")).toBe(280);
    });

    it("should return correct limit for LINKEDIN", () => {
      expect(getPlatformLimit("LINKEDIN")).toBe(3000);
    });

    it("should return correct limit for INSTAGRAM", () => {
      expect(getPlatformLimit("INSTAGRAM")).toBe(2200);
    });

    it("should return correct limit for FACEBOOK", () => {
      expect(getPlatformLimit("FACEBOOK")).toBe(63206);
    });

    it("should return correct limit for GENERAL", () => {
      expect(getPlatformLimit("GENERAL")).toBe(50000);
    });
  });

  describe("exceedsPlatformLimit", () => {
    it("should return false for content within limit", () => {
      expect(exceedsPlatformLimit("Hello", "TWITTER")).toBe(false);
    });

    it("should return false for content at exactly limit", () => {
      expect(exceedsPlatformLimit("a".repeat(280), "TWITTER")).toBe(false);
    });

    it("should return true for content exceeding limit", () => {
      expect(exceedsPlatformLimit("a".repeat(281), "TWITTER")).toBe(true);
    });

    it("should work with different platforms", () => {
      expect(exceedsPlatformLimit("a".repeat(3001), "LINKEDIN")).toBe(true);
      expect(exceedsPlatformLimit("a".repeat(3000), "LINKEDIN")).toBe(false);
    });
  });

  describe("getPlatformDisplayName", () => {
    it("should return correct display name for TWITTER", () => {
      expect(getPlatformDisplayName("TWITTER")).toBe("Twitter / X");
    });

    it("should return correct display name for LINKEDIN", () => {
      expect(getPlatformDisplayName("LINKEDIN")).toBe("LinkedIn");
    });

    it("should return correct display name for INSTAGRAM", () => {
      expect(getPlatformDisplayName("INSTAGRAM")).toBe("Instagram");
    });

    it("should return correct display name for FACEBOOK", () => {
      expect(getPlatformDisplayName("FACEBOOK")).toBe("Facebook");
    });

    it("should return correct display name for GENERAL", () => {
      expect(getPlatformDisplayName("GENERAL")).toBe("General");
    });
  });
});
