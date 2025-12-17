import { describe, expect, it, vi } from "vitest";
import OGImage, { alt, contentType, runtime, size } from "./opengraph-image";

// Mock ImageResponse as a class (used with 'new')
vi.mock("next/og", () => ({
  ImageResponse: class MockImageResponse {
    element: unknown;
    status = 200;
    constructor(element: unknown) {
      this.element = element;
    }
  },
}));

describe("Root OpenGraph Image", () => {
  it("should export correct metadata", () => {
    expect(runtime).toBe("edge");
    expect(alt).toBe("Spike Land - Vibe Coded Apps with Claude Code");
    expect(size).toEqual({ width: 1200, height: 630 });
    expect(contentType).toBe("image/png");
  });

  it("should generate image response", async () => {
    const response = await OGImage();
    expect(response).toBeDefined();
    expect(response).toHaveProperty("element");
  });
});
