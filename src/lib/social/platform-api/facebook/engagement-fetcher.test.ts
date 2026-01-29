/**
 * Tests for Facebook Engagement Fetcher
 * Issue: #567 (ORB-063)
 */

import { describe, expect, it } from "vitest";
import { FacebookEngagementFetcher } from "./engagement-fetcher";

describe("FacebookEngagementFetcher", () => {
  it("should have correct platform identifier", () => {
    const fetcher = new FacebookEngagementFetcher();
    expect(fetcher.platform).toBe("FACEBOOK");
  });

  it("should fetch engagement data", async () => {
    const fetcher = new FacebookEngagementFetcher();
    const data = await fetcher.fetchEngagement("test-post-id", "test-token");

    expect(data).toHaveProperty("likes");
    expect(data).toHaveProperty("comments");
    expect(data).toHaveProperty("shares");
    expect(data).toHaveProperty("impressions");
    expect(data).toHaveProperty("reach");
    expect(data).toHaveProperty("engagementRate");
    expect(typeof data.likes).toBe("number");
  });

  it("should fetch audience insights", async () => {
    const fetcher = new FacebookEngagementFetcher();
    const insights = await fetcher.fetchAudienceInsights("test-post-id", "test-token");

    expect(insights).toHaveProperty("ageRanges");
    expect(insights).toHaveProperty("genders");
    expect(insights).toHaveProperty("locations");
    expect(insights).toHaveProperty("interests");
    expect(Array.isArray(insights.interests)).toBe(true);
  });
});
