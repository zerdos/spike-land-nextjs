import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sitemap from "./sitemap";

describe("sitemap", () => {
  const mockDate = new Date("2024-01-15T12:00:00.000Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns an array of sitemap entries", () => {
    const result = sitemap();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("includes all public pages", () => {
    const result = sitemap();
    const urls = result.map((entry) => entry.url);

    expect(urls).toContain("https://spike.land/");
    expect(urls).toContain("https://spike.land/pricing");
    expect(urls).toContain("https://spike.land/apps");
    expect(urls).toContain("https://spike.land/apps/images");
    expect(urls).toContain("https://spike.land/apps/display");
    expect(urls).toContain("https://spike.land/auth/signin");
    expect(urls).toContain("https://spike.land/terms");
    expect(urls).toContain("https://spike.land/privacy");
    expect(urls).toContain("https://spike.land/cookies");
  });

  it("includes all protected pages", () => {
    const result = sitemap();
    const urls = result.map((entry) => entry.url);

    expect(urls).toContain("https://spike.land/pixel");
    expect(urls).toContain("https://spike.land/albums");
    expect(urls).toContain("https://spike.land/my-apps");
    expect(urls).toContain("https://spike.land/my-apps/new");
    expect(urls).toContain("https://spike.land/profile");
    expect(urls).toContain("https://spike.land/settings");
    expect(urls).toContain("https://spike.land/referrals");
  });

  it("includes all admin pages", () => {
    const result = sitemap();
    const urls = result.map((entry) => entry.url);

    expect(urls).toContain("https://spike.land/admin");
    expect(urls).toContain("https://spike.land/admin/analytics");
    expect(urls).toContain("https://spike.land/admin/tokens");
    expect(urls).toContain("https://spike.land/admin/system");
    expect(urls).toContain("https://spike.land/admin/vouchers");
    expect(urls).toContain("https://spike.land/admin/users");
  });

  it("sets home page with highest priority", () => {
    const result = sitemap();
    const homePage = result.find(
      (entry) => entry.url === "https://spike.land/",
    );

    expect(homePage).toBeDefined();
    expect(homePage?.priority).toBe(1.0);
    expect(homePage?.changeFrequency).toBe("weekly");
  });

  it("sets legal pages with lowest priority", () => {
    const result = sitemap();
    const termsPage = result.find(
      (entry) => entry.url === "https://spike.land/terms",
    );
    const privacyPage = result.find(
      (entry) => entry.url === "https://spike.land/privacy",
    );
    const cookiesPage = result.find(
      (entry) => entry.url === "https://spike.land/cookies",
    );

    expect(termsPage?.priority).toBe(0.3);
    expect(termsPage?.changeFrequency).toBe("yearly");
    expect(privacyPage?.priority).toBe(0.3);
    expect(privacyPage?.changeFrequency).toBe("yearly");
    expect(cookiesPage?.priority).toBe(0.3);
    expect(cookiesPage?.changeFrequency).toBe("yearly");
  });

  it("sets lastModified to current date for all entries", () => {
    const result = sitemap();

    result.forEach((entry) => {
      expect(entry.lastModified).toEqual(mockDate);
    });
  });

  it("has valid changeFrequency values for all entries", () => {
    const validFrequencies = [
      "always",
      "hourly",
      "daily",
      "weekly",
      "monthly",
      "yearly",
      "never",
    ];
    const result = sitemap();

    result.forEach((entry) => {
      expect(validFrequencies).toContain(entry.changeFrequency);
    });
  });

  it("has valid priority values between 0 and 1 for all entries", () => {
    const result = sitemap();

    result.forEach((entry) => {
      expect(entry.priority).toBeGreaterThanOrEqual(0);
      expect(entry.priority).toBeLessThanOrEqual(1);
    });
  });

  it("has expected total number of pages", () => {
    const result = sitemap();
    // 9 public + 7 protected + 6 admin = 22 total
    expect(result.length).toBe(22);
  });
});
