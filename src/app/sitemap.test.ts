import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the blog module for deterministic testing
vi.mock("@/lib/blog/get-posts", () => ({
  getPostSlugs: vi.fn(() => ["pixel-launch-announcement", "test-post"]),
}));

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
    expect(urls).toContain("https://spike.land/apps/pixel");
    expect(urls).toContain("https://spike.land/apps/display");
    expect(urls).toContain("https://spike.land/auth/signin");
    expect(urls).toContain("https://spike.land/terms");
    expect(urls).toContain("https://spike.land/privacy");
    expect(urls).toContain("https://spike.land/cookies");
  });

  it("includes all protected pages", () => {
    const result = sitemap();
    const urls = result.map((entry) => entry.url);

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

  it("includes all storybook pages", () => {
    const result = sitemap();
    const urls = result.map((entry) => entry.url);

    expect(urls).toContain("https://spike.land/storybook");
    expect(urls).toContain("https://spike.land/storybook/brand");
    expect(urls).toContain("https://spike.land/storybook/colors");
    expect(urls).toContain("https://spike.land/storybook/typography");
    expect(urls).toContain("https://spike.land/storybook/buttons");
    expect(urls).toContain("https://spike.land/storybook/components");
    expect(urls).toContain("https://spike.land/storybook/comparison");
    expect(urls).toContain("https://spike.land/storybook/feedback");
    expect(urls).toContain("https://spike.land/storybook/loading");
    expect(urls).toContain("https://spike.land/storybook/modals");
    expect(urls).toContain("https://spike.land/storybook/accessibility");
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
    // 9 public + 5 protected + 6 admin + 11 storybook + 1 blog listing + 2 mocked blog posts = 34 total
    expect(result.length).toBe(34);
  });

  it("includes blog listing page in sitemap", () => {
    const result = sitemap();
    const blogListing = result.find(
      (entry) => entry.url === "https://spike.land/blog",
    );

    expect(blogListing).toBeDefined();
    expect(blogListing?.priority).toBe(0.8);
    expect(blogListing?.changeFrequency).toBe("weekly");
  });

  it("includes blog post pages in sitemap", () => {
    const result = sitemap();
    const urls = result.map((entry) => entry.url);

    // Check that mocked blog posts are included
    expect(urls).toContain("https://spike.land/blog/pixel-launch-announcement");
    expect(urls).toContain("https://spike.land/blog/test-post");
  });

  it("sets blog posts with correct priority", () => {
    const result = sitemap();
    const blogPost = result.find(
      (entry) => entry.url === "https://spike.land/blog/pixel-launch-announcement",
    );

    expect(blogPost).toBeDefined();
    expect(blogPost?.priority).toBe(0.7);
    expect(blogPost?.changeFrequency).toBe("weekly");
  });
});
