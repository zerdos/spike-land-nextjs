/**
 * Tests for Engagement Fetcher Factory
 * Issue: #567 (ORB-063)
 */

import { describe, expect, it } from "vitest";
import { EngagementFetcherFactory } from "./engagement-fetcher-factory";
import { FacebookEngagementFetcher } from "./facebook/engagement-fetcher";
import { LinkedInEngagementFetcher } from "./linkedin/engagement-fetcher";
import { TikTokEngagementFetcher } from "./tiktok/engagement-fetcher";
import { TwitterEngagementFetcher } from "./twitter/engagement-fetcher";

describe("EngagementFetcherFactory", () => {
  it("should return FacebookEngagementFetcher for FACEBOOK platform", () => {
    const fetcher = EngagementFetcherFactory.getFetcher("FACEBOOK");
    expect(fetcher).toBeInstanceOf(FacebookEngagementFetcher);
    expect(fetcher.platform).toBe("FACEBOOK");
  });

  it("should return FacebookEngagementFetcher for INSTAGRAM platform", () => {
    const fetcher = EngagementFetcherFactory.getFetcher("INSTAGRAM");
    expect(fetcher).toBeInstanceOf(FacebookEngagementFetcher);
  });

  it("should return TwitterEngagementFetcher for TWITTER platform", () => {
    const fetcher = EngagementFetcherFactory.getFetcher("TWITTER");
    expect(fetcher).toBeInstanceOf(TwitterEngagementFetcher);
    expect(fetcher.platform).toBe("TWITTER");
  });

  it("should return LinkedInEngagementFetcher for LINKEDIN platform", () => {
    const fetcher = EngagementFetcherFactory.getFetcher("LINKEDIN");
    expect(fetcher).toBeInstanceOf(LinkedInEngagementFetcher);
    expect(fetcher.platform).toBe("LINKEDIN");
  });

  it("should return TikTokEngagementFetcher for TIKTOK platform", () => {
    const fetcher = EngagementFetcherFactory.getFetcher("TIKTOK");
    expect(fetcher).toBeInstanceOf(TikTokEngagementFetcher);
    expect(fetcher.platform).toBe("TIKTOK");
  });

  it("should throw error for unsupported platform", () => {
    expect(() => {
      // @ts-expect-error Testing invalid platform
      EngagementFetcherFactory.getFetcher("INVALID");
    }).toThrow("Unsupported platform");
  });
});
