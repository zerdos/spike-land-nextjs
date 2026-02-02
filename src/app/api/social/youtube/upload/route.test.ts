
import { POST } from "./route";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/crypto/token-encryption", () => ({
  safeDecryptToken: vi.fn(),
}));

const mockInitiate = vi.fn();
vi.mock("@/lib/social/youtube/resumable-uploader", () => {
  return {
    YouTubeResumableUploader: class {
      initiate = mockInitiate;
    }
  };
});

import { auth } from "@/auth";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import { safeDecryptToken } from "@/lib/crypto/token-encryption";

describe("POST /api/social/youtube/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).mockResolvedValue({ user: { id: "user1" } });
    (requireWorkspacePermission as any).mockResolvedValue({ role: "ADMIN" });
    (safeDecryptToken as any).mockReturnValue("decrypted_token");
    mockInitiate.mockResolvedValue({ uploadUrl: "http://upload", sessionId: "session1" });
  });

  const validBody = {
    workspaceId: "ws1",
    accountId: "acc1",
    metadata: {
      title: "Test Video",
      privacyStatus: "private",
    },
    fileSize: 1000,
  };

  it("should return 401 if unauthorized", async () => {
    (auth as any).mockResolvedValue(null);
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify(validBody),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it("should return 400 if missing fields", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it("should return 403 if account is not active", async () => {
    (prisma.socialAccount.findFirst as any).mockResolvedValue({
      status: "EXPIRED",
    });
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify(validBody),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(403);
  });

  it("should return 404 if account not found", async () => {
    (prisma.socialAccount.findFirst as any).mockResolvedValue(null);
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify(validBody),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(404);
  });

  it("should return 200 with upload url on success", async () => {
    (prisma.socialAccount.findFirst as any).mockResolvedValue({
      status: "ACTIVE",
      accessTokenEncrypted: "encrypted",
    });

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify(validBody),
    });
    const res = await POST(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.uploadUrl).toBe("http://upload");
    expect(data.sessionId).toBe("session1");
    expect(mockInitiate).toHaveBeenCalledWith("decrypted_token", expect.objectContaining({
      title: "Test Video"
    }));
  });
});
