import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getMcpBaseUrl } from "./get-base-url";

describe("getMcpBaseUrl", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns NEXT_PUBLIC_APP_URL when set", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://custom.example.com";
    expect(getMcpBaseUrl()).toBe("https://custom.example.com");
  });

  it("returns spike.land when VERCEL_ENV is production", () => {
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL_URL = "spike-land-abc123.vercel.app";
    expect(getMcpBaseUrl()).toBe("https://spike.land");
  });

  it("returns VERCEL_URL for non-production Vercel environments", () => {
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_URL = "spike-land-abc123.vercel.app";
    expect(getMcpBaseUrl()).toBe("https://spike-land-abc123.vercel.app");
  });

  it("returns spike.land as default fallback", () => {
    expect(getMcpBaseUrl()).toBe("https://spike.land");
  });

  it("prioritizes NEXT_PUBLIC_APP_URL over VERCEL_ENV production", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://override.example.com";
    process.env.VERCEL_ENV = "production";
    expect(getMcpBaseUrl()).toBe("https://override.example.com");
  });
});
