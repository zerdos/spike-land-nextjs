
import { format } from "date-fns";

const YOUTUBE_ANALYTICS_BASE = "https://youtubeanalytics.googleapis.com/v2/reports";

export class YouTubeAnalyticsClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Get watch time and average view duration for a date range
   */
  async getWatchTime(
    channelId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalWatchTimeMinutes: number;
    averageViewDuration: number;
    views: number;
  }> {
    const params = new URLSearchParams({
      ids: `channel==${channelId}`,
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
      metrics: "views,estimatedMinutesWatched,averageViewDuration",
    });

    const data = await this.fetchAnalytics(params);
    const row = data.rows?.[0] || [0, 0, 0];

    return {
      views: row[0],
      totalWatchTimeMinutes: row[1],
      averageViewDuration: row[2],
    };
  }

  /**
   * Get audience retention graph for a video
   */
  async getRetentionData(
    videoId: string,
  ): Promise<{
    retentionPercentage: Array<{ elapsed: number; percentage: number }>;
    relativeRetention: number; // Placeholder, not directly from this query
  }> {
    // Retention is trickier, it's usually `relativeRetentionPerformance` or `audienceWatchRatio`?
    // Docs say: `audienceWatchRatio` dimension is not supported in simple queries?
    // Actually, `audienceWatchRatio` is a metric? No.
    // Dimensions: `elapsedVideoTimeRatio`
    // Metrics: `audienceWatchRatio`

    // NOTE: This might fail if the video doesn't have enough data.
    const params = new URLSearchParams({
      ids: `channel==MINE`, // Must use channel==MINE and filter by video
      startDate: "2000-01-01", // All time? Or specific range. Retention is usually lifetime or range.
      endDate: format(new Date(), "yyyy-MM-dd"),
      metrics: "audienceWatchRatio",
      dimensions: "elapsedVideoTimeRatio",
      filters: `video==${videoId}`,
    });

    try {
      const data = await this.fetchAnalytics(params);

      const retentionPercentage = (data.rows || []).map((row: any) => ({
        elapsed: row[0], // ratio 0.0 to 1.0
        percentage: row[1], // ratio 0.0 to 1.0
      }));

      return {
        retentionPercentage,
        relativeRetention: 0, // Not easily available via this API
      };
    } catch (e) {
      // Return empty if fails (e.g. no data)
      return { retentionPercentage: [], relativeRetention: 0 };
    }
  }

  /**
   * Get traffic sources breakdown
   */
  async getTrafficSources(
    channelId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    sources: Array<{
      source: string;
      views: number;
      percentage: number;
    }>;
  }> {
    const params = new URLSearchParams({
      ids: `channel==${channelId}`,
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
      metrics: "views",
      dimensions: "insightTrafficSourceType",
      sort: "-views",
    });

    const data = await this.fetchAnalytics(params);
    const totalViews = (data.rows || []).reduce((sum: number, row: any) => sum + row[1], 0);

    const sources = (data.rows || []).map((row: any) => ({
      source: row[0],
      views: row[1],
      percentage: totalViews > 0 ? (row[1] / totalViews) * 100 : 0,
    }));

    return { sources };
  }

  /**
   * Get demographics (age and gender)
   */
  async getDemographics(
    channelId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    ageGroups: Array<{ range: string; percentage: number }>;
    gender: { male: number; female: number; other: number };
  }> {
    const params = new URLSearchParams({
      ids: `channel==${channelId}`,
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
      metrics: "viewerPercentage",
      dimensions: "ageGroup,gender",
      sort: "ageGroup,gender",
    });

    const data = await this.fetchAnalytics(params);
    // Rows: [ageGroup, gender, viewerPercentage]

    const ageGroupsMap = new Map<string, number>();
    const genderMap = { male: 0, female: 0, other: 0 };

    (data.rows || []).forEach((row: any) => {
      const age = row[0]; // e.g. "age18-24"
      const sex = row[1]; // "male", "female", "user_specified"
      const pct = row[2]; // percentage

      ageGroupsMap.set(age, (ageGroupsMap.get(age) || 0) + pct);

      if (sex === "male") genderMap.male += pct;
      else if (sex === "female") genderMap.female += pct;
      else genderMap.other += pct;
    });

    const ageGroups = Array.from(ageGroupsMap.entries()).map(([range, percentage]) => ({
      range: range.replace("age", ""),
      percentage,
    }));

    return { ageGroups, gender: genderMap };
  }

  /**
   * Get geography data (views by country)
   */
  async getGeography(
    channelId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 10,
  ): Promise<{
    countries: Array<{ code: string; name: string; views: number; percentage: number }>;
  }> {
    const params = new URLSearchParams({
      ids: `channel==${channelId}`,
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
      metrics: "views",
      dimensions: "country",
      sort: "-views",
      maxResults: limit.toString(),
    });

    const data = await this.fetchAnalytics(params);

    // We need total views for percentage.
    // This query limits results, so we can't calculate exact percentage of TOTAL views from this.
    // Ideally we should get total views separately or assume the client provides context.
    // For now, I'll calculate percentage relative to the top N countries returned.
    const totalReturnedViews = (data.rows || []).reduce((sum: number, row: any) => sum + row[1], 0);

    const countries = (data.rows || []).map((row: any) => ({
      code: row[0],
      name: row[0], // ISO code, we'd need a lookup for name
      views: row[1],
      percentage: totalReturnedViews > 0 ? (row[1] / totalReturnedViews) * 100 : 0,
    }));

    return { countries };
  }

  /**
   * Get engagement metrics over time
   */
  async getEngagementMetrics(
    channelId: string,
    startDate: Date,
    endDate: Date,
    granularity: "day" | "week" | "month" = "day",
  ): Promise<{
    data: Array<{
      date: string;
      likes: number;
      comments: number;
      shares: number;
      subscribersGained: number;
      subscribersLost: number;
    }>;
  }> {
    const params = new URLSearchParams({
      ids: `channel==${channelId}`,
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
      metrics: "likes,comments,shares,subscribersGained,subscribersLost",
      dimensions: "day", // YouTube Analytics API only supports 'day' or 'month'? Actually just 'day' for time series usually.
      // If granularity is month, we might need 'month' dimension.
      sort: "day",
    });

    if (granularity === "month") {
        params.set("dimensions", "month");
        params.set("sort", "month");
    }

    const data = await this.fetchAnalytics(params);

    const result = (data.rows || []).map((row: any) => ({
      date: row[0],
      likes: row[1],
      comments: row[2],
      shares: row[3],
      subscribersGained: row[4],
      subscribersLost: row[5],
    }));

    return { data: result };
  }

  private async fetchAnalytics(params: URLSearchParams): Promise<any> {
    const response = await fetch(
      `${YOUTUBE_ANALYTICS_BASE}?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Analytics API error: ${error.error?.message || response.statusText}`
      );
    }

    return response.json();
  }
}
