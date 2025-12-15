/**
 * Tests for Admin Marketing Campaigns API Route
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock functions
const mockAuth = vi.fn();
const mockIsAdminByUserId = vi.fn();
const mockFindMany = vi.fn();
const mockCreateMarketingClient = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/auth/admin-middleware", () => ({
  isAdminByUserId: mockIsAdminByUserId,
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    marketingAccount: {
      findMany: mockFindMany,
    },
  },
}));

vi.mock("@/lib/marketing", () => ({
  createMarketingClient: mockCreateMarketingClient,
}));

// Import route after mocks are set up
const { GET } = await import("./route");

describe("GET /api/admin/marketing/campaigns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockReset();
    mockIsAdminByUserId.mockReset();
    mockFindMany.mockReset();
    mockCreateMarketingClient.mockReset();
  });

  it("should return 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const request = new NextRequest("http://localhost/api/admin/marketing/campaigns");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 401 when user has no id", async () => {
    mockAuth.mockResolvedValueOnce({ user: {} });

    const request = new NextRequest("http://localhost/api/admin/marketing/campaigns");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 when user is not admin", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "user123" },
    });
    mockIsAdminByUserId.mockResolvedValueOnce(false);

    const request = new NextRequest("http://localhost/api/admin/marketing/campaigns");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("should return empty campaigns when no accounts connected", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "admin123" },
    });
    mockIsAdminByUserId.mockResolvedValueOnce(true);
    mockFindMany.mockResolvedValueOnce([]);

    const request = new NextRequest("http://localhost/api/admin/marketing/campaigns");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.campaigns).toEqual([]);
    expect(data.message).toBe("No connected accounts found");
  });

  it("should fetch campaigns from connected accounts", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "admin123" },
    });
    mockIsAdminByUserId.mockResolvedValueOnce(true);

    const mockAccounts = [
      {
        id: "acc1",
        platform: "FACEBOOK",
        accountId: "123",
        accessToken: "fb_token",
        isActive: true,
      },
    ];

    mockFindMany.mockResolvedValueOnce(mockAccounts);

    const mockCampaigns = [
      {
        id: "campaign1",
        platform: "FACEBOOK",
        accountId: "123",
        name: "Test Campaign",
        status: "ACTIVE",
        objective: "AWARENESS",
        budgetType: "DAILY",
        budgetAmount: 1000,
        budgetCurrency: "USD",
        startDate: null,
        endDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        rawData: {},
      },
    ];

    const mockClient = {
      listCampaigns: vi.fn().mockResolvedValueOnce(mockCampaigns),
    };

    mockCreateMarketingClient.mockReturnValueOnce(mockClient);

    const request = new NextRequest("http://localhost/api/admin/marketing/campaigns");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.campaigns).toHaveLength(1);
    expect(data.campaigns[0].name).toBe("Test Campaign");
  });

  it("should filter by platform", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "admin123" },
    });
    mockIsAdminByUserId.mockResolvedValueOnce(true);
    mockFindMany.mockResolvedValueOnce([]);

    const request = new NextRequest(
      "http://localhost/api/admin/marketing/campaigns?platform=FACEBOOK",
    );
    await GET(request);

    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        userId: "admin123",
        isActive: true,
        platform: "FACEBOOK",
      },
    });
  });

  it("should filter by accountId", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "admin123" },
    });
    mockIsAdminByUserId.mockResolvedValueOnce(true);
    mockFindMany.mockResolvedValueOnce([]);

    const request = new NextRequest(
      "http://localhost/api/admin/marketing/campaigns?accountId=123",
    );
    await GET(request);

    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        userId: "admin123",
        isActive: true,
        accountId: "123",
      },
    });
  });

  it("should handle campaign fetch errors gracefully", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "admin123" },
    });
    mockIsAdminByUserId.mockResolvedValueOnce(true);

    const mockAccounts = [
      {
        id: "acc1",
        platform: "FACEBOOK",
        accountId: "123",
        accessToken: "fb_token",
        isActive: true,
      },
    ];

    mockFindMany.mockResolvedValueOnce(mockAccounts);

    const mockClient = {
      listCampaigns: vi.fn().mockRejectedValueOnce(new Error("API Error")),
    };

    mockCreateMarketingClient.mockReturnValueOnce(mockClient);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const request = new NextRequest("http://localhost/api/admin/marketing/campaigns");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.campaigns).toEqual([]);
    expect(data.errors).toHaveLength(1);
    // Error messages are sanitized - don't expose internal details to client
    expect(data.errors[0].error).toBe("Failed to fetch campaigns for this account");

    consoleSpy.mockRestore();
  });

  it("should set customerId for Google Ads accounts", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "admin123" },
    });
    mockIsAdminByUserId.mockResolvedValueOnce(true);

    const mockAccounts = [
      {
        id: "acc1",
        platform: "GOOGLE_ADS",
        accountId: "456",
        accessToken: "google_token",
        isActive: true,
      },
    ];

    mockFindMany.mockResolvedValueOnce(mockAccounts);

    const setCustomerIdMock = vi.fn();
    const mockClient = {
      setCustomerId: setCustomerIdMock,
      listCampaigns: vi.fn().mockResolvedValueOnce([]),
    };

    mockCreateMarketingClient.mockReturnValueOnce(mockClient);

    const request = new NextRequest("http://localhost/api/admin/marketing/campaigns");
    await GET(request);

    expect(setCustomerIdMock).toHaveBeenCalledWith("456");
  });

  it("should sort campaigns by name", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "admin123" },
    });
    mockIsAdminByUserId.mockResolvedValueOnce(true);

    const mockAccounts = [
      {
        id: "acc1",
        platform: "FACEBOOK",
        accountId: "123",
        accessToken: "fb_token",
        isActive: true,
      },
    ];

    mockFindMany.mockResolvedValueOnce(mockAccounts);

    const mockCampaigns = [
      { id: "1", name: "Zebra Campaign", platform: "FACEBOOK" },
      { id: "2", name: "Apple Campaign", platform: "FACEBOOK" },
      { id: "3", name: "Banana Campaign", platform: "FACEBOOK" },
    ];

    const mockClient = {
      listCampaigns: vi.fn().mockResolvedValueOnce(mockCampaigns),
    };

    mockCreateMarketingClient.mockReturnValueOnce(mockClient);

    const request = new NextRequest("http://localhost/api/admin/marketing/campaigns");
    const response = await GET(request);
    const data = await response.json();

    expect(data.campaigns[0].name).toBe("Apple Campaign");
    expect(data.campaigns[1].name).toBe("Banana Campaign");
    expect(data.campaigns[2].name).toBe("Zebra Campaign");
  });

  it("should return 500 on database error", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "admin123" },
    });
    mockIsAdminByUserId.mockResolvedValueOnce(true);
    mockFindMany.mockRejectedValueOnce(new Error("Database error"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const request = new NextRequest("http://localhost/api/admin/marketing/campaigns");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch campaigns");

    consoleSpy.mockRestore();
  });
});
