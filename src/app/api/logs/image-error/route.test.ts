import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

describe("POST /api/logs/image-error", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should log image error successfully", async () => {
    const request = new Request("http://localhost/api/logs/image-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "ENHANCED_IMAGE_LOAD_ERROR",
        versionId: "test-version-id",
        tier: "TIER_2K",
        url: "https://example.com/image.jpg",
        timestamp: "2025-01-01T00:00:00.000Z",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(console.error).toHaveBeenCalledWith(
      "[ENHANCED_IMAGE_LOAD_ERROR]",
      expect.stringContaining("test-version-id"),
    );
  });

  it("should handle invalid JSON gracefully", async () => {
    const request = new Request("http://localhost/api/logs/image-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "invalid json",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Failed to log error");
  });
});
