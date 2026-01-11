import { describe, expect, it } from "vitest";
import { getCompetitorSocialData } from "./competitor-tracking";

describe("getCompetitorSocialData", () => {
  it("should return mock social media data for a given username", async () => {
    const username = "testuser";
    const data = await getCompetitorSocialData(username);

    expect(data.username).toBe(username);
    expect(typeof data.posts).toBe("number");
    expect(typeof data.followers).toBe("number");
    expect(typeof data.engagementRate).toBe("string");
  });
});
