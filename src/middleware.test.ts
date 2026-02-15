import { describe, it, expect } from "vitest";
import { shouldRewriteToGenerate } from "./proxy";

describe("shouldRewriteToGenerate", () => {
  it("does not rewrite root path", () => {
    expect(shouldRewriteToGenerate("/")).toBe(false);
  });

  it("does not rewrite known routes", () => {
    const knownRoutes = [
      "/about",
      "/admin/dashboard",
      "/api/auth",
      "/create/test",
      "/my-apps",
    ];
    for (const route of knownRoutes) {
      expect(shouldRewriteToGenerate(route)).toBe(false);
    }
  });

  it("does not rewrite /g/ routes", () => {
    expect(shouldRewriteToGenerate("/g/cooking/thai-curry")).toBe(false);
  });

  it("rewrites unknown routes", () => {
    expect(shouldRewriteToGenerate("/cooking/thai-curry")).toBe(true);
    expect(shouldRewriteToGenerate("/random-app")).toBe(true);
    expect(shouldRewriteToGenerate("/some/nested/path")).toBe(true);
  });

  it("does not rewrite static files", () => {
    expect(shouldRewriteToGenerate("/favicon.ico")).toBe(false);
    expect(shouldRewriteToGenerate("/image.png")).toBe(false);
  });
});
