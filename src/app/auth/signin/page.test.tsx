import { auth } from "@/auth";
import { render, screen } from "@testing-library/react";
import { useSearchParams } from "next/navigation";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SignInPage from "./page";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
  redirect: vi.fn(),
}));

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock SignInContent component
vi.mock("./signin-content", () => ({
  SignInContent: () => (
    <div data-testid="signin-content">
      <div>Welcome to Spike Land</div>
      <div>Sign in to access your apps and create new ones</div>
      <div data-testid="auth-buttons">Auth Buttons</div>
      <a href="/">Back to home</a>
      <p>By signing in, you agree to our Terms of Service and Privacy Policy</p>
    </div>
  ),
}));

// Mock auth components
vi.mock("@/components/auth/auth-buttons", () => ({
  AuthButtons: ({ className }: { className?: string; }) => (
    <div data-testid="auth-buttons" className={className}>
      Auth Buttons
    </div>
  ),
}));

describe("SignInPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockReturnValue(null),
    } as unknown as ReadonlyURLSearchParams);
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
