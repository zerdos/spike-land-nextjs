import { describe, expect, it } from "vitest";
import { FeaturedAppCard, PlatformFeatures, PlatformHeader, PlatformHero } from "./index";

describe("Platform Landing Barrel Export", () => {
  it("should export PlatformHeader component", () => {
    expect(PlatformHeader).toBeDefined();
    expect(typeof PlatformHeader).toBe("function");
  });

  it("should export PlatformHero component", () => {
    expect(PlatformHero).toBeDefined();
    expect(typeof PlatformHero).toBe("function");
  });

  it("should export FeaturedAppCard component", () => {
    expect(FeaturedAppCard).toBeDefined();
    expect(typeof FeaturedAppCard).toBe("function");
  });

  it("should export PlatformFeatures component", () => {
    expect(PlatformFeatures).toBeDefined();
    expect(typeof PlatformFeatures).toBe("function");
  });
});
