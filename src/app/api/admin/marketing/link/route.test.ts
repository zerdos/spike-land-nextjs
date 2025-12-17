/**
 * Campaign Linking API Tests
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock functions - declared first at module scope
const mockAuth = vi.fn();
const mockRequireAdmin = vi.fn();
const mockFindMany = vi.fn();
const mockFindUnique = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/auth/admin-middleware", () => ({
  requireAdminByUserId: mockRequireAdmin,
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    campaignLink: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
    },
  },
}));

// Import route after mocks are set up
const { GET, POST, DELETE } = await import("./route");

function createMockRequest(options: {
  method?: string;
  body?: unknown;
  searchParams?: Record<string, string>;
} = {}): NextRequest {
  const url = new URL("http://localhost:3000/api/admin/marketing/link");
  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const request = new NextRequest(url, {
    method: options.method || "GET",
  });

  // Override json() for body parsing
  if (options.body) {
    vi.spyOn(request, "json").mockResolvedValue(options.body);
  }

  return request;
}

describe("Campaign Linking API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/admin/marketing/link", () => {
    it("should return 401 if not authenticated", async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = createMockRequest();
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 if not admin", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
      mockRequireAdmin.mockRejectedValueOnce(new Error("Forbidden: Admin access required"));

      const request = createMockRequest();
      const response = await GET(request);

      expect(response.status).toBe(403);
    });

    it("should return all campaign links", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } });
      mockRequireAdmin.mockResolvedValueOnce(undefined);

      const mockLinks = [
        {
          id: "link-1",
          utmCampaign: "summer-sale",
          platform: "FACEBOOK",
          externalCampaignId: "123456",
          externalCampaignName: "Summer Sale 2024",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "link-2",
          utmCampaign: "winter-promo",
          platform: "GOOGLE_ADS",
          externalCampaignId: "789012",
          externalCampaignName: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockFindMany.mockResolvedValueOnce(mockLinks);

      const request = createMockRequest();
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.links).toHaveLength(2);
      expect(data.total).toBe(2);
    });

    it("should filter by platform", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } });
      mockRequireAdmin.mockResolvedValueOnce(undefined);
      mockFindMany.mockResolvedValueOnce([]);

      const request = createMockRequest({ searchParams: { platform: "FACEBOOK" } });
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { platform: "FACEBOOK" },
        orderBy: [{ platform: "asc" }, { utmCampaign: "asc" }],
      });
    });
  });

  describe("POST /api/admin/marketing/link", () => {
    it("should return 401 if not authenticated", async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = createMockRequest({
        method: "POST",
        body: {
          utmCampaign: "test",
          platform: "FACEBOOK",
          externalCampaignId: "123",
        },
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it("should return 400 for invalid platform", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } });
      mockRequireAdmin.mockResolvedValueOnce(undefined);

      const request = createMockRequest({
        method: "POST",
        body: {
          utmCampaign: "test",
          platform: "INVALID",
          externalCampaignId: "123",
        },
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid request body");
    });

    it("should return 400 for missing required fields", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } });
      mockRequireAdmin.mockResolvedValueOnce(undefined);

      const request = createMockRequest({
        method: "POST",
        body: {
          platform: "FACEBOOK",
        },
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should create a new campaign link", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } });
      mockRequireAdmin.mockResolvedValueOnce(undefined);
      mockFindUnique.mockResolvedValueOnce(null);

      const newLink = {
        id: "link-1",
        utmCampaign: "new-campaign",
        platform: "FACEBOOK",
        externalCampaignId: "fb-123",
        externalCampaignName: "New Campaign FB",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockCreate.mockResolvedValueOnce(newLink);

      const request = createMockRequest({
        method: "POST",
        body: {
          utmCampaign: "new-campaign",
          platform: "FACEBOOK",
          externalCampaignId: "fb-123",
          externalCampaignName: "New Campaign FB",
        },
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.created).toBe(true);
      expect(data.link.utmCampaign).toBe("new-campaign");
    });

    it("should update existing campaign link", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } });
      mockRequireAdmin.mockResolvedValueOnce(undefined);

      const existingLink = {
        id: "link-1",
        utmCampaign: "existing-campaign",
        platform: "GOOGLE_ADS",
        externalCampaignId: "old-id",
        externalCampaignName: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockFindUnique.mockResolvedValueOnce(existingLink);

      const updatedLink = {
        ...existingLink,
        externalCampaignId: "new-id",
        externalCampaignName: "Updated Name",
        updatedAt: new Date(),
      };
      mockUpdate.mockResolvedValueOnce(updatedLink);

      const request = createMockRequest({
        method: "POST",
        body: {
          utmCampaign: "existing-campaign",
          platform: "GOOGLE_ADS",
          externalCampaignId: "new-id",
          externalCampaignName: "Updated Name",
        },
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.updated).toBe(true);
      expect(data.link.externalCampaignId).toBe("new-id");
    });
  });

  describe("DELETE /api/admin/marketing/link", () => {
    it("should return 401 if not authenticated", async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = createMockRequest({
        method: "DELETE",
        body: { id: "link-1" },
      });
      const response = await DELETE(request);

      expect(response.status).toBe(401);
    });

    it("should delete by ID", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } });
      mockRequireAdmin.mockResolvedValueOnce(undefined);

      const deletedLink = {
        id: "link-1",
        utmCampaign: "deleted-campaign",
        platform: "FACEBOOK",
        externalCampaignId: "123",
        externalCampaignName: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDelete.mockResolvedValueOnce(deletedLink);

      const request = createMockRequest({
        method: "DELETE",
        body: { id: "link-1" },
      });
      const response = await DELETE(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.deleted.id).toBe("link-1");
    });

    it("should delete by composite key", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } });
      mockRequireAdmin.mockResolvedValueOnce(undefined);

      const deletedLink = {
        id: "link-2",
        utmCampaign: "campaign-x",
        platform: "GOOGLE_ADS",
        externalCampaignId: "456",
        externalCampaignName: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDelete.mockResolvedValueOnce(deletedLink);

      const request = createMockRequest({
        method: "DELETE",
        body: { utmCampaign: "campaign-x", platform: "GOOGLE_ADS" },
      });
      const response = await DELETE(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it("should return 400 if neither id nor composite key provided", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } });
      mockRequireAdmin.mockResolvedValueOnce(undefined);

      const request = createMockRequest({
        method: "DELETE",
        body: { utmCampaign: "campaign-x" }, // Missing platform
      });
      const response = await DELETE(request);

      expect(response.status).toBe(400);
    });

    it("should return 404 if link not found", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } });
      mockRequireAdmin.mockResolvedValueOnce(undefined);
      mockDelete.mockRejectedValueOnce(
        new Error("Record to delete does not exist"),
      );

      const request = createMockRequest({
        method: "DELETE",
        body: { id: "nonexistent-id" },
      });
      const response = await DELETE(request);

      expect(response.status).toBe(404);
    });
  });
});
