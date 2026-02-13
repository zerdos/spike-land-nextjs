import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getMcpBaseUrl } from "./get-base-url";

describe("getMcpBaseUrl", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.VERCEL_ENV;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns spike.land when VERCEL_ENV is production", () => {
    process.env.VERCEL_ENV = "production";
    expect(getMcpBaseUrl()).toBe("https://spike.land");
  });

  it("production takes priority over NEXT_PUBLIC_APP_URL", () => {
    process.env.VERCEL_ENV = "production";
    process.env.NEXT_PUBLIC_APP_URL = "https://preview-abc.vercel.app";
    expect(getMcpBaseUrl()).toBe("https://spike.land");
  });

  it("production takes priority over VERCEL_URL", () => {
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL_URL = "preview-abc.vercel.app";
    expect(getMcpBaseUrl()).toBe("https://spike.land");
  });

  it("returns NEXT_PUBLIC_APP_URL when not production", () => {
    process.env.VERCEL_ENV = "preview";
    process.env.NEXT_PUBLIC_APP_URL = "https://preview-abc.vercel.app";
    expect(getMcpBaseUrl()).toBe("https://preview-abc.vercel.app");
  });

  it("returns VERCEL_URL with https when NEXT_PUBLIC_APP_URL is not set", () => {
    process.env.VERCEL_URL = "my-app-xyz.vercel.app";
    expect(getMcpBaseUrl()).toBe("https://my-app-xyz.vercel.app");
  });

  it("falls back to localhost:3000 when no env vars are set", () => {
    expect(getMcpBaseUrl()).toBe("http://localhost:3000");
  });

  it("NEXT_PUBLIC_APP_URL takes priority over VERCEL_URL in non-production", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://custom.example.com";
    process.env.VERCEL_URL = "fallback.vercel.app";
    expect(getMcpBaseUrl()).toBe("https://custom.example.com");
  });
});
