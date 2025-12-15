/**
 * Tests for Facebook Marketing OAuth Connect Route
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock modules before importing the route
const mockGetAuthUrl = vi.fn().mockReturnValue("https://facebook.com/oauth");

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/marketing", () => ({
  FacebookMarketingClient: class MockFacebookMarketingClient {
    getAuthUrl = mockGetAuthUrl;
  },
}));

// Import after mocks are set up
const { GET } = await import("./route");
const { auth } = await import("@/auth");

describe("GET /api/marketing/facebook/connect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUrl.mockReturnValue("https://facebook.com/oauth");
    process.env.NEXTAUTH_URL = "http://localhost:3000";
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 401 when user has no id", async () => {
    vi.mocked(auth).mockResolvedValueOnce({ user: {} } as never);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should redirect to Facebook OAuth URL", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user123" },
    } as never);

    const response = await GET();

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://facebook.com/oauth");
  });

  it("should call getAuthUrl with correct parameters", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user123" },
    } as never);

    await GET();

    expect(mockGetAuthUrl).toHaveBeenCalledWith(
      "http://localhost:3000/api/marketing/facebook/callback",
      expect.any(String),
    );
  });

  it("should use VERCEL_URL when NEXTAUTH_URL not set", async () => {
    delete process.env.NEXTAUTH_URL;
    process.env.VERCEL_URL = "spike.land";

    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user123" },
    } as never);

    await GET();

    expect(mockGetAuthUrl).toHaveBeenCalledWith(
      "https://spike.land/api/marketing/facebook/callback",
      expect.any(String),
    );
  });
});
