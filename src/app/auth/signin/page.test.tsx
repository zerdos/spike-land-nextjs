import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SignInPage from "./page";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock SignInContent component
vi.mock("./signin-content", () => ({
  SignInContent: () => null,
}));

describe("SignInPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(null);
  });

  describe("Authentication Redirect", () => {
    it("should redirect to home when user is already authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "test-user-id",
          email: "test@example.com",
          name: "Test User",
          role: "USER" as const,
        },
        expires: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      });

      await SignInPage();

      expect(redirect).toHaveBeenCalledWith("/");
    });

    it("should render sign in content when user is not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const result = await SignInPage();

      expect(redirect).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });
});
