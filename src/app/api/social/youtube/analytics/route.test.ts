
import { GET } from "./route";
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

const mockGetWatchTime = vi.fn();

vi.mock("@/lib/social/youtube/analytics-client", () => {
  return {
    YouTubeAnalyticsClient: class {
      getWatchTime = mockGetWatchTime;
    }
  };
});

import { auth } from "@/auth";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import { safeDecryptToken } from "@/lib/crypto/token-encryption";

describe("GET /api/social/youtube/analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).mockResolvedValue({ user: { id: "user1" } });
    (requireWorkspacePermission as any).mockResolvedValue({ role: "ADMIN" });
    (safeDecryptToken as any).mockReturnValue("decrypted_token");
    (prisma.socialAccount.findUnique as any).mockResolvedValue({
      workspaceId: "ws1",
      status: "ACTIVE",
      accessTokenEncrypted: "encrypted",
      accountId: "channel1"
    });
  });

  it("should return watch time analytics", async () => {
    mockGetWatchTime.mockResolvedValue({ views: 100 });

    const req = new NextRequest(
        "http://localhost?accountId=acc1&type=watch-time&startDate=2024-01-01&endDate=2024-01-31"
    );
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.views).toBe(100);
    expect(mockGetWatchTime).toHaveBeenCalled();
  });

  it("should return 400 if type is invalid", async () => {
    const req = new NextRequest(
        "http://localhost?accountId=acc1&type=invalid&startDate=2024-01-01&endDate=2024-01-31"
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});
