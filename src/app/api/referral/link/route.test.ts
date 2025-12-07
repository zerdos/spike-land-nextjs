import { auth } from "@/auth";
import { assignReferralCodeToUser } from "@/lib/referral/code-generator";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/referral/code-generator", () => ({
  assignReferralCodeToUser: vi.fn(),
}));

describe("GET /api/referral/link", () => {
  const mockRequest = {
    nextUrl: {
      origin: "http://localhost:3000",
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return referral link for authenticated user", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    vi.mocked(assignReferralCodeToUser).mockResolvedValue("ABC12345");

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      code: "ABC12345",
      url: "http://localhost:3000?ref=ABC12345",
    });
  });

  it("should use NEXT_PUBLIC_APP_URL if available", async () => {
    const originalEnv = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://spike.land";

    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    vi.mocked(assignReferralCodeToUser).mockResolvedValue("ABC12345");

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(data.url).toBe("https://spike.land?ref=ABC12345");

    process.env.NEXT_PUBLIC_APP_URL = originalEnv;
  });

  it("should return 401 if user not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 401 if session has no user ID", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: {},
    } as any);

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should handle errors gracefully", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    vi.mocked(assignReferralCodeToUser).mockRejectedValue(
      new Error("Database error"),
    );

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to generate referral link");
  });
});
