/**
 * Tests for Scout Competitors Collection API
 *
 * Resolves #871
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    workspace: {
      findFirst: vi.fn(),
    },
    scoutCompetitor: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock competitor tracker
vi.mock("@/lib/scout/competitor-tracker", () => ({
  addCompetitor: vi.fn(),
}));

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { addCompetitor } from "@/lib/scout/competitor-tracker";

describe("Scout Competitors Collection API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createMockRequest = (
    method: string,
    body?: unknown,
  ) => {
    return new NextRequest(
      "http://localhost:3000/api/orbit/test-workspace/scout/competitors",
      {
        method,
        ...(body ? { body: JSON.stringify(body) } : {}),
      },
    );
  };

  const mockParams = {
    params: Promise.resolve({ workspaceSlug: "test-workspace" }),
  };

  const mockSession = {
    user: {
      id: "user-1",
      email: "test@example.com",
      role: "USER" as const,
    },
    expires: new Date().toISOString(),
  };

  const mockWorkspace = {
    id: "workspace-1",
    slug: "test-workspace",
    name: "Test Workspace",
  };

  describe("GET /api/orbit/[workspaceSlug]/scout/competitors", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);

      const response = await GET(createMockRequest("GET"), mockParams);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 when workspace not found", async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce(null);

      const response = await GET(createMockRequest("GET"), mockParams);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Workspace not found");
    });

    it("should return empty list when no competitors", async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce(
        mockWorkspace as never,
      );
      vi.mocked(prisma.scoutCompetitor.findMany).mockResolvedValueOnce([]);

      const response = await GET(createMockRequest("GET"), mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });

    it("should return competitors list with metrics", async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce(
        mockWorkspace as never,
      );
      vi.mocked(prisma.scoutCompetitor.findMany).mockResolvedValueOnce([
        {
          id: "comp-1",
          workspaceId: "workspace-1",
          platform: "TWITTER",
          handle: "competitor1",
          name: "Competitor One",
          isActive: true,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-15"),
          _count: { posts: 10 },
        },
        {
          id: "comp-2",
          workspaceId: "workspace-1",
          platform: "LINKEDIN",
          handle: "competitor2",
          name: "Competitor Two",
          isActive: false,
          createdAt: new Date("2024-01-02"),
          updatedAt: new Date("2024-01-16"),
          _count: { posts: 5 },
        },
      ] as never);

      const response = await GET(createMockRequest("GET"), mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(data[0].id).toBe("comp-1");
      expect(data[0].platform).toBe("TWITTER");
      expect(data[0].handle).toBe("competitor1");
      expect(data[0].name).toBe("Competitor One");
      expect(data[0].isActive).toBe(true);
      expect(data[0].metrics.postsTracked).toBe(10);
      expect(data[1].metrics.postsTracked).toBe(5);
    });

    it("should handle internal server error", async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(prisma.workspace.findFirst).mockRejectedValueOnce(
        new Error("DB error"),
      );

      const response = await GET(createMockRequest("GET"), mockParams);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal Server Error");
    });
  });

  describe("POST /api/orbit/[workspaceSlug]/scout/competitors", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);

      const response = await POST(
        createMockRequest("POST", {
          platform: "TWITTER",
          handle: "testhandle",
        }),
        mockParams,
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 when workspace not found", async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce(null);

      const response = await POST(
        createMockRequest("POST", {
          platform: "TWITTER",
          handle: "testhandle",
        }),
        mockParams,
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Workspace not found");
    });

    it("should create competitor with legacy format", async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce(
        mockWorkspace as never,
      );
      vi.mocked(addCompetitor).mockResolvedValueOnce({
        id: "comp-1",
        workspaceId: "workspace-1",
        platform: "TWITTER",
        handle: "testhandle",
        name: "Test Handle",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const response = await POST(
        createMockRequest("POST", {
          platform: "TWITTER",
          handle: "testhandle",
        }),
        mockParams,
      );
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBe("comp-1");
      expect(data.platform).toBe("TWITTER");
      expect(data.handle).toBe("testhandle");
      expect(addCompetitor).toHaveBeenCalledWith(
        "workspace-1",
        "TWITTER",
        "testhandle",
      );
    });

    it("should strip @ from handle in legacy format", async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce(
        mockWorkspace as never,
      );
      vi.mocked(addCompetitor).mockResolvedValueOnce({
        id: "comp-1",
        workspaceId: "workspace-1",
        platform: "TWITTER",
        handle: "testhandle",
        name: "Test Handle",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const response = await POST(
        createMockRequest("POST", {
          platform: "TWITTER",
          handle: "@testhandle",
        }),
        mockParams,
      );

      expect(response.status).toBe(201);
      expect(addCompetitor).toHaveBeenCalledWith(
        "workspace-1",
        "TWITTER",
        "testhandle",
      );
    });

    it("should create competitor with new format", async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce(
        mockWorkspace as never,
      );
      vi.mocked(addCompetitor).mockResolvedValueOnce({
        id: "comp-1",
        workspaceId: "workspace-1",
        platform: "TWITTER",
        handle: "acmecorp",
        name: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);
      vi.mocked(prisma.scoutCompetitor.update).mockResolvedValueOnce({
        id: "comp-1",
        workspaceId: "workspace-1",
        platform: "TWITTER",
        handle: "acmecorp",
        name: "Acme Corp",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const response = await POST(
        createMockRequest("POST", {
          name: "Acme Corp",
          socialHandles: {
            twitter: "acmecorp",
          },
        }),
        mockParams,
      );
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.competitor.name).toBe("Acme Corp");
      expect(data.allCompetitors).toHaveLength(1);
    });

    it("should create multiple competitors with multiple handles", async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce(
        mockWorkspace as never,
      );

      // First handle (twitter)
      vi.mocked(addCompetitor).mockResolvedValueOnce({
        id: "comp-1",
        workspaceId: "workspace-1",
        platform: "TWITTER",
        handle: "acmecorp",
        name: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);
      vi.mocked(prisma.scoutCompetitor.update).mockResolvedValueOnce({
        id: "comp-1",
        workspaceId: "workspace-1",
        platform: "TWITTER",
        handle: "acmecorp",
        name: "Acme Corp",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      // Second handle (linkedin)
      vi.mocked(addCompetitor).mockResolvedValueOnce({
        id: "comp-2",
        workspaceId: "workspace-1",
        platform: "LINKEDIN",
        handle: "acme-corp",
        name: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);
      vi.mocked(prisma.scoutCompetitor.update).mockResolvedValueOnce({
        id: "comp-2",
        workspaceId: "workspace-1",
        platform: "LINKEDIN",
        handle: "acme-corp",
        name: "Acme Corp",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const response = await POST(
        createMockRequest("POST", {
          name: "Acme Corp",
          website: "https://acme.com",
          socialHandles: {
            twitter: "acmecorp",
            linkedin: "acme-corp",
          },
        }),
        mockParams,
      );
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.allCompetitors).toHaveLength(2);
      expect(data.website).toBe("https://acme.com");
    });

    it("should return 400 when addCompetitor fails in legacy format", async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce(
        mockWorkspace as never,
      );
      vi.mocked(addCompetitor).mockResolvedValueOnce(null);

      const response = await POST(
        createMockRequest("POST", {
          platform: "TWITTER",
          handle: "invalid",
        }),
        mockParams,
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Failed to validate or add competitor");
    });

    it("should return 400 when all handles fail in new format", async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce(
        mockWorkspace as never,
      );
      vi.mocked(addCompetitor).mockResolvedValueOnce(null);

      const response = await POST(
        createMockRequest("POST", {
          name: "Acme Corp",
          socialHandles: {
            twitter: "invalid",
          },
        }),
        mockParams,
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Failed to add any competitors");
    });

    it("should return 400 with validation errors for invalid request", async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce(
        mockWorkspace as never,
      );

      const response = await POST(
        createMockRequest("POST", {
          invalidField: "test",
        }),
        mockParams,
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid request body");
      expect(data.details).toBeDefined();
    });

    it("should return 400 for invalid platform in legacy format", async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce(
        mockWorkspace as never,
      );

      const response = await POST(
        createMockRequest("POST", {
          platform: "INVALID",
          handle: "testhandle",
        }),
        mockParams,
      );

      expect(response.status).toBe(400);
    });

    it("should return 400 for empty social handles", async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce(
        mockWorkspace as never,
      );

      const response = await POST(
        createMockRequest("POST", {
          name: "Acme Corp",
          socialHandles: {},
        }),
        mockParams,
      );

      expect(response.status).toBe(400);
    });

    it("should handle internal server error", async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(prisma.workspace.findFirst).mockRejectedValueOnce(
        new Error("DB error"),
      );

      const response = await POST(
        createMockRequest("POST", {
          platform: "TWITTER",
          handle: "testhandle",
        }),
        mockParams,
      );
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal Server Error");
    });
  });
});
