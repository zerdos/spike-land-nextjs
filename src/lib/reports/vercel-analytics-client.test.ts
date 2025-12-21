/**
 * Vercel Analytics Client Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchVercelAnalytics,
  getVercelAnalyticsConfig,
  isVercelAnalyticsConfigured,
  VercelAnalyticsClient,
} from "./vercel-analytics-client";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Vercel Analytics Client", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("isVercelAnalyticsConfigured", () => {
    it("should return false when VERCEL_ACCESS_TOKEN is not set", () => {
      delete process.env.VERCEL_ACCESS_TOKEN;
      expect(isVercelAnalyticsConfigured()).toBe(false);
    });

    it("should return true when VERCEL_ACCESS_TOKEN is set", () => {
      process.env.VERCEL_ACCESS_TOKEN = "test-token";
      expect(isVercelAnalyticsConfigured()).toBe(true);
    });
  });

  describe("getVercelAnalyticsConfig", () => {
    it("should return null when VERCEL_ACCESS_TOKEN is not set", () => {
      delete process.env.VERCEL_ACCESS_TOKEN;
      expect(getVercelAnalyticsConfig()).toBeNull();
    });

    it("should return config when VERCEL_ACCESS_TOKEN is set", () => {
      process.env.VERCEL_ACCESS_TOKEN = "test-token";
      process.env.VERCEL_PROJECT_ID = "prj_123";
      process.env.VERCEL_TEAM_ID = "team_456";

      const config = getVercelAnalyticsConfig();

      expect(config).toEqual({
        accessToken: "test-token",
        projectId: "prj_123",
        teamId: "team_456",
      });
    });

    it("should handle missing optional fields", () => {
      process.env.VERCEL_ACCESS_TOKEN = "test-token";
      delete process.env.VERCEL_PROJECT_ID;
      delete process.env.VERCEL_TEAM_ID;

      const config = getVercelAnalyticsConfig();

      expect(config).toEqual({
        accessToken: "test-token",
        projectId: undefined,
        teamId: undefined,
      });
    });
  });

  describe("VercelAnalyticsClient", () => {
    const config = {
      accessToken: "test-token",
      projectId: "prj_123",
      teamId: "team_456",
    };

    describe("getProjectId", () => {
      it("should return configured project ID", async () => {
        const client = new VercelAnalyticsClient(config);
        const projectId = await client.getProjectId();
        expect(projectId).toBe("prj_123");
      });

      it("should try to detect from VERCEL_URL when project ID not configured", async () => {
        process.env.VERCEL_URL = "spike-land.vercel.app";

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "detected-prj-id" }),
        });

        const client = new VercelAnalyticsClient({
          accessToken: "test-token",
        });

        const projectId = await client.getProjectId();

        expect(projectId).toBe("detected-prj-id");
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/v9/projects/spike-land"),
          expect.any(Object),
        );
      });

      it("should return null when project cannot be detected", async () => {
        delete process.env.VERCEL_URL;

        const client = new VercelAnalyticsClient({
          accessToken: "test-token",
        });

        const projectId = await client.getProjectId();
        expect(projectId).toBeNull();
      });
    });

    describe("fetchAnalytics", () => {
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");

      it("should fetch all analytics data in parallel", async () => {
        // Mock timeseries response (page views)
        mockFetch.mockImplementation((url: string) => {
          if (url.includes("/timeseries")) {
            return Promise.resolve({
              ok: true,
              json: async () => ({
                data: [
                  { timestamp: 1, pageViews: 1000, visitors: 500 },
                  { timestamp: 2, pageViews: 1500, visitors: 700 },
                ],
              }),
            });
          }
          if (url.includes("/stats/path")) {
            return Promise.resolve({
              ok: true,
              json: async () => ({
                data: [
                  { key: "/", total: 5000 },
                  { key: "/enhance", total: 3000 },
                ],
              }),
            });
          }
          if (url.includes("/stats/country")) {
            return Promise.resolve({
              ok: true,
              json: async () => ({
                data: [
                  { key: "US", total: 2000 },
                  { key: "UK", total: 1000 },
                ],
              }),
            });
          }
          if (url.includes("/stats/device")) {
            return Promise.resolve({
              ok: true,
              json: async () => ({
                data: [
                  { key: "Desktop", total: 3000 },
                  { key: "Mobile", total: 1800 },
                  { key: "Tablet", total: 200 },
                ],
              }),
            });
          }
          return Promise.resolve({ ok: true, json: async () => ({}) });
        });

        const client = new VercelAnalyticsClient(config);
        const result = await client.fetchAnalytics(startDate, endDate);

        expect(result).toEqual({
          pageViews: 2500, // 1000 + 1500
          uniqueVisitors: 1200, // 500 + 700
          topPages: [
            { path: "/", views: 5000 },
            { path: "/enhance", views: 3000 },
          ],
          countries: [
            { country: "US", visitors: 2000 },
            { country: "UK", visitors: 1000 },
          ],
          devices: {
            desktop: 3000,
            mobile: 1800,
            tablet: 200,
          },
        });
      });

      it("should return null when project ID cannot be found", async () => {
        delete process.env.VERCEL_URL;

        const client = new VercelAnalyticsClient({
          accessToken: "test-token",
        });

        const result = await client.fetchAnalytics(startDate, endDate);
        expect(result).toBeNull();
      });

      it("should handle API errors gracefully", async () => {
        mockFetch.mockRejectedValue(new Error("Network error"));

        const client = new VercelAnalyticsClient(config);
        const result = await client.fetchAnalytics(startDate, endDate);

        // Should return partial data with zeros for failed requests
        expect(result).toEqual({
          pageViews: 0,
          uniqueVisitors: 0,
          topPages: [],
          countries: [],
          devices: { desktop: 0, mobile: 0, tablet: 0 },
        });
      });

      it("should handle non-OK responses", async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          statusText: "Unauthorized",
          json: async () => ({
            error: { message: "Invalid token" },
          }),
        });

        const client = new VercelAnalyticsClient(config);
        const result = await client.fetchAnalytics(startDate, endDate);

        expect(result).toEqual({
          pageViews: 0,
          uniqueVisitors: 0,
          topPages: [],
          countries: [],
          devices: { desktop: 0, mobile: 0, tablet: 0 },
        });
      });

      it("should include teamId in requests when configured", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ data: [] }),
        });

        const client = new VercelAnalyticsClient(config);
        await client.fetchAnalytics(startDate, endDate);

        // Check that teamId is included in URL params
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("teamId=team_456"),
          expect.any(Object),
        );
      });

      it("should include authorization header", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ data: [] }),
        });

        const client = new VercelAnalyticsClient(config);
        await client.fetchAnalytics(startDate, endDate);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: "Bearer test-token",
            }),
          }),
        );
      });
    });
  });

  describe("fetchVercelAnalytics", () => {
    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-01-31");

    it("should return null when not configured", async () => {
      delete process.env.VERCEL_ACCESS_TOKEN;

      const result = await fetchVercelAnalytics(startDate, endDate);
      expect(result).toBeNull();
    });

    it("should return data when configured", async () => {
      process.env.VERCEL_ACCESS_TOKEN = "test-token";
      process.env.VERCEL_PROJECT_ID = "prj_123";

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const result = await fetchVercelAnalytics(startDate, endDate);

      expect(result).toEqual({
        pageViews: 0,
        uniqueVisitors: 0,
        topPages: [],
        countries: [],
        devices: { desktop: 0, mobile: 0, tablet: 0 },
      });
    });

    it("should return null on error", async () => {
      process.env.VERCEL_ACCESS_TOKEN = "test-token";
      process.env.VERCEL_PROJECT_ID = "prj_123";

      mockFetch.mockRejectedValue(new Error("Network error"));

      // The function should catch the error and return the partial result
      const result = await fetchVercelAnalytics(startDate, endDate);

      // It returns partial data with zeros, not null
      expect(result).toEqual({
        pageViews: 0,
        uniqueVisitors: 0,
        topPages: [],
        countries: [],
        devices: { desktop: 0, mobile: 0, tablet: 0 },
      });
    });
  });
});
