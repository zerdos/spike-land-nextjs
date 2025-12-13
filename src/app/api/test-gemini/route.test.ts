import type { Session } from "next-auth";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/ai/gemini-client", () => ({
  analyzeImage: vi.fn(),
}));

const { auth } = await import("@/auth");
const { analyzeImage } = await import("@/lib/ai/gemini-client");

describe("POST /api/test-gemini", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/test-gemini", {
      method: "POST",
      body: JSON.stringify({
        imageData: "base64data",
        mimeType: "image/png",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
    expect(analyzeImage).not.toHaveBeenCalled();
  });

  it("should return 401 when session exists but user id is missing", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    const request = new NextRequest("http://localhost/api/test-gemini", {
      method: "POST",
      body: JSON.stringify({
        imageData: "base64data",
        mimeType: "image/png",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
    expect(analyzeImage).not.toHaveBeenCalled();
  });

  it("should return 400 when imageData is missing", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    const request = new NextRequest("http://localhost/api/test-gemini", {
      method: "POST",
      body: JSON.stringify({
        mimeType: "image/png",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "Missing imageData or mimeType" });
    expect(analyzeImage).not.toHaveBeenCalled();
  });

  it("should return 400 when mimeType is missing", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    const request = new NextRequest("http://localhost/api/test-gemini", {
      method: "POST",
      body: JSON.stringify({
        imageData: "base64data",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "Missing imageData or mimeType" });
    expect(analyzeImage).not.toHaveBeenCalled();
  });

  it("should return 400 when both imageData and mimeType are missing", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    const request = new NextRequest("http://localhost/api/test-gemini", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "Missing imageData or mimeType" });
    expect(analyzeImage).not.toHaveBeenCalled();
  });

  it("should successfully analyze image and return result", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    const mockAnalysis = {
      description: "A beautiful landscape",
      quality: "high" as const,
      suggestedImprovements: ["sharpness", "color"],
      enhancementPrompt: "Enhance this landscape image",
    };

    vi.mocked(analyzeImage).mockResolvedValue(mockAnalysis);

    const request = new NextRequest("http://localhost/api/test-gemini", {
      method: "POST",
      body: JSON.stringify({
        imageData: "base64ImageData",
        mimeType: "image/jpeg",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      analysis: mockAnalysis,
      userId: "user-123",
    });
    expect(analyzeImage).toHaveBeenCalledWith("base64ImageData", "image/jpeg");
  });

  it("should return 500 when analyzeImage throws an Error", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(analyzeImage).mockRejectedValue(new Error("Gemini API error"));

    const request = new NextRequest("http://localhost/api/test-gemini", {
      method: "POST",
      body: JSON.stringify({
        imageData: "base64data",
        mimeType: "image/png",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Gemini API error" });
  });

  it("should return 500 with 'Unknown error' when non-Error is thrown", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(analyzeImage).mockRejectedValue("Some string error");

    const request = new NextRequest("http://localhost/api/test-gemini", {
      method: "POST",
      body: JSON.stringify({
        imageData: "base64data",
        mimeType: "image/png",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Unknown error" });
  });

  it("should handle empty string imageData as missing", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    const request = new NextRequest("http://localhost/api/test-gemini", {
      method: "POST",
      body: JSON.stringify({
        imageData: "",
        mimeType: "image/png",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "Missing imageData or mimeType" });
  });

  it("should handle empty string mimeType as missing", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    const request = new NextRequest("http://localhost/api/test-gemini", {
      method: "POST",
      body: JSON.stringify({
        imageData: "base64data",
        mimeType: "",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "Missing imageData or mimeType" });
  });
});
