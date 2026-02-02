import { auth } from "@/auth";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import { getValidAccessToken } from "@/lib/social/token-refresh";
import { YouTubeResumableUploader } from "@/lib/social/youtube/resumable-uploader";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

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

vi.mock("@/lib/social/token-refresh", () => ({
  getValidAccessToken: vi.fn(),
}));

vi.mock("@/lib/social/youtube/resumable-uploader", () => {
  return {
    YouTubeResumableUploader: vi.fn().mockImplementation(function() {
      return {
        initiate: vi.fn(),
      };
    }),
  };
});

describe("YouTube Upload Route", () => {
  const mockSession = { user: { id: "user1" } };
  const mockBody = {
    workspaceId: "ws1",
    accountId: "acc1",
    metadata: {
      title: "Test Video",
      description: "Test Description",
      tags: ["test"],
      categoryId: "22",
      privacyStatus: "private",
    },
    fileSize: 1024,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (body: any) => {
    return new NextRequest("http://localhost:3000/api/social/youtube/upload", {
      method: "POST",
      body: JSON.stringify(body),
    });
  };

  it("should return 401 if unauthorized", async () => {
    (auth as any).mockResolvedValue(null);
    const req = createRequest(mockBody);
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should return 400 if JSON body is invalid", async () => {
    (auth as any).mockResolvedValue(mockSession);
    const req = new NextRequest("http://localhost:3000/api/social/youtube/upload", {
      method: "POST",
      body: "{ invalid json }",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should return 400 if required fields are missing", async () => {
    (auth as any).mockResolvedValue(mockSession);
    const req = createRequest({ ...mockBody, workspaceId: undefined });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should return 403 if permission denied", async () => {
    (auth as any).mockResolvedValue(mockSession);
    (requireWorkspacePermission as any).mockRejectedValue(new Error("Forbidden"));
    const req = createRequest(mockBody);
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("should return 404 if account not found", async () => {
    (auth as any).mockResolvedValue(mockSession);
    (requireWorkspacePermission as any).mockResolvedValue(true);
    (prisma.socialAccount.findUnique as any).mockResolvedValue(null);
    const req = createRequest(mockBody);
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("should return 401 if token retrieval fails", async () => {
    (auth as any).mockResolvedValue(mockSession);
    (requireWorkspacePermission as any).mockResolvedValue(true);
    (prisma.socialAccount.findUnique as any).mockResolvedValue({ id: "acc1" });
    (getValidAccessToken as any).mockRejectedValue(new Error("Token failed"));
    const req = createRequest(mockBody);
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should initiate upload successfully", async () => {
    (auth as any).mockResolvedValue(mockSession);
    (requireWorkspacePermission as any).mockResolvedValue(true);
    (prisma.socialAccount.findUnique as any).mockResolvedValue({ id: "acc1" });
    (getValidAccessToken as any).mockResolvedValue({ accessToken: "token123" });

    const mockInitiate = vi.fn().mockResolvedValue({
      uploadUrl: "https://upload.url",
      sessionId: "sess123",
    });
    (YouTubeResumableUploader as any).mockImplementation(function() {
      return { initiate: mockInitiate };
    });

    const req = createRequest(mockBody);
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({
      uploadUrl: "https://upload.url",
      sessionId: "sess123",
      expiresAt: expect.any(String),
    });
    expect(mockInitiate).toHaveBeenCalledWith(
      "token123",
      expect.objectContaining({
        title: "Test Video",
        file: { size: 1024 },
      }),
    );
  });

  it("should handle upload initiation failure", async () => {
    (auth as any).mockResolvedValue(mockSession);
    (requireWorkspacePermission as any).mockResolvedValue(true);
    (prisma.socialAccount.findUnique as any).mockResolvedValue({ id: "acc1" });
    (getValidAccessToken as any).mockResolvedValue({ accessToken: "token123" });

    const mockInitiate = vi.fn().mockRejectedValue(new Error("Upload failed"));
    (YouTubeResumableUploader as any).mockImplementation(function() {
      return { initiate: mockInitiate };
    });

    const req = createRequest(mockBody);
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
