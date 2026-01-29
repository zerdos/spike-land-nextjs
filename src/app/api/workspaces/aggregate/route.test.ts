import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/workspace/aggregate-queries", () => ({
  getUserWorkspaceIds: vi.fn(),
  getAggregateKPIs: vi.fn(),
  getWorkspaceSummaries: vi.fn(),
}));

import { auth } from "@/auth";
import {
  getAggregateKPIs,
  getUserWorkspaceIds,
  getWorkspaceSummaries,
} from "@/lib/workspace/aggregate-queries";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

const createMockGetRequest = (searchParams = "") => {
  return new NextRequest(
    `http://localhost/api/workspaces/aggregate${searchParams ? `?${searchParams}` : ""}`,
  );
};

const createMockPostRequest = (body: Record<string, unknown>) => {
  return new NextRequest("http://localhost/api/workspaces/aggregate", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
};

describe("Aggregate Workspaces API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/workspaces/aggregate", () => {
    it("returns 401 when user is not authenticated", async () => {
      (auth as Mock).mockResolvedValue(null);

      const response = await GET(createMockGetRequest());
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns aggregate KPIs with defaults", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (getUserWorkspaceIds as Mock).mockResolvedValue(["ws_1", "ws_2"]);
      (getAggregateKPIs as Mock).mockResolvedValue({
        totalWorkspaces: 2,
        totalSocialAccounts: 5,
        totalScheduledPosts: 10,
        totalPublishedPosts: 20,
        totalEngagements: 300,
        totalFollowers: 3000,
        totalImpressions: 15000,
      });
      (getWorkspaceSummaries as Mock).mockResolvedValue([
        {
          workspaceId: "ws_1",
          workspaceName: "Workspace 1",
          socialAccountCount: 3,
        },
        {
          workspaceId: "ws_2",
          workspaceName: "Workspace 2",
          socialAccountCount: 2,
        },
      ]);

      const response = await GET(createMockGetRequest());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.kpis).toEqual({
        totalWorkspaces: 2,
        totalSocialAccounts: 5,
        totalScheduledPosts: 10,
        totalPublishedPosts: 20,
        totalEngagements: 300,
        totalFollowers: 3000,
        totalImpressions: 15000,
      });
      expect(data.workspaceSummaries).toHaveLength(2);
      expect(data.dateRange).toBeDefined();
    });

    it("respects custom date range from query params", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (getUserWorkspaceIds as Mock).mockResolvedValue(["ws_1"]);
      (getAggregateKPIs as Mock).mockResolvedValue({
        totalWorkspaces: 1,
        totalSocialAccounts: 0,
        totalScheduledPosts: 0,
        totalPublishedPosts: 0,
        totalEngagements: 0,
        totalFollowers: 0,
        totalImpressions: 0,
      });
      (getWorkspaceSummaries as Mock).mockResolvedValue([]);

      await GET(
        createMockGetRequest("startDate=2024-01-01&endDate=2024-01-31"),
      );

      expect(getAggregateKPIs).toHaveBeenCalledWith(
        ["ws_1"],
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        }),
      );
    });

    it("skips summaries when includeSummaries=false", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (getUserWorkspaceIds as Mock).mockResolvedValue(["ws_1"]);
      (getAggregateKPIs as Mock).mockResolvedValue({
        totalWorkspaces: 1,
        totalSocialAccounts: 0,
        totalScheduledPosts: 0,
        totalPublishedPosts: 0,
        totalEngagements: 0,
        totalFollowers: 0,
        totalImpressions: 0,
      });

      const response = await GET(createMockGetRequest("includeSummaries=false"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(getWorkspaceSummaries).not.toHaveBeenCalled();
      expect(data.workspaceSummaries).toEqual([]);
    });

    it("returns 500 when getUserWorkspaceIds fails", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (getUserWorkspaceIds as Mock).mockRejectedValue(new Error("DB error"));

      const consoleError = vi.spyOn(console, "error").mockImplementation(
        () => {},
      );

      const response = await GET(createMockGetRequest());
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to get workspaces");

      consoleError.mockRestore();
    });

    it("returns 500 when getAggregateKPIs fails", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (getUserWorkspaceIds as Mock).mockResolvedValue(["ws_1"]);
      (getAggregateKPIs as Mock).mockRejectedValue(new Error("DB error"));
      (getWorkspaceSummaries as Mock).mockResolvedValue([]);

      const consoleError = vi.spyOn(console, "error").mockImplementation(
        () => {},
      );

      const response = await GET(createMockGetRequest());
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to aggregate KPIs");

      consoleError.mockRestore();
    });
  });

  describe("POST /api/workspaces/aggregate", () => {
    it("returns 401 when user is not authenticated", async () => {
      (auth as Mock).mockResolvedValue(null);

      const response = await POST(createMockPostRequest({}));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 400 for invalid JSON body", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });

      const request = new NextRequest("http://localhost/api/workspaces/aggregate", {
        method: "POST",
        body: "invalid json",
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid JSON body");
    });

    it("filters workspaceIds to accessible ones", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (getUserWorkspaceIds as Mock).mockResolvedValue(["ws_1", "ws_2"]);
      (getAggregateKPIs as Mock).mockResolvedValue({
        totalWorkspaces: 1,
        totalSocialAccounts: 0,
        totalScheduledPosts: 0,
        totalPublishedPosts: 0,
        totalEngagements: 0,
        totalFollowers: 0,
        totalImpressions: 0,
      });
      (getWorkspaceSummaries as Mock).mockResolvedValue([]);

      // Request includes ws_3 which user doesn't have access to
      await POST(
        createMockPostRequest({
          workspaceIds: ["ws_1", "ws_3"],
        }),
      );

      // Should only include ws_1 (not ws_3)
      expect(getAggregateKPIs).toHaveBeenCalledWith(
        ["ws_1"],
        expect.any(Object),
      );
    });

    it("accepts custom date range in body", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (getUserWorkspaceIds as Mock).mockResolvedValue(["ws_1"]);
      (getAggregateKPIs as Mock).mockResolvedValue({
        totalWorkspaces: 1,
        totalSocialAccounts: 0,
        totalScheduledPosts: 0,
        totalPublishedPosts: 0,
        totalEngagements: 0,
        totalFollowers: 0,
        totalImpressions: 0,
      });
      (getWorkspaceSummaries as Mock).mockResolvedValue([]);

      const response = await POST(
        createMockPostRequest({
          dateRange: {
            startDate: "2024-01-01",
            endDate: "2024-01-31",
          },
        }),
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(getAggregateKPIs).toHaveBeenCalledWith(
        ["ws_1"],
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        }),
      );
      expect(data.filteredWorkspaceCount).toBe(1);
      expect(data.totalAccessibleWorkspaces).toBe(1);
    });

    it("uses all workspaces when no workspaceIds specified", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (getUserWorkspaceIds as Mock).mockResolvedValue(["ws_1", "ws_2", "ws_3"]);
      (getAggregateKPIs as Mock).mockResolvedValue({
        totalWorkspaces: 3,
        totalSocialAccounts: 0,
        totalScheduledPosts: 0,
        totalPublishedPosts: 0,
        totalEngagements: 0,
        totalFollowers: 0,
        totalImpressions: 0,
      });
      (getWorkspaceSummaries as Mock).mockResolvedValue([]);

      await POST(createMockPostRequest({}));

      expect(getAggregateKPIs).toHaveBeenCalledWith(
        ["ws_1", "ws_2", "ws_3"],
        expect.any(Object),
      );
    });

    it("skips summaries when includeSummaries is false", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (getUserWorkspaceIds as Mock).mockResolvedValue(["ws_1"]);
      (getAggregateKPIs as Mock).mockResolvedValue({
        totalWorkspaces: 1,
        totalSocialAccounts: 0,
        totalScheduledPosts: 0,
        totalPublishedPosts: 0,
        totalEngagements: 0,
        totalFollowers: 0,
        totalImpressions: 0,
      });

      const response = await POST(
        createMockPostRequest({ includeSummaries: false }),
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(getWorkspaceSummaries).not.toHaveBeenCalled();
      expect(data.workspaceSummaries).toEqual([]);
    });
  });
});
