import { NextRequest } from "next/server";
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    enhancementPipeline: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { auth } from "@/auth";
import prisma from "@/lib/prisma";

const createParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe("Pipeline Fork API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/pipelines/[id]/fork", () => {
    it("returns 401 when not authenticated", async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/pipelines/abc/fork",
        {
          method: "POST",
        },
      );
      const response = await POST(request, createParams("abc"));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 404 when source pipeline not found", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.enhancementPipeline.findUnique as Mock).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/pipelines/abc/fork",
        {
          method: "POST",
        },
      );
      const response = await POST(request, createParams("abc"));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Pipeline not found");
    });

    it("returns 403 for private pipeline not accessible", async () => {
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
        analysisConfig: { enabled: true },
        autoCropConfig: { enabled: true },
        promptConfig: {},
        generationConfig: { retryAttempts: 3 },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/pipelines/pipeline_1/fork",
        {
          method: "POST",
        },
      );
      const response = await POST(request, createParams("pipeline_1"));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Access denied");
    });

    it("forks own pipeline successfully", async () => {
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
        tier: "TIER_2K",
        analysisConfig: { enabled: true },
        autoCropConfig: { enabled: false },
        promptConfig: { customInstructions: "Custom" },
        generationConfig: { retryAttempts: 5 },
      });
      (prisma.enhancementPipeline.create as Mock).mockResolvedValue({
        id: "forked_pipeline_1",
        name: "My Pipeline (copy)",
        description: "Test description",
        userId: "user_123",
        visibility: "PRIVATE",
        tier: "TIER_2K",
        analysisConfig: { enabled: true },
        autoCropConfig: { enabled: false },
        promptConfig: { customInstructions: "Custom" },
        generationConfig: { retryAttempts: 5 },
        usageCount: 0,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      });

      const request = new NextRequest(
        "http://localhost:3000/api/pipelines/pipeline_1/fork",
        {
          method: "POST",
        },
      );
      const response = await POST(request, createParams("pipeline_1"));
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.pipeline.name).toBe("My Pipeline (copy)");
      expect(data.pipeline.visibility).toBe("PRIVATE");
      expect(data.pipeline.isOwner).toBe(true);
      expect(data.pipeline.isSystemDefault).toBe(false);
      expect(data.forkedFrom).toBe("pipeline_1");
    });

    it("forks public pipeline successfully", async () => {
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
        tier: "TIER_1K",
        analysisConfig: null,
        autoCropConfig: null,
        promptConfig: null,
        generationConfig: null,
      });
      (prisma.enhancementPipeline.create as Mock).mockResolvedValue({
        id: "forked_pipeline_1",
        name: "Public Pipeline (copy)",
        description: null,
        userId: "other_user",
        visibility: "PRIVATE",
        tier: "TIER_1K",
        analysisConfig: null,
        autoCropConfig: null,
        promptConfig: null,
        generationConfig: null,
        usageCount: 0,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      });

      const request = new NextRequest(
        "http://localhost:3000/api/pipelines/pipeline_1/fork",
        {
          method: "POST",
        },
      );
      const response = await POST(request, createParams("pipeline_1"));
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.pipeline.name).toBe("Public Pipeline (copy)");
      expect(data.forkedFrom).toBe("pipeline_1");
    });

    it("forks system default pipeline successfully", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
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
      });
      (prisma.enhancementPipeline.create as Mock).mockResolvedValue({
        id: "forked_system",
        name: "System Default (copy)",
        description: "Default pipeline",
        userId: "user_123",
        visibility: "PRIVATE",
        tier: "TIER_1K",
        analysisConfig: { enabled: true },
        autoCropConfig: { enabled: true },
        promptConfig: {},
        generationConfig: { retryAttempts: 3 },
        usageCount: 0,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      });

      const request = new NextRequest(
        "http://localhost:3000/api/pipelines/system_default/fork",
        {
          method: "POST",
        },
      );
      const response = await POST(request, createParams("system_default"));
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.pipeline.name).toBe("System Default (copy)");
      expect(data.forkedFrom).toBe("system_default");
    });

    it("forks LINK pipeline with valid token", async () => {
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
        tier: "TIER_4K",
        analysisConfig: { enabled: false },
        autoCropConfig: { enabled: false },
        promptConfig: {},
        generationConfig: {},
      });
      (prisma.enhancementPipeline.create as Mock).mockResolvedValue({
        id: "forked_link",
        name: "Link Pipeline (copy)",
        description: null,
        userId: "other_user",
        visibility: "PRIVATE",
        tier: "TIER_4K",
        analysisConfig: { enabled: false },
        autoCropConfig: { enabled: false },
        promptConfig: {},
        generationConfig: {},
        usageCount: 0,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      });

      const request = new NextRequest(
        "http://localhost:3000/api/pipelines/pipeline_1/fork?token=valid-token-123",
        { method: "POST" },
      );
      const response = await POST(request, createParams("pipeline_1"));
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.pipeline.name).toBe("Link Pipeline (copy)");
      expect(data.forkedFrom).toBe("pipeline_1");
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
      });

      const request = new NextRequest(
        "http://localhost:3000/api/pipelines/pipeline_1/fork?token=invalid-token",
        { method: "POST" },
      );
      const response = await POST(request, createParams("pipeline_1"));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Access denied");
    });

    it("uses custom name when provided", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.enhancementPipeline.findUnique as Mock).mockResolvedValue({
        id: "pipeline_1",
        name: "Original Pipeline",
        description: null,
        userId: "user_123",
        visibility: "PRIVATE",
        shareToken: null,
        tier: "TIER_1K",
        analysisConfig: null,
        autoCropConfig: null,
        promptConfig: null,
        generationConfig: null,
      });
      (prisma.enhancementPipeline.create as Mock).mockResolvedValue({
        id: "forked_pipeline",
        name: "My Custom Name",
        description: null,
        userId: "user_123",
        visibility: "PRIVATE",
        tier: "TIER_1K",
        analysisConfig: null,
        autoCropConfig: null,
        promptConfig: null,
        generationConfig: null,
        usageCount: 0,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      });

      const request = new NextRequest(
        "http://localhost:3000/api/pipelines/pipeline_1/fork",
        {
          method: "POST",
          body: JSON.stringify({ name: "  My Custom Name  " }),
        },
      );
      const response = await POST(request, createParams("pipeline_1"));
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.pipeline.name).toBe("My Custom Name");
      expect(prisma.enhancementPipeline.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "My Custom Name",
          }),
        }),
      );
    });

    it("uses default (copy) name when no body provided", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.enhancementPipeline.findUnique as Mock).mockResolvedValue({
        id: "pipeline_1",
        name: "Original",
        description: null,
        userId: "user_123",
        visibility: "PRIVATE",
        shareToken: null,
        tier: "TIER_1K",
        analysisConfig: null,
        autoCropConfig: null,
        promptConfig: null,
        generationConfig: null,
      });
      (prisma.enhancementPipeline.create as Mock).mockResolvedValue({
        id: "forked_pipeline",
        name: "Original (copy)",
        description: null,
        userId: "user_123",
        visibility: "PRIVATE",
        tier: "TIER_1K",
        analysisConfig: null,
        autoCropConfig: null,
        promptConfig: null,
        generationConfig: null,
        usageCount: 0,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      });

      // Request without body
      const request = new NextRequest(
        "http://localhost:3000/api/pipelines/pipeline_1/fork",
        {
          method: "POST",
        },
      );
      const response = await POST(request, createParams("pipeline_1"));
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.pipeline.name).toBe("Original (copy)");
    });

    it("forked pipeline is always PRIVATE", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.enhancementPipeline.findUnique as Mock).mockResolvedValue({
        id: "pipeline_1",
        name: "Public Source",
        description: null,
        userId: "other_user",
        visibility: "PUBLIC",
        shareToken: null,
        tier: "TIER_1K",
        analysisConfig: null,
        autoCropConfig: null,
        promptConfig: null,
        generationConfig: null,
      });
      (prisma.enhancementPipeline.create as Mock).mockResolvedValue({
        id: "forked_pipeline",
        name: "Public Source (copy)",
        description: null,
        userId: "user_123",
        visibility: "PRIVATE",
        tier: "TIER_1K",
        analysisConfig: null,
        autoCropConfig: null,
        promptConfig: null,
        generationConfig: null,
        usageCount: 0,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      });

      const request = new NextRequest(
        "http://localhost:3000/api/pipelines/pipeline_1/fork",
        {
          method: "POST",
        },
      );
      await POST(request, createParams("pipeline_1"));

      // Verify the create call includes PRIVATE visibility
      expect(prisma.enhancementPipeline.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            visibility: "PRIVATE",
          }),
        }),
      );
    });

    it("copies all config fields from source", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      const sourceConfigs = {
        analysisConfig: { enabled: false, temperature: 0.5 },
        autoCropConfig: { enabled: true, minCropRatio: 0.1 },
        promptConfig: {
          customInstructions: "Test",
          skipCorrections: ["isDark"],
        },
        generationConfig: { retryAttempts: 10 },
      };
      (prisma.enhancementPipeline.findUnique as Mock).mockResolvedValue({
        id: "pipeline_1",
        name: "Source",
        description: "Source description",
        userId: "user_123",
        visibility: "PRIVATE",
        shareToken: null,
        tier: "TIER_4K",
        ...sourceConfigs,
      });
      (prisma.enhancementPipeline.create as Mock).mockResolvedValue({
        id: "forked_pipeline",
        name: "Source (copy)",
        description: "Source description",
        userId: "user_123",
        visibility: "PRIVATE",
        tier: "TIER_4K",
        ...sourceConfigs,
        usageCount: 0,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      });

      const request = new NextRequest(
        "http://localhost:3000/api/pipelines/pipeline_1/fork",
        {
          method: "POST",
        },
      );
      await POST(request, createParams("pipeline_1"));

      expect(prisma.enhancementPipeline.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: "Source description",
            tier: "TIER_4K",
            analysisConfig: sourceConfigs.analysisConfig,
            autoCropConfig: sourceConfigs.autoCropConfig,
            promptConfig: sourceConfigs.promptConfig,
            generationConfig: sourceConfigs.generationConfig,
          }),
        }),
      );
    });

    it("returns 500 on database error", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.enhancementPipeline.findUnique as Mock).mockResolvedValue({
        id: "pipeline_1",
        name: "Source",
        description: null,
        userId: "user_123",
        visibility: "PRIVATE",
        shareToken: null,
        tier: "TIER_1K",
        analysisConfig: null,
        autoCropConfig: null,
        promptConfig: null,
        generationConfig: null,
      });
      (prisma.enhancementPipeline.create as Mock).mockRejectedValue(
        new Error("Database error"),
      );

      const request = new NextRequest(
        "http://localhost:3000/api/pipelines/pipeline_1/fork",
        {
          method: "POST",
        },
      );
      const response = await POST(request, createParams("pipeline_1"));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fork pipeline");
    });
  });
});
