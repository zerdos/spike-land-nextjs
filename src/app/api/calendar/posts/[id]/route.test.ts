/**
 * Calendar Post Detail API Route Tests
 *
 * Part of #574: Build Calendar UI
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/calendar", () => ({
  getScheduledPost: vi.fn(),
  updateScheduledPost: vi.fn(),
  deleteScheduledPost: vi.fn(),
}));

vi.mock("@/lib/permissions/workspace-middleware", () => ({
  requireWorkspaceMembership: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    scheduledPost: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/try-catch", () => ({
  tryCatch: vi.fn(async (fn: () => Promise<unknown>) => {
    try {
      const data = await fn;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }),
}));

import { auth } from "@/auth";
import { deleteScheduledPost, getScheduledPost, updateScheduledPost } from "@/lib/calendar";
import { requireWorkspaceMembership } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import { createMockSession } from "@/test-utils";
import { DELETE, GET, PATCH } from "./route";

describe("Calendar Post Detail API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/calendar/posts/[id]", () => {
    it("should return 401 if not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/calendar/posts/post-1",
      );

      const response = await GET(request, { params: Promise.resolve({ id: "post-1" }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 if post not found", async () => {
      vi.mocked(auth).mockResolvedValue(createMockSession({ id: "user-123" }));
      vi.mocked(prisma.scheduledPost.findUnique).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/calendar/posts/post-1",
      );

      const response = await GET(request, { params: Promise.resolve({ id: "post-1" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Post not found");
    });

    it("should return post on success", async () => {
      vi.mocked(auth).mockResolvedValue(createMockSession({ id: "user-123" }));
      vi.mocked(prisma.scheduledPost.findUnique).mockResolvedValue({
        id: "post-1",
        workspaceId: "ws-123",
      } as never);
      vi.mocked(requireWorkspaceMembership).mockResolvedValue(undefined as never);

      const mockPost = {
        id: "post-1",
        content: "Test content",
        scheduledAt: new Date(),
        status: "SCHEDULED" as const,
        workspaceId: "ws-123",
        accounts: [],
      };
      vi.mocked(getScheduledPost).mockResolvedValue(mockPost as never);

      const request = new NextRequest(
        "http://localhost/api/calendar/posts/post-1",
      );

      const response = await GET(request, { params: Promise.resolve({ id: "post-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe("post-1");
    });
  });

  describe("PATCH /api/calendar/posts/[id]", () => {
    it("should return 401 if not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/calendar/posts/post-1",
        {
          method: "PATCH",
          body: JSON.stringify({ content: "Updated content" }),
        },
      );

      const response = await PATCH(request, { params: Promise.resolve({ id: "post-1" }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 for invalid JSON body", async () => {
      vi.mocked(auth).mockResolvedValue(createMockSession({ id: "user-123" }));

      const request = new NextRequest(
        "http://localhost/api/calendar/posts/post-1",
        {
          method: "PATCH",
          body: "invalid json",
        },
      );

      const response = await PATCH(request, { params: Promise.resolve({ id: "post-1" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid JSON body");
    });

    it("should return 404 if post not found", async () => {
      vi.mocked(auth).mockResolvedValue(createMockSession({ id: "user-123" }));
      vi.mocked(prisma.scheduledPost.findUnique).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/calendar/posts/post-1",
        {
          method: "PATCH",
          body: JSON.stringify({ content: "Updated content" }),
        },
      );

      const response = await PATCH(request, { params: Promise.resolve({ id: "post-1" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Post not found");
    });

    it("should return 400 if scheduledAt is in the past", async () => {
      vi.mocked(auth).mockResolvedValue(createMockSession({ id: "user-123" }));
      vi.mocked(prisma.scheduledPost.findUnique).mockResolvedValue({
        id: "post-1",
        workspaceId: "ws-123",
      } as never);
      vi.mocked(requireWorkspaceMembership).mockResolvedValue(undefined as never);

      const request = new NextRequest(
        "http://localhost/api/calendar/posts/post-1",
        {
          method: "PATCH",
          body: JSON.stringify({
            scheduledAt: new Date(Date.now() - 86400000).toISOString(),
          }),
        },
      );

      const response = await PATCH(request, { params: Promise.resolve({ id: "post-1" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Scheduled time must be in the future");
    });

    it("should update post on success", async () => {
      vi.mocked(auth).mockResolvedValue(createMockSession({ id: "user-123" }));
      vi.mocked(prisma.scheduledPost.findUnique).mockResolvedValue({
        id: "post-1",
        workspaceId: "ws-123",
      } as never);
      vi.mocked(requireWorkspaceMembership).mockResolvedValue(undefined as never);

      const mockUpdatedPost = {
        id: "post-1",
        content: "Updated content",
        scheduledAt: new Date(),
        status: "SCHEDULED" as const,
        workspaceId: "ws-123",
        accounts: [],
      };
      vi.mocked(updateScheduledPost).mockResolvedValue(mockUpdatedPost as never);

      const request = new NextRequest(
        "http://localhost/api/calendar/posts/post-1",
        {
          method: "PATCH",
          body: JSON.stringify({ content: "Updated content" }),
        },
      );

      const response = await PATCH(request, { params: Promise.resolve({ id: "post-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.content).toBe("Updated content");
      expect(updateScheduledPost).toHaveBeenCalled();
    });
  });

  describe("DELETE /api/calendar/posts/[id]", () => {
    it("should return 401 if not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/calendar/posts/post-1",
        { method: "DELETE" },
      );

      const response = await DELETE(request, { params: Promise.resolve({ id: "post-1" }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 if post not found", async () => {
      vi.mocked(auth).mockResolvedValue(createMockSession({ id: "user-123" }));
      vi.mocked(prisma.scheduledPost.findUnique).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/calendar/posts/post-1",
        { method: "DELETE" },
      );

      const response = await DELETE(request, { params: Promise.resolve({ id: "post-1" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Post not found");
    });

    it("should delete post on success", async () => {
      vi.mocked(auth).mockResolvedValue(createMockSession({ id: "user-123" }));
      vi.mocked(prisma.scheduledPost.findUnique).mockResolvedValue({
        id: "post-1",
        workspaceId: "ws-123",
      } as never);
      vi.mocked(requireWorkspaceMembership).mockResolvedValue(undefined as never);
      vi.mocked(deleteScheduledPost).mockResolvedValue(undefined);

      const request = new NextRequest(
        "http://localhost/api/calendar/posts/post-1",
        { method: "DELETE" },
      );

      const response = await DELETE(request, { params: Promise.resolve({ id: "post-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(deleteScheduledPost).toHaveBeenCalled();
    });
  });
});
