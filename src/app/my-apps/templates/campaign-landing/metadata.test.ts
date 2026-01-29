/**
 * Tests for Campaign Landing template metadata
 */

import { describe, expect, it } from "vitest";
import { campaignLandingMetadata } from "./metadata";

describe("Campaign Landing Template Metadata", () => {
  it("should have correct id", () => {
    expect(campaignLandingMetadata.id).toBe("campaign-landing");
  });

  it("should have a descriptive name", () => {
    expect(campaignLandingMetadata.name).toBe("Campaign Landing Page");
  });

  it("should have a description", () => {
    expect(campaignLandingMetadata.description).toBeTruthy();
    expect(campaignLandingMetadata.description.length).toBeGreaterThan(20);
  });

  it("should have correct purpose", () => {
    expect(campaignLandingMetadata.purpose).toBe("campaign-landing");
  });

  it("should have relevant tags", () => {
    expect(Array.isArray(campaignLandingMetadata.tags)).toBe(true);
    expect(campaignLandingMetadata.tags.length).toBeGreaterThan(0);
    expect(campaignLandingMetadata.tags).toContain("marketing");
  });
});
