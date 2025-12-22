/**
 * Vercel Analytics API Client
 *
 * Fetches analytics data from Vercel's Web Analytics API.
 * @see https://vercel.com/docs/rest-api/endpoints/web-analytics
 */

import { tryCatch } from "@/lib/try-catch";

import type {
  VercelAnalyticsData,
  VercelCountryData,
  VercelDeviceBreakdown,
  VercelPageView,
} from "./types";

const VERCEL_API_BASE = "https://api.vercel.com";

/**
 * Vercel API response types
 */
interface VercelAnalyticsResponse {
  data: Array<{
    key: string;
    total: number;
    devices?: number;
  }>;
}

interface VercelTimeseriesResponse {
  data: Array<{
    timestamp: number;
    pageViews?: number;
    visitors?: number;
  }>;
}

/**
 * Configuration for Vercel Analytics client
 */
interface VercelAnalyticsConfig {
  accessToken: string;
  projectId?: string;
  teamId?: string;
}

/**
 * Check if Vercel Analytics is configured
 */
export function isVercelAnalyticsConfigured(): boolean {
  return !!process.env.VERCEL_ACCESS_TOKEN;
}

/**
 * Get configuration from environment
 */
export function getVercelAnalyticsConfig(): VercelAnalyticsConfig | null {
  const accessToken = process.env.VERCEL_ACCESS_TOKEN;

  if (!accessToken) {
    return null;
  }

  return {
    accessToken,
    projectId: process.env.VERCEL_PROJECT_ID,
    teamId: process.env.VERCEL_TEAM_ID,
  };
}

/**
 * Vercel Analytics API Client
 */
export class VercelAnalyticsClient {
  private accessToken: string;
  private projectId?: string;
  private teamId?: string;

  constructor(config: VercelAnalyticsConfig) {
    this.accessToken = config.accessToken;
    this.projectId = config.projectId;
    this.teamId = config.teamId;
  }

  /**
   * Make authenticated request to Vercel API
   */
  private async request<T>(
    endpoint: string,
    params: Record<string, string> = {},
  ): Promise<T> {
    const url = new URL(`${VERCEL_API_BASE}${endpoint}`);

    // Add team ID if available
    if (this.teamId) {
      url.searchParams.set("teamId", this.teamId);
    }

    // Add other params
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const { data: response, error: fetchError } = await tryCatch(
      fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
      }),
    );

    if (fetchError || !response) {
      throw new Error(
        `Vercel API Error: ${fetchError?.message || "Network error"}`,
      );
    }

    if (!response.ok) {
      const { data: errorData } = await tryCatch(response.json());
      throw new Error(
        `Vercel API Error: ${errorData?.error?.message || response.statusText}`,
      );
    }

    const { data, error: jsonError } = await tryCatch<T>(response.json());

    if (jsonError || data === null || data === undefined) {
      throw new Error(
        `Vercel API Error: ${jsonError?.message || "Invalid response"}`,
      );
    }

    return data;
  }

  /**
   * Get project ID (from config or auto-detect)
   */
  async getProjectId(): Promise<string | null> {
    if (this.projectId) {
      return this.projectId;
    }

    // Try to detect from VERCEL_URL environment variable
    const vercelUrl = process.env.VERCEL_URL;
    if (vercelUrl) {
      // Extract project name from URL (e.g., spike-land.vercel.app -> spike-land)
      const match = vercelUrl.match(/^([^.]+)\.vercel\.app$/);
      if (match) {
        // Look up project by name
        const { data, error } = await tryCatch(
          this.request<{ id: string; }>(`/v9/projects/${match[1]}`),
        );
        if (!error && data?.id) {
          return data.id;
        }
      }
    }

    return null;
  }

  /**
   * Fetch page views timeseries
   */
  private async fetchPageViews(
    projectId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const { data, error } = await tryCatch(
      this.request<VercelTimeseriesResponse>(
        `/v1/web-analytics/timeseries`,
        {
          projectId,
          from: startDate.toISOString(),
          to: endDate.toISOString(),
          environment: "production",
        },
      ),
    );

    if (error || !data) {
      console.error("Failed to fetch Vercel page views:", error);
      return 0;
    }

    return data.data.reduce((sum, item) => sum + (item.pageViews ?? 0), 0);
  }

  /**
   * Fetch unique visitors
   */
  private async fetchVisitors(
    projectId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const { data, error } = await tryCatch(
      this.request<VercelTimeseriesResponse>(
        `/v1/web-analytics/timeseries`,
        {
          projectId,
          from: startDate.toISOString(),
          to: endDate.toISOString(),
          environment: "production",
        },
      ),
    );

    if (error || !data) {
      console.error("Failed to fetch Vercel visitors:", error);
      return 0;
    }

    return data.data.reduce((sum, item) => sum + (item.visitors ?? 0), 0);
  }

  /**
   * Fetch top pages
   */
  private async fetchTopPages(
    projectId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 10,
  ): Promise<VercelPageView[]> {
    const { data, error } = await tryCatch(
      this.request<VercelAnalyticsResponse>(
        `/v1/web-analytics/stats/path`,
        {
          projectId,
          from: startDate.toISOString(),
          to: endDate.toISOString(),
          environment: "production",
          limit: limit.toString(),
        },
      ),
    );

    if (error || !data) {
      console.error("Failed to fetch Vercel top pages:", error);
      return [];
    }

    return data.data.map((item) => ({
      path: item.key,
      views: item.total,
    }));
  }

  /**
   * Fetch country breakdown
   */
  private async fetchCountries(
    projectId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 10,
  ): Promise<VercelCountryData[]> {
    const { data, error } = await tryCatch(
      this.request<VercelAnalyticsResponse>(
        `/v1/web-analytics/stats/country`,
        {
          projectId,
          from: startDate.toISOString(),
          to: endDate.toISOString(),
          environment: "production",
          limit: limit.toString(),
        },
      ),
    );

    if (error || !data) {
      console.error("Failed to fetch Vercel countries:", error);
      return [];
    }

    return data.data.map((item) => ({
      country: item.key,
      visitors: item.total,
    }));
  }

  /**
   * Fetch device breakdown
   */
  private async fetchDevices(
    projectId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<VercelDeviceBreakdown> {
    const { data, error } = await tryCatch(
      this.request<VercelAnalyticsResponse>(
        `/v1/web-analytics/stats/device`,
        {
          projectId,
          from: startDate.toISOString(),
          to: endDate.toISOString(),
          environment: "production",
        },
      ),
    );

    if (error || !data) {
      console.error("Failed to fetch Vercel devices:", error);
      return { desktop: 0, mobile: 0, tablet: 0 };
    }

    const devices: VercelDeviceBreakdown = {
      desktop: 0,
      mobile: 0,
      tablet: 0,
    };

    for (const item of data.data) {
      const key = item.key.toLowerCase();
      if (key === "desktop") {
        devices.desktop = item.total;
      } else if (key === "mobile") {
        devices.mobile = item.total;
      } else if (key === "tablet") {
        devices.tablet = item.total;
      }
    }

    return devices;
  }

  /**
   * Fetch complete analytics data
   */
  async fetchAnalytics(
    startDate: Date,
    endDate: Date,
  ): Promise<VercelAnalyticsData | null> {
    const projectId = await this.getProjectId();

    if (!projectId) {
      console.error("Vercel project ID not found");
      return null;
    }

    // Fetch all data in parallel
    const [pageViews, uniqueVisitors, topPages, countries, devices] = await Promise.all([
      this.fetchPageViews(projectId, startDate, endDate),
      this.fetchVisitors(projectId, startDate, endDate),
      this.fetchTopPages(projectId, startDate, endDate),
      this.fetchCountries(projectId, startDate, endDate),
      this.fetchDevices(projectId, startDate, endDate),
    ]);

    return {
      pageViews,
      uniqueVisitors,
      topPages,
      countries,
      devices,
    };
  }
}

/**
 * Fetch Vercel Analytics data with automatic configuration
 * Returns null if not configured or on error (graceful degradation)
 */
export async function fetchVercelAnalytics(
  startDate: Date,
  endDate: Date,
): Promise<VercelAnalyticsData | null> {
  const config = getVercelAnalyticsConfig();

  if (!config) {
    // Not configured - graceful degradation
    return null;
  }

  const client = new VercelAnalyticsClient(config);

  const { data, error } = await tryCatch(
    client.fetchAnalytics(startDate, endDate),
  );

  if (error) {
    console.error("Failed to fetch Vercel Analytics:", error);
    return null;
  }

  return data;
}
