import { describe, expect, it, vi } from "vitest";
import OGImage, { alt, contentType, runtime, size } from "./opengraph-image";

// Mock ImageResponse
vi.mock("next/og", () => ({
  ImageResponse: vi.fn().mockImplementation((element) => ({
    element,
    status: 200,
  })),
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
