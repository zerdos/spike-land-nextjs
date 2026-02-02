import { auth } from "@/auth";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import { getValidAccessToken } from "@/lib/social/token-refresh";
import { pollVideoProcessingStatus } from "@/lib/social/youtube/video-processor";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

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

vi.mock("@/lib/social/clients/youtube", () => ({
  YouTubeClient: vi.fn(),
}));

vi.mock("@/lib/social/youtube/video-processor", () => ({
  pollVideoProcessingStatus: vi.fn(),
}));

describe("YouTube Status Route", () => {
  const mockSession = { user: { id: "user1" } };
  const mockParams = { sessionId: "sess123" };
  const mockProps = { params: Promise.resolve(mockParams) };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (searchParams: string) => {
    return new NextRequest(
      `http://localhost:3000/api/social/youtube/upload/${mockParams.sessionId}?${searchParams}`,
    );
  };

  it("should check processing status successfully", async () => {
    (auth as any).mockResolvedValue(mockSession);
    (requireWorkspacePermission as any).mockResolvedValue(true);
    (prisma.socialAccount.findUnique as any).mockResolvedValue({ id: "acc1" });
    (getValidAccessToken as any).mockResolvedValue({ accessToken: "token123" });
    (pollVideoProcessingStatus as any).mockResolvedValue({
      status: "processed",
      processingDetails: { status: "succeeded" },
    });

    const req = createRequest("workspaceId=ws1&accountId=acc1&videoId=vid123");
    const res = await GET(req, mockProps);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({
      status: "processed",
      processingDetails: { status: "succeeded" },
    });
  });

  it("should handle polling errors gracefully", async () => {
    (auth as any).mockResolvedValue(mockSession);
    (requireWorkspacePermission as any).mockResolvedValue(true);
    (prisma.socialAccount.findUnique as any).mockResolvedValue({ id: "acc1" });
    (getValidAccessToken as any).mockResolvedValue({ accessToken: "token123" });
    (pollVideoProcessingStatus as any).mockRejectedValue(new Error("API Error"));

    const req = createRequest("workspaceId=ws1&accountId=acc1&videoId=vid123");
    const res = await GET(req, mockProps);

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Failed to check processing status");
  });

  it("should return 400 if required params missing", async () => {
    (auth as any).mockResolvedValue(mockSession);
    const req = createRequest("workspaceId=ws1"); // Missing accountId
    const res = await GET(req, mockProps);
    expect(res.status).toBe(400);
  });
});
