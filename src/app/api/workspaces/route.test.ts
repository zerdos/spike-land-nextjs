import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    workspaceMember: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/workspace/aggregate-queries", () => ({
  getUserFavorites: vi.fn(),
  getUserRecentWorkspaces: vi.fn(),
}));

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { getUserFavorites, getUserRecentWorkspaces } from "@/lib/workspace/aggregate-queries";
import { GET } from "./route";

describe("Workspaces API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set defaults for the new functions
    (getUserFavorites as Mock).mockResolvedValue([]);
    (getUserRecentWorkspaces as Mock).mockResolvedValue([]);
  });

  describe("GET /api/workspaces", () => {
    it("returns 401 when user is not authenticated", async () => {
      (auth as Mock).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 401 when session has no user id", async () => {
      (auth as Mock).mockResolvedValue({
        user: { email: "test@example.com" },
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns empty workspaces array when user has no workspaces", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.workspaceMember.findMany as Mock).mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.workspaces).toEqual([]);
      expect(data.favorites).toEqual([]);
      expect(data.recentIds).toEqual([]);
    });

    it("returns workspaces with role and isFavorite for authenticated user", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.workspaceMember.findMany as Mock).mockResolvedValue([
        {
          role: "OWNER",
          workspace: {
            id: "ws_1",
            name: "Personal Workspace",
            slug: "personal-workspace",
            description: "My personal workspace",
            avatarUrl: "https://example.com/avatar.jpg",
            isPersonal: true,
          },
        },
        {
          role: "MEMBER",
          workspace: {
            id: "ws_2",
            name: "Team Workspace",
            slug: "team-workspace",
            description: null,
            avatarUrl: null,
            isPersonal: false,
          },
        },
      ]);
      (getUserFavorites as Mock).mockResolvedValue(["ws_1"]);
      (getUserRecentWorkspaces as Mock).mockResolvedValue(["ws_2", "ws_1"]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.workspaces).toHaveLength(2);
      expect(data.favorites).toEqual(["ws_1"]);
      expect(data.recentIds).toEqual(["ws_2", "ws_1"]);

      expect(data.workspaces[0]).toEqual({
        id: "ws_1",
        name: "Personal Workspace",
        slug: "personal-workspace",
        description: "My personal workspace",
        avatarUrl: "https://example.com/avatar.jpg",
        isPersonal: true,
        role: "OWNER",
        isFavorite: true,
      });

      expect(data.workspaces[1]).toEqual({
        id: "ws_2",
        name: "Team Workspace",
        slug: "team-workspace",
        description: null,
        avatarUrl: null,
        isPersonal: false,
        role: "MEMBER",
        isFavorite: false,
      });
    });

    it("queries with correct where clause for joined memberships", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.workspaceMember.findMany as Mock).mockResolvedValue([]);

      await GET();

      expect(prisma.workspaceMember.findMany).toHaveBeenCalledWith({
        where: {
          userId: "user_123",
          joinedAt: { not: null },
        },
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
              avatarUrl: true,
              isPersonal: true,
            },
          },
        },
        orderBy: [
          { workspace: { isPersonal: "desc" } },
          { workspace: { name: "asc" } },
        ],
      });
    });

    it("fetches favorites and recents in parallel", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.workspaceMember.findMany as Mock).mockResolvedValue([]);

      await GET();

      expect(getUserFavorites).toHaveBeenCalledWith("user_123");
      expect(getUserRecentWorkspaces).toHaveBeenCalledWith("user_123", 10);
    });

    it("returns 500 when database query fails", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.workspaceMember.findMany as Mock).mockRejectedValue(
        new Error("Database error"),
      );

      const consoleError = vi.spyOn(console, "error").mockImplementation(
        () => {},
      );

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch workspaces");
      expect(consoleError).toHaveBeenCalledWith(
        "Failed to fetch workspaces:",
        expect.any(Error),
      );

      consoleError.mockRestore();
    });

    it("continues without favorites/recents when they fail", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.workspaceMember.findMany as Mock).mockResolvedValue([
        {
          role: "OWNER",
          workspace: {
            id: "ws_1",
            name: "Test",
            slug: "test",
            description: null,
            avatarUrl: null,
            isPersonal: true,
          },
        },
      ]);
      (getUserFavorites as Mock).mockRejectedValue(new Error("Failed"));
      (getUserRecentWorkspaces as Mock).mockRejectedValue(new Error("Failed"));

      const consoleError = vi.spyOn(console, "error").mockImplementation(
        () => {},
      );

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.workspaces).toHaveLength(1);
      expect(data.favorites).toEqual([]);
      expect(data.recentIds).toEqual([]);
      expect(consoleError).toHaveBeenCalledTimes(2);

      consoleError.mockRestore();
    });

    it("handles workspaces with all role types", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.workspaceMember.findMany as Mock).mockResolvedValue([
        {
          role: "OWNER",
          workspace: {
            id: "ws_1",
            name: "Owner WS",
            slug: "owner",
            description: null,
            avatarUrl: null,
            isPersonal: true,
          },
        },
        {
          role: "ADMIN",
          workspace: {
            id: "ws_2",
            name: "Admin WS",
            slug: "admin",
            description: null,
            avatarUrl: null,
            isPersonal: false,
          },
        },
        {
          role: "MEMBER",
          workspace: {
            id: "ws_3",
            name: "Member WS",
            slug: "member",
            description: null,
            avatarUrl: null,
            isPersonal: false,
          },
        },
        {
          role: "VIEWER",
          workspace: {
            id: "ws_4",
            name: "Viewer WS",
            slug: "viewer",
            description: null,
            avatarUrl: null,
            isPersonal: false,
          },
        },
      ]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.workspaces).toHaveLength(4);
      expect(data.workspaces.map((w: { role: string; }) => w.role)).toEqual([
        "OWNER",
        "ADMIN",
        "MEMBER",
        "VIEWER",
      ]);
    });
  });
});
