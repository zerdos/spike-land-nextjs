import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    workspaceMember: {
      findUnique: vi.fn(),
    },
    workspaceFavorite: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/workspace/aggregate-queries", () => ({
  toggleWorkspaceFavorite: vi.fn(),
}));

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { toggleWorkspaceFavorite } from "@/lib/workspace/aggregate-queries";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

const createMockRequest = () => {
  return new NextRequest("http://localhost/api/workspaces/ws_123/favorite");
};

const createParams = (workspaceId: string) => ({
  params: Promise.resolve({ workspaceId }),
});

describe("Workspace Favorite API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/workspaces/[workspaceId]/favorite", () => {
    it("returns 401 when user is not authenticated", async () => {
      (auth as Mock).mockResolvedValue(null);

      const response = await GET(createMockRequest(), createParams("ws_123"));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 404 when user has no access to workspace", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.workspaceMember.findUnique as Mock).mockResolvedValue(null);

      const response = await GET(createMockRequest(), createParams("ws_123"));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Workspace not found or access denied");
    });

    it("returns isFavorite: false when not favorited", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.workspaceMember.findUnique as Mock).mockResolvedValue({
        workspaceId: "ws_123",
        userId: "user_123",
      });
      (prisma.workspaceFavorite.findUnique as Mock).mockResolvedValue(null);

      const response = await GET(createMockRequest(), createParams("ws_123"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isFavorite).toBe(false);
      expect(data.favoritedAt).toBeNull();
    });

    it("returns isFavorite: true when favorited", async () => {
      const favoritedAt = new Date("2024-01-15");
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.workspaceMember.findUnique as Mock).mockResolvedValue({
        workspaceId: "ws_123",
        userId: "user_123",
      });
      (prisma.workspaceFavorite.findUnique as Mock).mockResolvedValue({
        userId: "user_123",
        workspaceId: "ws_123",
        createdAt: favoritedAt,
      });

      const response = await GET(createMockRequest(), createParams("ws_123"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isFavorite).toBe(true);
      expect(data.favoritedAt).toBe(favoritedAt.toISOString());
    });

    it("returns 500 when membership check fails", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.workspaceMember.findUnique as Mock).mockRejectedValue(
        new Error("Database error"),
      );

      const consoleError = vi.spyOn(console, "error").mockImplementation(
        () => {},
      );

      const response = await GET(createMockRequest(), createParams("ws_123"));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to check workspace access");

      consoleError.mockRestore();
    });

    it("returns 500 when favorite check fails", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.workspaceMember.findUnique as Mock).mockResolvedValue({
        workspaceId: "ws_123",
        userId: "user_123",
      });
      (prisma.workspaceFavorite.findUnique as Mock).mockRejectedValue(
        new Error("Database error"),
      );

      const consoleError = vi.spyOn(console, "error").mockImplementation(
        () => {},
      );

      const response = await GET(createMockRequest(), createParams("ws_123"));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to check favorite status");

      consoleError.mockRestore();
    });
  });

  describe("POST /api/workspaces/[workspaceId]/favorite", () => {
    it("returns 401 when user is not authenticated", async () => {
      (auth as Mock).mockResolvedValue(null);

      const response = await POST(createMockRequest(), createParams("ws_123"));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 404 when user has no access to workspace", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.workspaceMember.findUnique as Mock).mockResolvedValue(null);

      const response = await POST(createMockRequest(), createParams("ws_123"));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Workspace not found or access denied");
    });

    it("toggles favorite to true", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.workspaceMember.findUnique as Mock).mockResolvedValue({
        workspaceId: "ws_123",
        userId: "user_123",
      });
      (toggleWorkspaceFavorite as Mock).mockResolvedValue(true);

      const response = await POST(createMockRequest(), createParams("ws_123"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isFavorite).toBe(true);
      expect(data.message).toBe("Workspace added to favorites");
      expect(toggleWorkspaceFavorite).toHaveBeenCalledWith("user_123", "ws_123");
    });

    it("toggles favorite to false", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.workspaceMember.findUnique as Mock).mockResolvedValue({
        workspaceId: "ws_123",
        userId: "user_123",
      });
      (toggleWorkspaceFavorite as Mock).mockResolvedValue(false);

      const response = await POST(createMockRequest(), createParams("ws_123"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isFavorite).toBe(false);
      expect(data.message).toBe("Workspace removed from favorites");
    });

    it("returns 500 when toggle fails", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.workspaceMember.findUnique as Mock).mockResolvedValue({
        workspaceId: "ws_123",
        userId: "user_123",
      });
      (toggleWorkspaceFavorite as Mock).mockRejectedValue(
        new Error("Database error"),
      );

      const consoleError = vi.spyOn(console, "error").mockImplementation(
        () => {},
      );

      const response = await POST(createMockRequest(), createParams("ws_123"));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to toggle favorite status");

      consoleError.mockRestore();
    });
  });
});
