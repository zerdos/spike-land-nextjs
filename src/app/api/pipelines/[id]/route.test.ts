import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { DELETE, GET, PATCH } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    enhancementPipeline: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock crypto.randomUUID for share token generation
const mockRandomUUID = vi.fn(() => "new-share-token-uuid");
vi.stubGlobal("crypto", { randomUUID: mockRandomUUID });

import { auth } from "@/auth";
import prisma from "@/lib/prisma";

const createParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe("Pipeline Detail API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/pipelines/[id]", () => {
    it("returns 401 when not authenticated", async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/pipelines/abc");
      const response = await GET(request, createParams("abc"));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 404 when pipeline not found", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.enhancementPipeline.findUnique as Mock).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/pipelines/abc");
      const response = await GET(request, createParams("abc"));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Pipeline not found");
    });

    it("returns pipeline for owner", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.enhancementPipeline.findUnique as Mock).mockResolvedValue({
        id: "pipeline_1",
        name: "My Pipeline",
        description: "Test description",
        userId: "user_123",
        visibility: "PRIVATE",
        shareToken: null,
        tier: "TIER_1K",
        analysisConfig: { enabled: true },
        autoCropConfig: { enabled: true },
        promptConfig: {},
        generationConfig: { retryAttempts: 3 },
        usageCount: 10,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
        _count: { albums: 2, jobs: 15 },
      });

      const request = new NextRequest("http://localhost:3000/api/pipelines/pipeline_1");
      const response = await GET(request, createParams("pipeline_1"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pipeline.name).toBe("My Pipeline");
      expect(data.pipeline.isOwner).toBe(true);
      expect(data.pipeline.isSystemDefault).toBe(false);
      expect(data.pipeline.albumCount).toBe(2);
      expect(data.pipeline.jobCount).toBe(15);
    });

    it("returns public pipeline for non-owner", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "other_user" },
      });
      (prisma.enhancementPipeline.findUnique as Mock).mockResolvedValue({
        id: "pipeline_1",
        name: "Public Pipeline",
        description: null,
        userId: "user_123",
        visibility: "PUBLIC",
        shareToken: null,
        tier: "TIER_2K",
        analysisConfig: null,
        autoCropConfig: null,
        promptConfig: null,
        generationConfig: null,
        usageCount: 50,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
        _count: { albums: 5, jobs: 100 },
      });

      const request = new NextRequest("http://localhost:3000/api/pipelines/pipeline_1");
      const response = await GET(request, createParams("pipeline_1"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pipeline.isOwner).toBe(false);
      expect(data.pipeline.isSystemDefault).toBe(false);
    });

    it("returns system default for any user", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "any_user" },
      });
      (prisma.enhancementPipeline.findUnique as Mock).mockResolvedValue({
        id: "system_default",
        name: "System Default",
        description: "Default pipeline",
        userId: null,
        visibility: "PUBLIC",
        shareToken: null,
        tier: "TIER_1K",
        analysisConfig: { enabled: true },
        autoCropConfig: { enabled: true },
        promptConfig: {},
        generationConfig: { retryAttempts: 3 },
        usageCount: 1000,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        _count: { albums: 100, jobs: 10000 },
      });

      const request = new NextRequest("http://localhost:3000/api/pipelines/system_default");
      const response = await GET(request, createParams("system_default"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pipeline.isOwner).toBe(false);
      expect(data.pipeline.isSystemDefault).toBe(true);
    });

    it("returns pipeline with valid share token for LINK visibility", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "other_user" },
      });
      (prisma.enhancementPipeline.findUnique as Mock).mockResolvedValue({
        id: "pipeline_1",
        name: "Link Pipeline",
        description: null,
        userId: "user_123",
        visibility: "LINK",
        shareToken: "valid-token-123",
        tier: "TIER_1K",
        analysisConfig: null,
        autoCropConfig: null,
        promptConfig: null,
        generationConfig: null,
        usageCount: 5,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
        _count: { albums: 1, jobs: 5 },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/pipelines/pipeline_1?token=valid-token-123",
      );
      const response = await GET(request, createParams("pipeline_1"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pipeline.name).toBe("Link Pipeline");
    });

    it("returns 403 for private pipeline not owned by user", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "other_user" },
      });
      (prisma.enhancementPipeline.findUnique as Mock).mockResolvedValue({
        id: "pipeline_1",
        name: "Private Pipeline",
        description: null,
        userId: "user_123",
        visibility: "PRIVATE",
        shareToken: null,
        tier: "TIER_1K",
        analysisConfig: null,
        autoCropConfig: null,
        promptConfig: null,
        generationConfig: null,
        usageCount: 0,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
        _count: { albums: 0, jobs: 0 },
      });

      const request = new NextRequest("http://localhost:3000/api/pipelines/pipeline_1");
      const response = await GET(request, createParams("pipeline_1"));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Access denied");
    });

    it("returns 403 for LINK pipeline without valid token", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "other_user" },
      });
      (prisma.enhancementPipeline.findUnique as Mock).mockResolvedValue({
        id: "pipeline_1",
        name: "Link Pipeline",
        description: null,
        userId: "user_123",
        visibility: "LINK",
        shareToken: "valid-token-123",
        tier: "TIER_1K",
        analysisConfig: null,
        autoCropConfig: null,
        promptConfig: null,
        generationConfig: null,
        usageCount: 0,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
        _count: { albums: 0, jobs: 0 },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/pipelines/pipeline_1?token=invalid-token",
      );
      const response = await GET(request, createParams("pipeline_1"));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Access denied");
    });

    it("returns 500 on database error", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.enhancementPipeline.findUnique as Mock).mockRejectedValue(
        new Error("Database error"),
      );

      const request = new NextRequest("http://localhost:3000/api/pipelines/abc");
      const response = await GET(request, createParams("abc"));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch pipeline");
    });
  });

  describe("PATCH /api/pipelines/[id]", () => {
    it("returns 401 when not authenticated", async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/pipelines/abc", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
      });
      const response = await PATCH(request, createParams("abc"));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 404 when pipeline not found", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.enhancementPipeline.findUnique as Mock).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/pipelines/abc", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
      });
      const response = await PATCH(request, createParams("abc"));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Pipeline not found");
    });

    it("returns 403 when user is not owner", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "other_user" },
      });
      (prisma.enhancementPipeline.findUnique as Mock).mockResolvedValue({
        userId: "user_123",
      });

      const request = new NextRequest("http://localhost:3000/api/pipelines/abc", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
      });
      const response = await PATCH(request, createParams("abc"));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Only the owner can update this pipeline");
    });

    it("returns 400 for empty name", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.enhancementPipeline.findUnique as Mock).mockResolvedValue({
        userId: "user_123",
      });

      const request = new NextRequest("http://localhost:3000/api/pipelines/abc", {
        method: "PATCH",
        body: JSON.stringify({ name: "  " }),
      });
      const response = await PATCH(request, createParams("abc"));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Pipeline name cannot be empty");
    });

    it("returns 400 for name exceeding 100 characters", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.enhancementPipeline.findUnique as Mock).mockResolvedValue({
        userId: "user_123",
      });

      const request = new NextRequest("http://localhost:3000/api/pipelines/abc", {
        method: "PATCH",
        body: JSON.stringify({ name: "a".repeat(101) }),
      });
      const response = await PATCH(request, createParams("abc"));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Pipeline name must be 100 characters or less");
    });

    it("returns 400 for invalid tier", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.enhancementPipeline.findUnique as Mock).mockResolvedValue({
        userId: "user_123",
      });

      const request = new NextRequest("http://localhost:3000/api/pipelines/abc", {
        method: "PATCH",
        body: JSON.stringify({ tier: "INVALID_TIER" }),
      });
      const response = await PATCH(request, createParams("abc"));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid tier. Must be one of: TIER_1K, TIER_2K, TIER_4K");
    });

    it("returns 400 for invalid visibility", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.enhancementPipeline.findUnique as Mock).mockResolvedValue({
        userId: "user_123",
      });

      const request = new NextRequest("http://localhost:3000/api/pipelines/abc", {
        method: "PATCH",
        body: JSON.stringify({ visibility: "INVALID" }),
      });
      const response = await PATCH(request, createParams("abc"));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid visibility. Must be one of: PRIVATE, PUBLIC, LINK");
    });

    it("updates name successfully", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.enhancementPipeline.findUnique as Mock).mockResolvedValue({
        userId: "user_123",
      });
      (prisma.enhancementPipeline.update as Mock).mockResolvedValue({
        id: "pipeline_1",
        name: "Updated Name",
        description: null,
        userId: "user_123",
        visibility: "PRIVATE",
        shareToken: null,
        tier: "TIER_1K",
        analysisConfig: { enabled: true },
        autoCropConfig: { enabled: true },
        promptConfig: {},
        generationConfig: { retryAttempts: 3 },
        usageCount: 0,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-02"),
      });

      const request = new NextRequest("http://localhost:3000/api/pipelines/pipeline_1", {
        method: "PATCH",
        body: JSON.stringify({ name: "  Updated Name  " }),
      });
      const response = await PATCH(request, createParams("pipeline_1"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pipeline.name).toBe("Updated Name");
      expect(prisma.enhancementPipeline.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Updated Name",
          }),
        }),
      );
    });

    it("updates tier successfully", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.enhancementPipeline.findUnique as Mock).mockResolvedValue({
        userId: "user_123",
      });
      (prisma.enhancementPipeline.update as Mock).mockResolvedValue({
        id: "pipeline_1",
        name: "Pipeline",
        description: null,
        userId: "user_123",
        visibility: "PRIVATE",
        shareToken: null,
        tier: "TIER_4K",
        analysisConfig: null,
        autoCropConfig: null,
        promptConfig: null,
        generationConfig: null,
        usageCount: 0,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-02"),
      });

      const request = new NextRequest("http://localhost:3000/api/pipelines/pipeline_1", {
        method: "PATCH",
        body: JSON.stringify({ tier: "TIER_4K" }),
      });
      const response = await PATCH(request, createParams("pipeline_1"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pipeline.tier).toBe("TIER_4K");
    });

    it("updates configs successfully", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.enhancementPipeline.findUnique as Mock).mockResolvedValue({
        userId: "user_123",
      });
      (prisma.enhancementPipeline.update as Mock).mockResolvedValue({
        id: "pipeline_1",
        name: "Pipeline",
        description: null,
        userId: "user_123",
        visibility: "PRIVATE",
        shareToken: null,
        tier: "TIER_1K",
        analysisConfig: { enabled: false },
        autoCropConfig: { enabled: false },
        promptConfig: { customInstructions: "New instructions" },
        generationConfig: { retryAttempts: 5 },
        usageCount: 0,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-02"),
      });

      const request = new NextRequest("http://localhost:3000/api/pipelines/pipeline_1", {
        method: "PATCH",
        body: JSON.stringify({
          analysisConfig: { enabled: false },
          autoCropConfig: { enabled: false },
          promptConfig: { customInstructions: "New instructions" },
          generationConfig: { retryAttempts: 5 },
        }),
      });
      const response = await PATCH(request, createParams("pipeline_1"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pipeline.analysisConfig).toEqual({ enabled: false });
      expect(data.pipeline.generationConfig).toEqual({ retryAttempts: 5 });
    });

    it("generates shareToken when changing to LINK visibility", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      // First call for ownership check
      (prisma.enhancementPipeline.findUnique as Mock)
        .mockResolvedValueOnce({
          userId: "user_123",
        })
        // Second call to check existing shareToken
        .mockResolvedValueOnce({
          shareToken: null,
        });
      (prisma.enhancementPipeline.update as Mock).mockResolvedValue({
        id: "pipeline_1",
        name: "Pipeline",
        description: null,
        userId: "user_123",
        visibility: "LINK",
        shareToken: "new-share-token-uuid",
        tier: "TIER_1K",
        analysisConfig: null,
        autoCropConfig: null,
        promptConfig: null,
        generationConfig: null,
        usageCount: 0,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-02"),
      });

      const request = new NextRequest("http://localhost:3000/api/pipelines/pipeline_1", {
        method: "PATCH",
        body: JSON.stringify({ visibility: "LINK" }),
      });
      const response = await PATCH(request, createParams("pipeline_1"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pipeline.visibility).toBe("LINK");
      expect(data.pipeline.shareToken).toBe("new-share-token-uuid");
    });

    it("preserves existing shareToken when updating LINK pipeline", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      // First call for ownership check
      (prisma.enhancementPipeline.findUnique as Mock)
        .mockResolvedValueOnce({
          userId: "user_123",
        })
        // Second call - has existing shareToken
        .mockResolvedValueOnce({
          shareToken: "existing-token-123",
        });
      (prisma.enhancementPipeline.update as Mock).mockResolvedValue({
        id: "pipeline_1",
        name: "Pipeline",
        description: null,
        userId: "user_123",
        visibility: "LINK",
        shareToken: "existing-token-123",
        tier: "TIER_1K",
        analysisConfig: null,
        autoCropConfig: null,
        promptConfig: null,
        generationConfig: null,
        usageCount: 0,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-02"),
      });

      const request = new NextRequest("http://localhost:3000/api/pipelines/pipeline_1", {
        method: "PATCH",
        body: JSON.stringify({ visibility: "LINK" }),
      });
      const response = await PATCH(request, createParams("pipeline_1"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pipeline.shareToken).toBe("existing-token-123");
      // Verify crypto.randomUUID was not called to generate new token
      expect(mockRandomUUID).not.toHaveBeenCalled();
    });

    it("clears description when set to empty string", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.enhancementPipeline.findUnique as Mock).mockResolvedValue({
        userId: "user_123",
      });
      (prisma.enhancementPipeline.update as Mock).mockResolvedValue({
        id: "pipeline_1",
        name: "Pipeline",
        description: null,
        userId: "user_123",
        visibility: "PRIVATE",
        shareToken: null,
        tier: "TIER_1K",
        analysisConfig: null,
        autoCropConfig: null,
        promptConfig: null,
        generationConfig: null,
        usageCount: 0,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-02"),
      });

      const request = new NextRequest("http://localhost:3000/api/pipelines/pipeline_1", {
        method: "PATCH",
        body: JSON.stringify({ description: "  " }),
      });
      const response = await PATCH(request, createParams("pipeline_1"));

      expect(response.status).toBe(200);
      expect(prisma.enhancementPipeline.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: null,
          }),
        }),
      );
    });

    it("returns 500 on database error", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.enhancementPipeline.findUnique as Mock).mockResolvedValue({
        userId: "user_123",
      });
      (prisma.enhancementPipeline.update as Mock).mockRejectedValue(
        new Error("Database error"),
      );

      const request = new NextRequest("http://localhost:3000/api/pipelines/abc", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
      });
      const response = await PATCH(request, createParams("abc"));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to update pipeline");
    });
  });

  describe("DELETE /api/pipelines/[id]", () => {
    it("returns 401 when not authenticated", async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/pipelines/abc", {
        method: "DELETE",
      });
      const response = await DELETE(request, createParams("abc"));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 404 when pipeline not found", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.enhancementPipeline.findUnique as Mock).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/pipelines/abc", {
        method: "DELETE",
      });
      const response = await DELETE(request, createParams("abc"));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Pipeline not found");
    });

    it("returns 403 when user is not owner", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "other_user" },
      });
      (prisma.enhancementPipeline.findUnique as Mock).mockResolvedValue({
        userId: "user_123",
        _count: { albums: 0 },
      });

      const request = new NextRequest("http://localhost:3000/api/pipelines/abc", {
        method: "DELETE",
      });
      const response = await DELETE(request, createParams("abc"));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Only the owner can delete this pipeline");
    });

    it("returns 400 when pipeline is in use by albums", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.enhancementPipeline.findUnique as Mock).mockResolvedValue({
        userId: "user_123",
        _count: { albums: 3 },
      });

      const request = new NextRequest("http://localhost:3000/api/pipelines/abc", {
        method: "DELETE",
      });
      const response = await DELETE(request, createParams("abc"));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        "Cannot delete pipeline: it is being used by 3 album(s). Remove pipeline from albums first.",
      );
    });

    it("deletes pipeline successfully", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.enhancementPipeline.findUnique as Mock).mockResolvedValue({
        userId: "user_123",
        _count: { albums: 0 },
      });
      (prisma.enhancementPipeline.delete as Mock).mockResolvedValue({});

      const request = new NextRequest("http://localhost:3000/api/pipelines/pipeline_1", {
        method: "DELETE",
      });
      const response = await DELETE(request, createParams("pipeline_1"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.enhancementPipeline.delete).toHaveBeenCalledWith({
        where: { id: "pipeline_1" },
      });
    });

    it("returns 500 on database error", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.enhancementPipeline.findUnique as Mock).mockResolvedValue({
        userId: "user_123",
        _count: { albums: 0 },
      });
      (prisma.enhancementPipeline.delete as Mock).mockRejectedValue(
        new Error("Database error"),
      );

      const request = new NextRequest("http://localhost:3000/api/pipelines/abc", {
        method: "DELETE",
      });
      const response = await DELETE(request, createParams("abc"));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to delete pipeline");
    });
  });
});
