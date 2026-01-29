/**
 * Tests for copy variant generation API route
 * Resolves #551
 */

import { describe, it, expect, vi } from "vitest";
import { POST } from "./route";

// Mock the variant generator
vi.mock("@/lib/variant-generator", () => ({
  generateCopyVariants: vi.fn().mockResolvedValue([
    {
      text: "Professional copy variant",
      tone: "professional",
      length: "medium",
      characterCount: 25,
      aiPrompt: "test prompt",
      aiModel: "claude-sonnet-4-5",
      variationType: "tone",
    },
  ]),
}));

describe("/api/variant-generator/copy", () => {
  it("should generate copy variants successfully", async () => {
    const request = new Request("http://localhost/api/variant-generator/copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seedContent: "Amazing product",
        workspaceId: "ws_123",
        count: 2,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("success", true);
    expect(data).toHaveProperty("variants");
    expect(Array.isArray(data.variants)).toBe(true);
  });

  it("should validate required fields", async () => {
    const request = new Request("http://localhost/api/variant-generator/copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId: "ws_123",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty("error");
  });

  it("should validate count parameter", async () => {
    const request = new Request("http://localhost/api/variant-generator/copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seedContent: "Test",
        workspaceId: "ws_123",
        count: 20,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("count must be between");
  });
});
