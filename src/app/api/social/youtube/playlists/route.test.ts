
import { GET, POST, PUT, DELETE } from "./route";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/permissions/workspace-middleware", () => ({
  requireWorkspacePermission: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    socialAccount: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/crypto/token-encryption", () => ({
  safeDecryptToken: vi.fn(),
}));

const mockGetPlaylists = vi.fn();
const mockCreatePlaylist = vi.fn();
const mockUpdatePlaylist = vi.fn();
const mockDeletePlaylist = vi.fn();

vi.mock("@/lib/social/clients/youtube", () => {
  return {
    YouTubeClient: class {
      getPlaylists = mockGetPlaylists;
      createPlaylist = mockCreatePlaylist;
      updatePlaylist = mockUpdatePlaylist;
      deletePlaylist = mockDeletePlaylist;
    }
  };
});

import { auth } from "@/auth";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import { safeDecryptToken } from "@/lib/crypto/token-encryption";

describe("/api/social/youtube/playlists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).mockResolvedValue({ user: { id: "user1" } });
    (requireWorkspacePermission as any).mockResolvedValue({ role: "ADMIN" });
    (safeDecryptToken as any).mockReturnValue("decrypted_token");
    (prisma.socialAccount.findUnique as any).mockResolvedValue({
      workspaceId: "ws1",
      status: "ACTIVE",
      accessTokenEncrypted: "encrypted",
    });
  });

  describe("GET", () => {
    it("should return playlists", async () => {
      mockGetPlaylists.mockResolvedValue({
        playlists: [{ id: "pl1", title: "My Playlist" }],
      });

      const req = new NextRequest("http://localhost?accountId=acc1");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.playlists).toHaveLength(1);
      expect(mockGetPlaylists).toHaveBeenCalled();
    });
  });

  describe("POST", () => {
    it("should create playlist", async () => {
      mockCreatePlaylist.mockResolvedValue({ id: "pl1", title: "My Playlist" });

      const req = new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          accountId: "acc1",
          title: "My Playlist",
        }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.id).toBe("pl1");
      expect(mockCreatePlaylist).toHaveBeenCalledWith("My Playlist", undefined, undefined);
    });
  });

  describe("PUT", () => {
    it("should update playlist", async () => {
      mockUpdatePlaylist.mockResolvedValue({ id: "pl1", title: "Updated" });

      const req = new NextRequest("http://localhost", {
        method: "PUT",
        body: JSON.stringify({
          accountId: "acc1",
          playlistId: "pl1",
          updates: { title: "Updated" },
        }),
      });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.title).toBe("Updated");
      expect(mockUpdatePlaylist).toHaveBeenCalledWith("pl1", { title: "Updated" });
    });
  });

  describe("DELETE", () => {
    it("should delete playlist", async () => {
      mockDeletePlaylist.mockResolvedValue(undefined);

      const req = new NextRequest("http://localhost?accountId=acc1&playlistId=pl1", {
        method: "DELETE",
      });
      const res = await DELETE(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockDeletePlaylist).toHaveBeenCalledWith("pl1");
    });
  });
});
