import { render, screen } from "@testing-library/react";
import { useSearchParams } from "next/navigation";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignInContent } from "./signin-content";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
}));

// Mock auth components
vi.mock("@/components/auth/auth-buttons", () => ({
  AuthButtons: ({ className }: { className?: string; }) => (
    <div data-testid="auth-buttons" className={className}>
      Auth Buttons
    </div>
  ),
}));

// Mock PixelLogo component
vi.mock("@/components/brand/PixelLogo", () => ({
  PixelLogo: ({ size, variant }: { size?: string; variant?: string; }) => (
    <div data-testid="pixel-logo" data-size={size} data-variant={variant}>
      Pixel Logo
    </div>
  ),
}));

describe("SignInContent", () => {
  beforeEach(() => {
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockReturnValue(null),
    } as unknown as ReadonlyURLSearchParams);
  });

  describe("Page Structure", () => {
    it("should render the sign in page with Pixel branding", () => {
      render(<SignInContent />);
      expect(screen.getByText("Restore photos in minutes")).toBeInTheDocument();
    });

    it("should display the page description", () => {
      render(<SignInContent />);
      expect(
        screen.getByText("Enter your email to sign in or create an account."),
      ).toBeInTheDocument();
    });

    it("should render PixelLogo component", () => {
      render(<SignInContent />);
      const logo = screen.getByTestId("pixel-logo");
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute("data-size", "lg");
      expect(logo).toHaveAttribute("data-variant", "horizontal");
    });

    it("should render AuthButtons component", () => {
      render(<SignInContent />);
      expect(screen.getByTestId("auth-buttons")).toBeInTheDocument();
    });

    it("should have Terms of Service link", () => {
      render(<SignInContent />);
      const termsLink = screen.getByRole("link", { name: /terms/i });
      expect(termsLink).toBeInTheDocument();
      expect(termsLink).toHaveAttribute("href", "/terms");
    });

    it("should have Privacy Policy link", () => {
      render(<SignInContent />);
      const privacyLink = screen.getByRole("link", { name: /privacy/i });
      expect(privacyLink).toBeInTheDocument();
      expect(privacyLink).toHaveAttribute("href", "/privacy");
    });
  });

  describe("Error Handling", () => {
    it("should not display error alert when no error param", () => {
      render(<SignInContent />);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("should display OAuthSignin error message", () => {
      vi.mocked(useSearchParams).mockReturnValue({
        get: vi.fn((param) => param === "error" ? "OAuthSignin" : null),
      } as unknown as ReadonlyURLSearchParams);

      render(<SignInContent />);
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(
        screen.getByText("Error starting OAuth sign in"),
      ).toBeInTheDocument();
    });

    it("should display OAuthCallback error message", () => {
      vi.mocked(useSearchParams).mockReturnValue({
        get: vi.fn((param) => param === "error" ? "OAuthCallback" : null),
      } as unknown as ReadonlyURLSearchParams);

      render(<SignInContent />);
      expect(
        screen.getByText("Error during OAuth callback"),
      ).toBeInTheDocument();
    });

    it("should display OAuthCreateAccount error message", () => {
      vi.mocked(useSearchParams).mockReturnValue({
        get: vi.fn((param) => param === "error" ? "OAuthCreateAccount" : null),
      } as unknown as ReadonlyURLSearchParams);

      render(<SignInContent />);
      expect(
        screen.getByText("Could not create OAuth account"),
      ).toBeInTheDocument();
    });

    it("should display EmailCreateAccount error message", () => {
      vi.mocked(useSearchParams).mockReturnValue({
        get: vi.fn((param) => param === "error" ? "EmailCreateAccount" : null),
      } as unknown as ReadonlyURLSearchParams);

      render(<SignInContent />);
      expect(
        screen.getByText("Could not create email account"),
      ).toBeInTheDocument();
    });

    it("should display Callback error message", () => {
      vi.mocked(useSearchParams).mockReturnValue({
        get: vi.fn((param) => param === "error" ? "Callback" : null),
      } as unknown as ReadonlyURLSearchParams);

      render(<SignInContent />);
      expect(screen.getByText("Error in callback handler")).toBeInTheDocument();
    });

    it("should display OAuthAccountNotLinked error message", () => {
      vi.mocked(useSearchParams).mockReturnValue({
        get: vi.fn((param) => param === "error" ? "OAuthAccountNotLinked" : null),
      } as unknown as ReadonlyURLSearchParams);

      render(<SignInContent />);
      expect(
        screen.getByText("This account is already linked to another user"),
      ).toBeInTheDocument();
    });

    it("should display EmailSignin error message", () => {
      vi.mocked(useSearchParams).mockReturnValue({
        get: vi.fn((param) => param === "error" ? "EmailSignin" : null),
      } as unknown as ReadonlyURLSearchParams);

      render(<SignInContent />);
      expect(
        screen.getByText("Check your email for a sign in link"),
      ).toBeInTheDocument();
    });

    it("should display CredentialsSignin error message", () => {
      vi.mocked(useSearchParams).mockReturnValue({
        get: vi.fn((param) => param === "error" ? "CredentialsSignin" : null),
      } as unknown as ReadonlyURLSearchParams);

      render(<SignInContent />);
      expect(
        screen.getByText("Sign in failed. Check your credentials"),
      ).toBeInTheDocument();
    });

    it("should display SessionRequired error message", () => {
      vi.mocked(useSearchParams).mockReturnValue({
        get: vi.fn((param) => param === "error" ? "SessionRequired" : null),
      } as unknown as ReadonlyURLSearchParams);

      render(<SignInContent />);
      expect(
        screen.getByText("Please sign in to access this page"),
      ).toBeInTheDocument();
    });

    it("should display default error message for unknown errors", () => {
      vi.mocked(useSearchParams).mockReturnValue({
        get: vi.fn((param) => param === "error" ? "UnknownError" : null),
      } as unknown as ReadonlyURLSearchParams);

      render(<SignInContent />);
      expect(
        screen.getByText("An error occurred during sign in"),
      ).toBeInTheDocument();
    });
  });

  describe("Callback URL", () => {
    it("should handle callbackUrl parameter", () => {
      vi.mocked(useSearchParams).mockReturnValue({
        get: vi.fn((param) => param === "callbackUrl" ? "/my-apps" : null),
      } as unknown as ReadonlyURLSearchParams);

      render(<SignInContent />);
      // Component renders without errors when callbackUrl is present
      expect(screen.getByText("Restore photos in minutes")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading hierarchy", () => {
      render(<SignInContent />);
      const title = screen.getByText("Restore photos in minutes", {
        selector: ".text-3xl",
      });
      expect(title).toBeInTheDocument();
      expect(title).toHaveClass("text-3xl");
    });

    it("should have descriptive link text for Terms", () => {
      render(<SignInContent />);
      const termsLink = screen.getByRole("link", { name: /terms/i });
      expect(termsLink).toHaveAccessibleName();
    });

    it("should have descriptive link text for Privacy", () => {
      render(<SignInContent />);
      const privacyLink = screen.getByRole("link", { name: /privacy/i });
      expect(privacyLink).toHaveAccessibleName();
    });
  });
});
