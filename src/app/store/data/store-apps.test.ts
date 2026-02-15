import { describe, it, expect } from "vitest";

import { STORE_APPS, STORE_CATEGORIES, getAppBySlug, getAppsByCategory } from "./store-apps";

describe("STORE_APPS data integrity", () => {
  it("should have exactly 4 apps", () => {
    expect(STORE_APPS).toHaveLength(4);
  });

  it("should have unique IDs", () => {
    const ids = STORE_APPS.map((app) => app.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should have unique slugs", () => {
    const slugs = STORE_APPS.map((app) => app.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("each app should have all required fields", () => {
    for (const app of STORE_APPS) {
      expect(app.id).toBeTruthy();
      expect(typeof app.id).toBe("string");
      expect(app.slug).toBeTruthy();
      expect(typeof app.slug).toBe("string");
      expect(app.name).toBeTruthy();
      expect(typeof app.name).toBe("string");
      expect(app.tagline).toBeTruthy();
      expect(typeof app.tagline).toBe("string");
      expect(app.description).toBeTruthy();
      expect(typeof app.description).toBe("string");
      expect(app.longDescription).toBeTruthy();
      expect(typeof app.longDescription).toBe("string");
    }
  });

  it("each app should have valid cardVariant", () => {
    const validVariants = ["blue", "fuchsia", "green", "purple"];
    for (const app of STORE_APPS) {
      expect(validVariants).toContain(app.cardVariant);
    }
  });

  it("each app should have valid category", () => {
    const validCategories = ["creative", "marketing", "devops"];
    for (const app of STORE_APPS) {
      expect(validCategories).toContain(app.category);
    }
  });

  it("each app should have non-empty mcpTools array", () => {
    for (const app of STORE_APPS) {
      expect(app.mcpTools.length).toBeGreaterThan(0);
    }
  });

  it("each app should have non-empty features array", () => {
    for (const app of STORE_APPS) {
      expect(app.features.length).toBeGreaterThan(0);
    }
  });

  it("each app should have price of 10", () => {
    for (const app of STORE_APPS) {
      expect(app.price).toBe(10);
    }
  });

  it("each app should have valid rating between 0 and 5", () => {
    for (const app of STORE_APPS) {
      expect(app.rating).toBeGreaterThanOrEqual(0);
      expect(app.rating).toBeLessThanOrEqual(5);
    }
  });

  it("each MCP tool should have name, category, and description", () => {
    for (const app of STORE_APPS) {
      for (const tool of app.mcpTools) {
        expect(tool.name).toBeTruthy();
        expect(typeof tool.name).toBe("string");
        expect(tool.category).toBeTruthy();
        expect(typeof tool.category).toBe("string");
        expect(tool.description).toBeTruthy();
        expect(typeof tool.description).toBe("string");
      }
    }
  });
});

describe("STORE_CATEGORIES", () => {
  it("should include 'all' category", () => {
    const allCategory = STORE_CATEGORIES.find((c) => c.id === "all");
    expect(allCategory).toBeDefined();
  });

  it("should have at least 3 categories beyond 'all'", () => {
    expect(STORE_CATEGORIES.length).toBeGreaterThanOrEqual(4);
  });
});

describe("getAppBySlug", () => {
  it("should find existing app by slug", () => {
    expect(getAppBySlug("pixel-studio")).toBeDefined();
  });

  it("should return undefined for non-existent slug", () => {
    expect(getAppBySlug("nonexistent")).toBeUndefined();
  });

  it("should return correct app", () => {
    const app = getAppBySlug("pixel-studio");
    expect(app?.slug).toBe("pixel-studio");
  });
});

describe("getAppsByCategory", () => {
  it("should return all apps for 'all' category", () => {
    expect(getAppsByCategory("all")).toHaveLength(STORE_APPS.length);
  });

  it("should filter by category", () => {
    const marketingApps = getAppsByCategory("marketing");
    for (const app of marketingApps) {
      expect(app.category).toBe("marketing");
    }
  });

  it("should return empty array for non-existent category", () => {
    expect(getAppsByCategory("nonexistent")).toHaveLength(0);
  });
});
