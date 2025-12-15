/**
 * Tests for Facebook Marketing OAuth Callback Route
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock functions
const mockExchangeCodeForTokens = vi.fn();
const mockSetAccessToken = vi.fn();
const mockGetAccounts = vi.fn();
const mockUpsert = vi.fn();

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    marketingAccount: {
      upsert: mockUpsert,
    },
  },
}));

vi.mock("@/lib/marketing", () => ({
  FacebookMarketingClient: class MockFacebookMarketingClient {
    exchangeCodeForTokens = mockExchangeCodeForTokens;
    setAccessToken = mockSetAccessToken;
    getAccounts = mockGetAccounts;
  },
}));

// Import after mocks are set up
const { GET } = await import("./route");
const { auth } = await import("@/auth");

describe("GET /api/marketing/facebook/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExchangeCodeForTokens.mockReset();
    mockSetAccessToken.mockReset();
    mockGetAccounts.mockReset();
    mockUpsert.mockReset();
    process.env.NEXTAUTH_URL = "http://localhost:3000";
  });

  const createRequest = (params: Record<string, string>) => {
    const url = new URL("http://localhost/api/marketing/facebook/callback");
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    return new NextRequest(url);
  };

  const createValidState = (userId: string) => {
    return Buffer.from(
      JSON.stringify({
        userId,
        timestamp: Date.now(),
      }),
    ).toString("base64url");
  };

  it("should redirect to login when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);

    const request = createRequest({ code: "test_code", state: "test_state" });
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login?error=Unauthorized");
  });

  it("should redirect with error when OAuth error occurs", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user123" },
    } as never);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const request = createRequest({
      error: "access_denied",
      error_description: "User denied access",
    });
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain(
      "/admin/marketing?error=User%20denied%20access",
    );

    consoleSpy.mockRestore();
  });

  it("should redirect with error when code or state missing", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user123" },
    } as never);

    const request = createRequest({});
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain(
      "error=Invalid%20callback%20parameters",
    );
  });

  it("should redirect with error when state is invalid JSON", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user123" },
    } as never);

    const request = createRequest({
      code: "test_code",
      state: "invalid_base64_state",
    });
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain(
      "error=Invalid%20state%20parameter",
    );
  });

  it("should redirect with error when user ID mismatch", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user123" },
    } as never);

    const state = createValidState("different_user");

    const request = createRequest({
      code: "test_code",
      state,
    });
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("error=User%20mismatch");
  });

  it("should redirect with error when OAuth session expired", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user123" },
    } as never);

    const expiredState = Buffer.from(
      JSON.stringify({
        userId: "user123",
        timestamp: Date.now() - 15 * 60 * 1000, // 15 minutes ago
      }),
    ).toString("base64url");

    const request = createRequest({
      code: "test_code",
      state: expiredState,
    });
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain(
      "error=OAuth%20session%20expired",
    );
  });

  it("should redirect with error when no ad accounts found", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user123" },
    } as never);

    mockExchangeCodeForTokens.mockResolvedValueOnce({
      accessToken: "test_token",
      expiresAt: new Date(),
    });
    mockGetAccounts.mockResolvedValueOnce([]);

    const state = createValidState("user123");

    const request = createRequest({
      code: "test_code",
      state,
    });
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain(
      "error=No%20ad%20accounts%20found",
    );
  });

  it("should save accounts and redirect on success", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user123" },
    } as never);

    mockExchangeCodeForTokens.mockResolvedValueOnce({
      accessToken: "test_token",
      expiresAt: new Date(),
    });
    mockGetAccounts.mockResolvedValueOnce([
      {
        accountId: "123",
        accountName: "Test Account",
      },
    ]);
    mockUpsert.mockResolvedValueOnce({});

    const state = createValidState("user123");

    const request = createRequest({
      code: "test_code",
      state,
    });
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain(
      "success=Connected%201%20Facebook%20ad%20account",
    );
    expect(mockUpsert).toHaveBeenCalled();
  });

  it("should handle token exchange errors", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user123" },
    } as never);

    mockExchangeCodeForTokens.mockRejectedValueOnce(
      new Error("Token exchange failed"),
    );

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const state = createValidState("user123");

    const request = createRequest({
      code: "test_code",
      state,
    });
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain(
      "error=Token%20exchange%20failed",
    );

    consoleSpy.mockRestore();
  });
});
