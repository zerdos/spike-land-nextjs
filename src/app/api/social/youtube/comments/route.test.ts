
import { GET, POST, DELETE } from "./route";
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

const mockGetCommentThreads = vi.fn();
const mockReplyToComment = vi.fn();
const mockModerateComment = vi.fn();

vi.mock("@/lib/social/clients/youtube", () => {
  return {
    YouTubeClient: class {
      getCommentThreads = mockGetCommentThreads;
      replyToComment = mockReplyToComment;
      moderateComment = mockModerateComment;
    }
  };
});

import { auth } from "@/auth";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import { safeDecryptToken } from "@/lib/crypto/token-encryption";

describe("/api/social/youtube/comments", () => {
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
    it("should return comments", async () => {
      mockGetCommentThreads.mockResolvedValue({
        comments: [{ id: "c1", text: "hello" }],
      });

      const req = new NextRequest("http://localhost?accountId=acc1&videoId=vid1");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.comments).toHaveLength(1);
      expect(mockGetCommentThreads).toHaveBeenCalledWith("vid1", expect.anything());
    });

    it("should return 400 if missing params", async () => {
      const req = new NextRequest("http://localhost");
      const res = await GET(req);
      expect(res.status).toBe(400);
    });
  });

  describe("POST", () => {
    it("should reply to comment", async () => {
      mockReplyToComment.mockResolvedValue({ id: "r1", text: "reply" });

      const req = new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          accountId: "acc1",
          commentId: "c1",
          text: "reply text",
        }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.id).toBe("r1");
      expect(mockReplyToComment).toHaveBeenCalledWith("c1", "reply text");
    });
  });

  describe("DELETE", () => {
    it("should delete comment", async () => {
      mockModerateComment.mockResolvedValue(undefined);

      const req = new NextRequest("http://localhost?accountId=acc1&commentId=c1", {
        method: "DELETE",
      });
      const res = await DELETE(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockModerateComment).toHaveBeenCalledWith("c1", "delete");
    });
  });
});
