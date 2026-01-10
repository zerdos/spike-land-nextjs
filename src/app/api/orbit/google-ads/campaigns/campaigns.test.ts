
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { prisma } from "@/lib/prisma";
import { GoogleAdsClient } from "@/lib/marketing/google-ads-client";
import { safeDecryptToken, safeEncryptToken } from "@/lib/crypto/token-encryption";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    marketingAccount: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    googleAdsCampaign: {
      upsert: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}));

vi.mock("@/lib/marketing/google-ads-client");
vi.mock("@/lib/crypto/token-encryption");

describe("POST /api/orbit/google-ads/campaigns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    const { auth } = await import("@/auth");
    (auth as vi.Mock).mockResolvedValue(null);

    const req = new Request("http://localhost/api/orbit/google-ads/campaigns", {
      method: "POST",
      body: JSON.stringify({ marketingAccountId: "test" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should return 404 if marketing account is not found", async () => {
    const { auth } = await import("@/auth");
    (auth as vi.Mock).mockResolvedValue({ user: { id: "user-123" } });
    (prisma.marketingAccount.findFirst as vi.Mock).mockResolvedValue(null);

    const req = new Request("http://localhost/api/orbit/google-ads/campaigns", {
      method: "POST",
      body: JSON.stringify({ marketingAccountId: "not-found" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("should fetch and save campaigns successfully", async () => {
    const { auth } = await import("@/auth");
    (auth as vi.Mock).mockResolvedValue({ user: { id: "user-123" } });

    const mockMarketingAccount = {
      id: "marketing-account-123",
      userId: "user-123",
      platform: "GOOGLE_ADS",
      accountId: "customer-123",
      accessToken: "encrypted-access-token",
      refreshToken: "encrypted-refresh-token",
      expiresAt: new Date(Date.now() + 3600 * 1000), // Expires in 1 hour
    };

    (prisma.marketingAccount.findFirst as vi.Mock).mockResolvedValue(mockMarketingAccount);
    (safeDecryptToken as vi.Mock).mockImplementation((token) => token.replace("encrypted-", ""));
    (safeEncryptToken as vi.Mock).mockImplementation((token) => `encrypted-${token}`);

    const mockCampaigns = [
      { id: "campaign-1", name: "Campaign 1", status: "ENABLED", budgetAmount: 10000 },
      { id: "campaign-2", name: "Campaign 2", status: "PAUSED", budgetAmount: 20000 },
    ];

    const mockListCampaigns = vi.fn().mockResolvedValue(mockCampaigns);
    (GoogleAdsClient as vi.Mock).mockImplementation(() => ({
      setAccessToken: vi.fn(),
      setCustomerId: vi.fn(),
      listCampaigns: mockListCampaigns,
    }));

    (prisma.googleAdsCampaign.upsert as vi.Mock).mockResolvedValue({});

    const req = new Request("http://localhost/api/orbit/google-ads/campaigns", {
      method: "POST",
      body: JSON.stringify({ marketingAccountId: "marketing-account-123" }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.campaignCount).toBe(2);
    expect(mockListCampaigns).toHaveBeenCalledWith("customer-123");
    expect(prisma.googleAdsCampaign.upsert).toHaveBeenCalledTimes(2);
  });
});
