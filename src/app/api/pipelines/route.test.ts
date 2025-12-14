import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { GET, POST } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    enhancementPipeline: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock crypto.randomUUID for share token generation
const mockRandomUUID = vi.fn(() => "test-share-token-uuid");
vi.stubGlobal("crypto", { randomUUID: mockRandomUUID });

import { auth } from "@/auth";
import prisma from "@/lib/prisma";

describe("Pipelines API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/pipelines", () => {
    it("returns 401 when user is not authenticated", async () => {
      (auth as Mock).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns empty array when no pipelines match", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.enhancementPipeline.findMany as Mock).mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pipelines).toEqual([]);
    });

    it("returns user's own pipelines with isOwner flag", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.enhancementPipeline.findMany as Mock).mockResolvedValue([
        {
          id: "pipeline_1",
          name: "My Pipeline",
          description: "Test description",
          userId: "user_123",
          visibility: "PRIVATE",
          tier: "TIER_1K",
          usageCount: 5,
          createdAt: new Date("2025-01-01"),
          updatedAt: new Date("2025-01-01"),
          analysisConfig: { enabled: true },
          autoCropConfig: { enabled: true },
          promptConfig: {},
          generationConfig: { retryAttempts: 3 },
        },
      ]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pipelines).toHaveLength(1);
      expect(data.pipelines[0].name).toBe("My Pipeline");
      expect(data.pipelines[0].isOwner).toBe(true);
      expect(data.pipelines[0].isSystemDefault).toBe(false);
    });

    it("returns public pipelines from others with isOwner false", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.enhancementPipeline.findMany as Mock).mockResolvedValue([
        {
          id: "pipeline_2",
          name: "Public Pipeline",
          description: null,
          userId: "other_user",
          visibility: "PUBLIC",
          tier: "TIER_2K",
          usageCount: 100,
          createdAt: new Date("2025-01-01"),
          updatedAt: new Date("2025-01-01"),
          analysisConfig: null,
          autoCropConfig: null,
          promptConfig: null,
          generationConfig: null,
        },
      ]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pipelines[0].isOwner).toBe(false);
      expect(data.pipelines[0].isSystemDefault).toBe(false);
    });

    it("returns system defaults with isSystemDefault flag", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.enhancementPipeline.findMany as Mock).mockResolvedValue([
        {
          id: "system_default",
          name: "System Default",
          description: "Default pipeline",
          userId: null,
          visibility: "PUBLIC",
          tier: "TIER_1K",
          usageCount: 1000,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          analysisConfig: { enabled: true },
          autoCropConfig: { enabled: true },
          promptConfig: {},
          generationConfig: { retryAttempts: 3 },
        },
      ]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pipelines[0].isOwner).toBe(false);
      expect(data.pipelines[0].isSystemDefault).toBe(true);
    });

    it("returns 500 on database error", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.enhancementPipeline.findMany as Mock).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to list pipelines");
    });
  });

  describe("POST /api/pipelines", () => {
    it("returns 401 when user is not authenticated", async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/pipelines", {
        method: "POST",
        body: JSON.stringify({ name: "Test Pipeline" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 400 when name is missing", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });

      const request = new NextRequest("http://localhost:3000/api/pipelines", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Pipeline name is required");
    });

    it("returns 400 when name is empty", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });

      const request = new NextRequest("http://localhost:3000/api/pipelines", {
        method: "POST",
        body: JSON.stringify({ name: "   " }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Pipeline name is required");
    });

    it("returns 400 when name exceeds 100 characters", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });

      const request = new NextRequest("http://localhost:3000/api/pipelines", {
        method: "POST",
        body: JSON.stringify({ name: "a".repeat(101) }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Pipeline name must be 100 characters or less");
    });

    it("returns 400 for invalid tier", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });

      const request = new NextRequest("http://localhost:3000/api/pipelines", {
        method: "POST",
        body: JSON.stringify({ name: "Test Pipeline", tier: "INVALID_TIER" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid tier. Must be one of: TIER_1K, TIER_2K, TIER_4K");
    });

    it("returns 400 for invalid visibility", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });

      const request = new NextRequest("http://localhost:3000/api/pipelines", {
        method: "POST",
        body: JSON.stringify({ name: "Test Pipeline", visibility: "INVALID" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid visibility. Must be one of: PRIVATE, PUBLIC, LINK");
    });

    it("creates pipeline successfully with defaults", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.enhancementPipeline.create as Mock).mockResolvedValue({
        id: "pipeline_1",
        name: "Test Pipeline",
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
        updatedAt: new Date("2025-01-01"),
      });

      const request = new NextRequest("http://localhost:3000/api/pipelines", {
        method: "POST",
        body: JSON.stringify({ name: "Test Pipeline" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.pipeline.name).toBe("Test Pipeline");
      expect(data.pipeline.visibility).toBe("PRIVATE");
      expect(data.pipeline.tier).toBe("TIER_1K");
      expect(data.pipeline.shareToken).toBeNull();
    });

    it("creates pipeline with custom configs", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });

      const customConfigs = {
        analysisConfig: { enabled: false },
        autoCropConfig: { enabled: false, minCropRatio: 0.1 },
        promptConfig: { customInstructions: "Custom instructions" },
        generationConfig: { retryAttempts: 5 },
      };

      (prisma.enhancementPipeline.create as Mock).mockResolvedValue({
        id: "pipeline_1",
        name: "Custom Pipeline",
        description: "A custom pipeline",
        userId: "user_123",
        visibility: "PRIVATE",
        shareToken: null,
        tier: "TIER_4K",
        ...customConfigs,
        usageCount: 0,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      });

      const request = new NextRequest("http://localhost:3000/api/pipelines", {
        method: "POST",
        body: JSON.stringify({
          name: "Custom Pipeline",
          description: "A custom pipeline",
          tier: "TIER_4K",
          ...customConfigs,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.pipeline.tier).toBe("TIER_4K");
      expect(data.pipeline.analysisConfig).toEqual({ enabled: false });
    });

    it("generates shareToken for LINK visibility", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.enhancementPipeline.create as Mock).mockResolvedValue({
        id: "pipeline_1",
        name: "Link Pipeline",
        description: null,
        userId: "user_123",
        visibility: "LINK",
        shareToken: "test-share-token-uuid",
        tier: "TIER_1K",
        analysisConfig: { enabled: true },
        autoCropConfig: { enabled: true },
        promptConfig: {},
        generationConfig: { retryAttempts: 3 },
        usageCount: 0,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      });

      const request = new NextRequest("http://localhost:3000/api/pipelines", {
        method: "POST",
        body: JSON.stringify({ name: "Link Pipeline", visibility: "LINK" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.pipeline.visibility).toBe("LINK");
      expect(data.pipeline.shareToken).toBe("test-share-token-uuid");
    });

    it("creates public pipeline without shareToken", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.enhancementPipeline.create as Mock).mockResolvedValue({
        id: "pipeline_1",
        name: "Public Pipeline",
        description: null,
        userId: "user_123",
        visibility: "PUBLIC",
        shareToken: null,
        tier: "TIER_2K",
        analysisConfig: { enabled: true },
        autoCropConfig: { enabled: true },
        promptConfig: {},
        generationConfig: { retryAttempts: 3 },
        usageCount: 0,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      });

      const request = new NextRequest("http://localhost:3000/api/pipelines", {
        method: "POST",
        body: JSON.stringify({ name: "Public Pipeline", visibility: "PUBLIC", tier: "TIER_2K" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.pipeline.visibility).toBe("PUBLIC");
      expect(data.pipeline.shareToken).toBeNull();
    });

    it("trims name and description", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.enhancementPipeline.create as Mock).mockResolvedValue({
        id: "pipeline_1",
        name: "Trimmed Name",
        description: "Trimmed description",
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
        updatedAt: new Date("2025-01-01"),
      });

      const request = new NextRequest("http://localhost:3000/api/pipelines", {
        method: "POST",
        body: JSON.stringify({
          name: "  Trimmed Name  ",
          description: "  Trimmed description  ",
        }),
      });

      await POST(request);

      expect(prisma.enhancementPipeline.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Trimmed Name",
            description: "Trimmed description",
          }),
        }),
      );
    });

    it("returns 500 on database error", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.enhancementPipeline.create as Mock).mockRejectedValue(
        new Error("Database error"),
      );

      const request = new NextRequest("http://localhost:3000/api/pipelines", {
        method: "POST",
        body: JSON.stringify({ name: "Test Pipeline" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to create pipeline");
    });
  });
});
