import { describe, expect, it } from "vitest";
import { API_ROUTES, ROUTES } from "./routes";

describe("ROUTES", () => {
  it("has correct static routes", () => {
    expect(ROUTES.home).toBe("/");
    expect(ROUTES.albums).toBe("/apps/pixel");
    expect(ROUTES.images).toBe("/apps/images");
    expect(ROUTES.login).toBe("/login");
    expect(ROUTES.signup).toBe("/signup");
    expect(ROUTES.settings).toBe("/settings");
    expect(ROUTES.pipelines).toBe("/settings/pipelines");
  });

  it("generates correct albumDetail routes", () => {
    expect(ROUTES.albumDetail("album-123")).toBe("/albums/album-123");
    expect(ROUTES.albumDetail("test-album")).toBe("/albums/test-album");
  });

  it("generates correct albumShare routes", () => {
    expect(ROUTES.albumShare("album-123", "token-456")).toBe(
      "/albums/album-123?token=token-456",
    );
  });

  it("generates correct imageDetail routes", () => {
    expect(ROUTES.imageDetail("img-123")).toBe("/apps/pixel/img-123");
  });
});

describe("API_ROUTES", () => {
  it("has correct static API routes", () => {
    expect(API_ROUTES.authSignup).toBe("/api/auth/signup");
    expect(API_ROUTES.albums).toBe("/api/albums");
    expect(API_ROUTES.imageUpload).toBe("/api/images/upload");
    expect(API_ROUTES.imageEnhance).toBe("/api/images/enhance");
    expect(API_ROUTES.userProfile).toBe("/api/user/profile");
    expect(API_ROUTES.userTokens).toBe("/api/user/tokens");
  });

  it("generates correct albumDetail API routes", () => {
    expect(API_ROUTES.albumDetail("album-123")).toBe("/api/albums/album-123");
  });

  it("generates correct albumImages API routes", () => {
    expect(API_ROUTES.albumImages("album-123")).toBe(
      "/api/albums/album-123/images",
    );
  });
});
