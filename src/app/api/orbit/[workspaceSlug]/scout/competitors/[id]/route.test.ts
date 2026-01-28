/**
 * Tests for Scout Competitor Individual Resource API
 *
 * Resolves #871
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, PUT } from "./route";

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
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { auth } from "@/auth";
import prisma from "@/lib/prisma";

describe("Scout Competitor Individual Resource API", () => {
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
      "http://localhost:3000/api/orbit/test-workspace/scout/competitors/comp-1",
      {
        method,
        ...(body ? { body: JSON.stringify(body) } : {}),
      },
    );
  };

  const mockParams = {
    params: Promise.resolve({ workspaceSlug: "test-workspace", id: "comp-1" }),
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

  const mockCompetitor = {
    id: "comp-1",
    workspaceId: "workspace-1",
    platform: "TWITTER",
    handle: "competitor1",
    name: "Competitor One",
    isActive: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-15"),
    posts: [
      {
        id: "post-1",
        content: "This is a test post with some content",
        postedAt: new Date("2024-01-14"),
        likes: 100,
        comments: 20,
        shares: 10,
      },
      {
        id: "post-2",
        content: "Another post here",
        postedAt: new Date("2024-01-13"),
        likes: 50,
        comments: 10,
        shares: 5,
      },
    ],
    _count: { posts: 2 },
  };

  describe("GET /api/orbit/[workspaceSlug]/scout/competitors/[id]", () => {
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

    it("should return 404 when competitor not found", async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce(
        mockWorkspace as never,
      );
      vi.mocked(prisma.scoutCompetitor.findFirst).mockResolvedValueOnce(null);

      const response = await GET(createMockRequest("GET"), mockParams);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Competitor not found");
    });

    it("should return competitor with metrics and posts", async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce(
        mockWorkspace as never,
      );
      vi.mocked(prisma.scoutCompetitor.findFirst).mockResolvedValueOnce(
        mockCompetitor as never,
      );

      const response = await GET(createMockRequest("GET"), mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe("comp-1");
      expect(data.platform).toBe("TWITTER");
      expect(data.handle).toBe("competitor1");
      expect(data.name).toBe("Competitor One");
      expect(data.isActive).toBe(true);
      expect(data.metrics.postsTracked).toBe(2);
      expect(data.metrics.totalLikes).toBe(150);
      expect(data.metrics.totalComments).toBe(30);
      expect(data.metrics.totalShares).toBe(15);
      expect(data.metrics.averageEngagement).toBe(97.5);
      expect(data.recentPosts).toHaveLength(2);
    });

    it("should return competitor with zero metrics when no posts", async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce(
        mockWorkspace as never,
      );
      vi.mocked(prisma.scoutCompetitor.findFirst).mockResolvedValueOnce({
        ...mockCompetitor,
        posts: [],
        _count: { posts: 0 },
      } as never);

      const response = await GET(createMockRequest("GET"), mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metrics.postsTracked).toBe(0);
      expect(data.metrics.totalLikes).toBe(0);
      expect(data.metrics.averageEngagement).toBe(0);
      expect(data.recentPosts).toEqual([]);
    });

    it("should truncate long post content", async () => {
      const longContent = "A".repeat(300);
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce(
        mockWorkspace as never,
      );
      vi.mocked(prisma.scoutCompetitor.findFirst).mockResolvedValueOnce({
        ...mockCompetitor,
        posts: [
          {
            id: "post-1",
            content: longContent,
            postedAt: new Date("2024-01-14"),
            likes: 100,
            comments: 20,
            shares: 10,
          },
        ],
        _count: { posts: 1 },
      } as never);

      const response = await GET(createMockRequest("GET"), mockParams);
      const data = await response.json();

      expect(data.recentPosts[0].content).toHaveLength(203);
      expect(data.recentPosts[0].content.endsWith("...")).toBe(true);
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

  describe("PUT /api/orbit/[workspaceSlug]/scout/competitors/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);

      const response = await PUT(
        createMockRequest("PUT", { name: "Updated Name" }),
        mockParams,
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 when workspace not found", async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce(null);

      const response = await PUT(
        createMockRequest("PUT", { name: "Updated Name" }),
        mockParams,
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Workspace not found");
    });

    it("should return 404 when competitor not found", async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce(
        mockWorkspace as never,
      );
      vi.mocked(prisma.scoutCompetitor.findFirst).mockResolvedValueOnce(null);

      const response = await PUT(
        createMockRequest("PUT", { name: "Updated Name" }),
        mockParams,
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Competitor not found");
    });

    it("should update competitor name", async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce(
        mockWorkspace as never,
      );
      vi.mocked(prisma.scoutCompetitor.findFirst).mockResolvedValueOnce(
        mockCompetitor as never,
      );
      vi.mocked(prisma.scoutCompetitor.update).mockResolvedValueOnce({
        ...mockCompetitor,
        name: "Updated Name",
        posts: undefined,
        _count: undefined,
      } as never);

      const response = await PUT(
        createMockRequest("PUT", { name: "Updated Name" }),
        mockParams,
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe("Updated Name");
      expect(prisma.scoutCompetitor.update).toHaveBeenCalledWith({
        where: { id: "comp-1" },
        data: { name: "Updated Name" },
      });
    });

    it("should update isActive status", async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce(
        mockWorkspace as never,
      );
      vi.mocked(prisma.scoutCompetitor.findFirst).mockResolvedValueOnce(
        mockCompetitor as never,
      );
      vi.mocked(prisma.scoutCompetitor.update).mockResolvedValueOnce({
        ...mockCompetitor,
        isActive: false,
        posts: undefined,
        _count: undefined,
      } as never);

      const response = await PUT(
        createMockRequest("PUT", { isActive: false }),
        mockParams,
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isActive).toBe(false);
      expect(prisma.scoutCompetitor.update).toHaveBeenCalledWith({
        where: { id: "comp-1" },
        data: { isActive: false },
      });
    });

    it("should update multiple fields", async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce(
        mockWorkspace as never,
      );
      vi.mocked(prisma.scoutCompetitor.findFirst).mockResolvedValueOnce(
        mockCompetitor as never,
      );
      vi.mocked(prisma.scoutCompetitor.update).mockResolvedValueOnce({
        ...mockCompetitor,
        name: "New Name",
        isActive: false,
        posts: undefined,
        _count: undefined,
      } as never);

      const response = await PUT(
        createMockRequest("PUT", { name: "New Name", isActive: false }),
        mockParams,
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe("New Name");
      expect(data.isActive).toBe(false);
    });

    it("should handle empty update", async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce(
        mockWorkspace as never,
      );
      vi.mocked(prisma.scoutCompetitor.findFirst).mockResolvedValueOnce(
        mockCompetitor as never,
      );
      vi.mocked(prisma.scoutCompetitor.update).mockResolvedValueOnce({
        ...mockCompetitor,
        posts: undefined,
        _count: undefined,
      } as never);

      const response = await PUT(createMockRequest("PUT", {}), mockParams);

      expect(response.status).toBe(200);
      expect(prisma.scoutCompetitor.update).toHaveBeenCalledWith({
        where: { id: "comp-1" },
        data: {},
      });
    });

    it("should return 400 for validation error", async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce(
        mockWorkspace as never,
      );
      vi.mocked(prisma.scoutCompetitor.findFirst).mockResolvedValueOnce(
        mockCompetitor as never,
      );

      const response = await PUT(
        createMockRequest("PUT", { name: "" }),
        mockParams,
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
      expect(data.details).toBeDefined();
    });

    it("should handle internal server error", async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(prisma.workspace.findFirst).mockRejectedValueOnce(
        new Error("DB error"),
      );

      const response = await PUT(
        createMockRequest("PUT", { name: "Test" }),
        mockParams,
      );
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal Server Error");
    });
  });

  describe("DELETE /api/orbit/[workspaceSlug]/scout/competitors/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);

      const response = await DELETE(createMockRequest("DELETE"), mockParams);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 when workspace not found", async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce(null);

      const response = await DELETE(createMockRequest("DELETE"), mockParams);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Workspace not found");
    });

    it("should return 404 when competitor not found", async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce(
        mockWorkspace as never,
      );
      vi.mocked(prisma.scoutCompetitor.findFirst).mockResolvedValueOnce(null);

      const response = await DELETE(createMockRequest("DELETE"), mockParams);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Competitor not found");
    });

    it("should delete competitor successfully", async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce(
        mockWorkspace as never,
      );
      vi.mocked(prisma.scoutCompetitor.findFirst).mockResolvedValueOnce(
        mockCompetitor as never,
      );
      vi.mocked(prisma.scoutCompetitor.delete).mockResolvedValueOnce(
        mockCompetitor as never,
      );

      const response = await DELETE(createMockRequest("DELETE"), mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.scoutCompetitor.delete).toHaveBeenCalledWith({
        where: { id: "comp-1" },
      });
    });

    it("should handle internal server error", async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession);
      vi.mocked(prisma.workspace.findFirst).mockRejectedValueOnce(
        new Error("DB error"),
      );

      const response = await DELETE(createMockRequest("DELETE"), mockParams);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal Server Error");
    });
  });
});
